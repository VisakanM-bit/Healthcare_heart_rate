import cv2
import numpy as np
import joblib
import tkinter as tk
from tkinter import filedialog

# Load the trained model
model = joblib.load("heart_rate_model.pkl")

# GUI for selecting a video
root = tk.Tk()
root.withdraw()
video_path = filedialog.askopenfilename(title="Select a video file", filetypes=[("Video Files", "*.mp4 *.avi *.mov")])

if not video_path:
    print("No video selected.")
    exit()

# Read video and extract green intensities
cap = cv2.VideoCapture(video_path)
green_values = []

while True:
    ret, frame = cap.read()
    if not ret:
        break
    green_channel = frame[:, :, 1]
    avg_green = np.mean(green_channel)
    green_values.append(avg_green)

cap.release()

# Extract same features as in training
green_values = np.array(green_values)
mean_intensity = np.mean(green_values)
std_intensity = np.std(green_values)
max_diff = np.max(green_values) - np.min(green_values)

# Combine features
features = np.array([[mean_intensity, std_intensity, max_diff]])

# Predict heart rate
predicted_bpm = model.predict(features)[0]
print(f"💚 Predicted Heart Rate: {predicted_bpm:.2f} BPM")
