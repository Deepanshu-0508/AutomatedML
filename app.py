import os
import uuid
import pandas as pd
from flask import Flask, render_template, request, jsonify, session
from utils import data_loader, analyzer, cleaner

app = Flask(__name__)
app.secret_key = "your_secret_key"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024


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

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in {".csv", ".xlsx", ".xls"}:
        return jsonify({"error": "Unsupported file type. Please upload CSV or Excel."}), 400

    safe_name = f"{uuid.uuid4().hex}{file_ext}"
    save_path = os.path.join(UPLOAD_FOLDER, safe_name)

    try:
        file.save(save_path)
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
    
    # Assuming UPLOAD_FOLDER is defined globally in your app.py
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

@app.route("/set_target", methods=["POST"])
def set_target():
    # 1. Ensure a file is loaded in session
    if "current_file" not in session:
        return jsonify({"error": "No file uploaded. Please upload a dataset first."}), 400

    # 2. Extract JSON payload
    data = request.get_json() or {}
    target = data.get("target")
    task = data.get("task")

    # 3. Validate basic payload format
    if not target or not isinstance(target, str):
        return jsonify({"error": "Target column name must be a valid non-empty string."}), 400

    if task not in ["regression", "classification"]:
        return jsonify({"error": "Task must be either 'regression' or 'classification'."}), 400

    # 4. Fast-path check: Validate column existence using cached columns in session
    cached_columns = session.get("columns")
    if cached_columns is not None and target not in cached_columns:
        return jsonify({"error": f"Column '{target}' was not found in the dataset."}), 400

    # 5. Load DataFrame to inspect dtypes and verify target suitability
    file_path = session["current_file"]
    try:
        df = data_loader.load_file(file_path)
    except Exception as e:
        return jsonify({"error": f"Failed to load dataset: {str(e)}"}), 400

    if target not in df.columns:
        return jsonify({"error": f"Column '{target}' was not found in the dataset."}), 400

    target_series = df[target]
    target_dtype = str(target_series.dtype)
    is_numeric = pd.api.types.is_numeric_dtype(target_series)

    # 6. Task vs. Dtype Validation Rules & Warnings
    warning = None

    # Regression require numeric target
    if task == "regression" and not is_numeric:
        return jsonify({
            "error": f"Target column '{target}' is non-numeric ({target_dtype}) and cannot be used for regression. Select a numeric column or switch to classification."
        }), 400

    # Classification with high-cardinality numeric columns warning
    if task == "classification" and is_numeric:
        unique_count = target_series.nunique(dropna=True)
        if unique_count > 50:
            warning = f"Target '{target}' has {unique_count} distinct numeric values. Are you sure you want classification instead of regression?"

    # 7. Store choices in session
    session["target"] = target
    session["task"] = task

    # 8. Return rich payload to frontend
    response_payload = {
        "status": "ok",
        "target": target,
        "task": task,
        "dtype": target_dtype
    }
    if warning:
        response_payload["warning"] = warning

    return jsonify(response_payload)


if __name__ == "__main__":
    app.run(debug=True)