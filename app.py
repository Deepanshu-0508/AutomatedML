import os
from flask import Flask, render_template, request, jsonify, session
from utils import data_loader,analyzer

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


def analyze():
    if "current_file" not in session:
        return jsonify({"error": "No file uploaded"}), 400

    file_path = session["current_file"]

    try:
        df = data_loader.load_file(file_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    issues = analyzer.flag_issue(df)

    return jsonify(issues)


if __name__ == "__main__":
    app.run(debug=True)