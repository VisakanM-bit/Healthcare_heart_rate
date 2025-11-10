const form = document.getElementById("uploadForm");
const progressBar = document.getElementById("progress-bar");
const progressStatus = document.getElementById("progress-status");
const bpmValue = document.getElementById("bpm-value");

// Initialize Chart.js for live green intensity visualization
const ctx = document.getElementById("intensityChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Green Intensity",
        borderColor: "#00ffcc",
        borderWidth: 2,
        fill: false,
        data: [],
      },
    ],
  },
  options: {
    animation: false,
    scales: {
      x: { display: false },
      y: { beginAtZero: true },
    },
  },
});

// Handle video upload
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("videoInput");
  const formData = new FormData();
  formData.append("video", fileInput.files[0]);

  // Reset display
  progressStatus.innerText = "Uploading...";
  progressBar.style.width = "0%";
  bpmValue.innerText = "-- BPM";
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();

  // Send file to backend
  await fetch("/predict", {
    method: "POST",
    body: formData,
  });

  // Start polling progress updates
  pollProgress();
});

// Unified progress polling + live chart update
async function pollProgress() {
  const interval = setInterval(async () => {
    const res = await fetch("/progress");
    const data = await res.json();

    // Update progress bar
    if (data.status === "processing") {
      progressBar.style.width = data.progress + "%";
      progressStatus.innerText = `Processing: ${data.progress}%`;

      // Simulate live green intensity curve
      const randomIntensity = Math.random() * 255; // For visualization only
      chart.data.labels.push(chart.data.labels.length);
      chart.data.datasets[0].data.push(randomIntensity);
      chart.update();
    }

    // When done
    else if (data.status === "done") {
      progressBar.style.width = "100%";
      progressStatus.innerText = "✅ Completed!";
      bpmValue.innerText = `${data.bpm} BPM`;
      clearInterval(interval);
    }

    // Error handling
    else if (data.status && data.status.startsWith("error")) {
      progressStatus.innerText = data.status;
      clearInterval(interval);
    }
  }, 500);
}
