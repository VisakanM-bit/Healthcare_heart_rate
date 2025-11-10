// ===========================================
// 💚 Unified Heart-Rate Dashboard Script
// ===========================================

// ===== GLOBAL CHART REFERENCES =====
let intensityChart, bpmChart;

// ===== PAGE LOAD EVENT =====
window.addEventListener("load", () => {
  const ctxIntensity = document.getElementById("intensityChart")?.getContext("2d");
  const ctxBpm = document.getElementById("bpmChart")?.getContext("2d");

  // ========== 1️⃣ Green Intensity Chart ==========
  if (ctxIntensity) {
    intensityChart = new Chart(ctxIntensity, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Green Intensity",
            data: [],
            borderColor: "#00bfff",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: {
            title: { display: true, text: "Time (s)", color: "#ccc" },
            ticks: { color: "#aaa" },
            grid: { color: "#222" },
          },
          y: {
            title: { display: true, text: "Intensity", color: "#ccc" },
            ticks: { color: "#aaa" },
            grid: { color: "#222" },
          },
        },
        plugins: {
          legend: { labels: { color: "#ccc" } },
        },
      },
    });
  }

  // ========== 2️⃣ BPM vs Time Chart ==========
  if (ctxBpm) {
    bpmChart = new Chart(ctxBpm, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Predicted BPM",
            data: [],
            borderColor: "#e63946",
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: {
            title: { display: true, text: "Time (s)", color: "#ccc" },
            ticks: { color: "#aaa" },
            grid: { color: "#222" },
          },
          y: {
            title: { display: true, text: "BPM", color: "#ccc" },
            ticks: { color: "#aaa" },
            grid: { color: "#222" },
          },
        },
        plugins: {
          legend: { labels: { color: "#ccc" } },
        },
      },
    });
  }

  // Start polling backend updates
  pollProgress();
});

// ===== FORM HANDLER FOR VIDEO UPLOAD =====
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("videoInput");
    if (!fileInput.files.length) {
      alert("Please select a video file first!");
      return;
    }

    const formData = new FormData();
    formData.append("video", fileInput.files[0]);

    // UI Elements
    const progressBar = document.getElementById("progress-bar");
    const progressStatus = document.getElementById("progress-status");
    const bpmValue = document.getElementById("bpm-value");

    // Reset UI
    progressStatus.innerText = "Uploading...";
    progressBar.style.width = "0%";
    bpmValue.innerText = "-- BPM";

    // Clear charts if available
    if (intensityChart) {
      intensityChart.data.labels = [];
      intensityChart.data.datasets[0].data = [];
      intensityChart.update();
    }
    if (bpmChart) {
      bpmChart.data.labels = [];
      bpmChart.data.datasets[0].data = [];
      bpmChart.update();
    }

    // Send video to backend
    await fetch("/predict", { method: "POST", body: formData });

    // Begin polling updates
    pollProgress();
  });
}

// ===== POLLING FUNCTION =====
async function pollProgress() {
  const progressBar = document.getElementById("bar") || document.getElementById("progress-bar");
  const statusText = document.getElementById("statusText") || document.getElementById("progress-status");
  const overallBpm = document.getElementById("overallBpm") || document.getElementById("bpm-value");

  let timer = setInterval(async () => {
    try {
      const response = await fetch("/progress");
      const data = await response.json();

      // --- Update Progress Bar ---
      const pct = data.pct || data.progress || 0;
      if (progressBar) progressBar.style.width = `${pct}%`;

      // --- Update Status ---
      const stepMsg = data.step || data.step_message || "";
      const state = data.status || "idle";
      if (statusText) statusText.textContent = `${state} — ${stepMsg}`;

      // --- Update Overall BPM ---
      if (overallBpm) {
        overallBpm.textContent = `Overall BPM: ${
          data.overall
            ? data.overall.toFixed(2)
            : data.bpm
            ? `${data.bpm} BPM`
            : "--"
        }`;
      }

      // --- Update Green Intensity Chart ---
      if (intensityChart && data.intensities && data.times) {
        intensityChart.data.labels = data.times;
        intensityChart.data.datasets[0].data = data.intensities;
        intensityChart.update("none");
      }

      // --- Update BPM Chart ---
      if (bpmChart && data.bpm_t && data.bpm_x) {
        bpmChart.data.labels = data.bpm_x;
        bpmChart.data.datasets[0].data = data.bpm_t;
        bpmChart.update("none");
      }

      // Stop polling when complete
      if (
        state === "done" ||
        (typeof state === "string" && state.startsWith("error"))
      ) {
        clearInterval(timer);
        timer = null;
        if (statusText) statusText.textContent = "✅ Completed";
      }
    } catch (err) {
      console.error("Polling error:", err);
      clearInterval(timer);
      timer = null;
    }
  }, 800);
}
