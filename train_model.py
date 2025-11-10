import cv2
import numpy as np
import os
from sklearn.linear_model import LinearRegression
import joblib

dataset_dir = "dataset_small"

X, y = [], []

def extract_features(video_path):
    cap = cv2.VideoCapture(video_path)
    intensities = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        green_channel = frame[:, :, 1]
        intensities.append(np.mean(green_channel))
    cap.release()

    if len(intensities) == 0:
        print(f"⚠️ No frames read from {video_path}")
        return [0, 0, 0]

    intensities = np.array(intensities)
    return [np.mean(intensities), np.std(intensities), np.max(intensities) - np.min(intensities)]

# Loop through dataset
for file in os.listdir(dataset_dir):
    if file.endswith(".mp4"):
        video_path = os.path.join(dataset_dir, file)
        bpm_file = video_path.replace(".mp4", "_bpm.txt")
        if not os.path.exists(bpm_file):
            print(f"⚠️ Skipping {file}, missing BPM file.")
            continue
        
        with open(bpm_file, "r") as f:
            bpm = float(f.read().strip())

        features = extract_features(video_path)
        X.append(features)
        y.append(bpm)

if len(X) == 0:
    print("⚠️ No valid training samples found.")
    exit()

X = np.array(X)
y = np.array(y)

# Train and save
model = LinearRegression()
model.fit(X, y)
joblib.dump(model, "heart_rate_model.pkl")

print("✅ Model trained and saved as 'heart_rate_model.pkl'")
print("Training data size:", len(X))
print("Sample predictions:", model.predict(X))
