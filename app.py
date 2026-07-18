import os
from flask import Flask, render_template, request, jsonify, session
from utils import data_loader,analyzer, cleaner

app = Flask(__name__)
app.secret_key = "your_secret_key"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    save_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(save_path)

    try:
        df = data_loader.load_file(save_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    session["current_file"] = save_path

    return jsonify({
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "shape": list(df.shape),
        "preview": df.head().to_dict(orient="records")
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    if "current_file" not in session:
        return jsonify({"error": "No file uploaded"}), 400

    file_path = session["current_file"]

    try:
        df = data_loader.load_file(file_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    analysis_report = analyzer.flag_issues(df)

    return jsonify(analysis_report)

@app.route("/clean", methods=["POST"])
def clean():
    # 1. Ensure a file is currently loaded in the session
    if "current_file" not in session:
        return jsonify({"error": "No file uploaded"}), 400

    file_path = session["current_file"]
    
    # 2. Get operations from the frontend JSON payload
    operations = request.json
    if not operations:
        return jsonify({"error": "No operations provided"}), 400

    # 3. Load the current DataFrame
    try:
        df = data_loader.load_file(file_path)
    except Exception as e:
        return jsonify({"error": f"Failed to load file: {str(e)}"}), 400

    # 4. Clean the data using the operations dictionary
    try:
        cleaned_df = cleaner.clean_data(df, operations)
    except Exception as e:
        return jsonify({"error": f"Failed during data cleaning: {str(e)}"}), 500

    # 5. Save the cleaned DataFrame to a new file
    # Generate a unique ID to simulate a session-specific filename
    session_id = uuid.uuid4().hex
    new_filename = f"cleaned_{session_id}.csv"
    new_save_path = os.path.join(UPLOAD_FOLDER, new_filename)
    
    try:
        # Save as CSV for simplicity, regardless of original format
        cleaned_df.to_csv(new_save_path, index=False)
    except Exception as e:
        return jsonify({"error": f"Failed to save cleaned file: {str(e)}"}), 500

    # Update session to point to the new, cleaned file
    session["current_file"] = new_save_path

    # 6. Re-analyze the cleaned data
    issues = analyzer.flag_issues(cleaned_df)

    # 7. Return the updated data layout for the frontend to render
    return jsonify({
        "columns": cleaned_df.columns.tolist(),
        "preview": cleaned_df.head().to_dict(orient="records"),
        "shape": list(cleaned_df.shape),
        "issues": issues
    })


if __name__ == "__main__":
    app.run(debug=True)