import cv2, numpy as np, time, joblib, os
shared_state = {}

try:
    model = joblib.load("heart_rate_model.pkl")
except Exception:
    model = None

def bpm_from_segment(sig, fps):
    if len(sig) < 4: return None
    sig = sig - np.mean(sig)
    window = np.hanning(len(sig))
    yf = np.abs(np.fft.rfft(sig * window))
    xf = np.fft.rfftfreq(len(sig), 1/fps)
    mask = (xf >= 0.7) & (xf <= 4.0)
    if not np.any(mask): return None
    freq = xf[mask][np.argmax(yf[mask])]
    return freq * 60

def analyze_video(path, fname):
    try:
        cap = cv2.VideoCapture(path)
        if not cap.isOpened(): raise RuntimeError("Cannot open video")
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

        ints, times = [], []
        shared_state.update(status="extracting", step="Reading frames…", pct=0)

        f = 0
        while True:
            ret, frame = cap.read()
            if not ret: break
            g = frame[:, :, 1]
            val = float(np.mean(g))
            ints.append(val)
            times.append(f / fps)
            f += 1
            if total: shared_state["pct"] = int((f / total) * 40)
            shared_state.update(intensities=ints[-600:], times=times[-600:])  # recent slice
            time.sleep(0.002)
        cap.release()

        ints = np.array(ints)
        win = int(round(fps))  # 1-second windows
        bpm_t, bpm_x = [], []
        shared_state.update(status="analyzing", step="Computing BPM…", pct=50)
        for s in range(0, len(ints) - win, win):
            seg = ints[s:s+win]
            bpm = bpm_from_segment(seg, fps)
            if bpm:
                bpm_t.append(round(bpm, 2))
                bpm_x.append(round(s / fps, 2))
            shared_state.update(bpm_t=bpm_t[-300:], bpm_x=bpm_x[-300:],
                                pct=50 + int(40 * s / max(1, len(ints))))
            time.sleep(0.01)

        mean, std, rng = np.mean(ints), np.std(ints), np.ptp(ints)
        pred = None
        if model is not None:
            try: pred = float(model.predict([[mean, std, rng]])[0])
            except: pass
        shared_state.update(status="done", step="Complete", pct=100,
                            overall=pred, intensities=ints.tolist(),
                            times=[round(t, 2) for t in times],
                            bpm_t=bpm_t, bpm_x=bpm_x)
    except Exception as e:
        shared_state.update(status="error", step=str(e), pct=100)
