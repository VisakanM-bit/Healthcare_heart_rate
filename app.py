from flask import Flask, render_template, request, jsonify, send_from_directory
import threading, time, os, processor

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

progress = processor.shared_state  # shared dictionary

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/start", methods=["POST"])
def start_analysis():
    file = request.files.get("video")
    if not file:
        return render_template("dashboard.html", error="No video uploaded")
    path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(path)
    progress.clear()
    progress.update(status="starting", step="Queued", pct=0,
                    intensities=[], times=[], bpm_t=[], bpm_x=[], overall=None)
    t = threading.Thread(target=processor.analyze_video,
                         args=(path, file.filename), daemon=True)
    t.start()
    return render_template("dashboard.html", video=file.filename)

@app.route("/progress")
def get_progress():
    return jsonify(progress)

@app.route("/uploads/<path:fn>")
def serve_upload(fn):
    return send_from_directory(app.config["UPLOAD_FOLDER"], fn)

if __name__ == "__main__":
    app.run(debug=True)
