// ===============================
// DATA
// ===============================
const dresses = [
  { id: "dress1", name: "Golden Leaf Couture Dress", imageSrc: "dress1.png" },
  { id: "dress2", name: "Crystal Blossom Gown", imageSrc: "dress2.png" },
  { id: "dress3", name: "Black Royal Cape Gown", imageSrc: "dress3.png" },
  { id: "dress4", name: "Sculpted Silver Asymmetric Gown", imageSrc: "dress4.png" },
  { id: "dress5", name: "Chocolate Sequin Ball Gown", imageSrc: "dress5.png" },
  { id: "dress6", name: "Ivory Floral Lace Couture Dress", imageSrc: "dress6.png" },
  { id: "dress7", name: "Rose Gold Shimmer Cape Dress", imageSrc: "dress7.png" },
  { id: "dress8", name: "Golden Regal Mermaid Gown", imageSrc: "dress8.png" },
  { id: "dress9", name: "Blush Radiance One-Shoulder Dress", imageSrc: "dress9.png" }
];

// ===============================
// DOM
// ===============================
const dressesGrid = document.getElementById('dresses-grid');
const webcamVideo = document.getElementById('webcam-video');
const virtualCanvas = document.getElementById('virtual-canvas');
const loadingMessage = document.getElementById('loading-message');
const ctx = virtualCanvas.getContext('2d');

const virtualDressImg = new Image();

let selectedDress = null;
let pose;
let camera;
let latestPoseResults = null;
let isCameraReady = false;

// ===============================
// ✅ QUICK MODE DEFAULT POSITION
// ===============================
const quickMode = {
  xRatio: 0.2,
  yRatio: 0.12,
  widthRatio: 0.6,
  heightRatio: 0.8
};

// ===============================
// MEDIA PIPE CALLBACK
// ===============================
function onMediaPipeResults(results) {
  latestPoseResults = results;
}

// ===============================
// DRAW LOOP (QUICK + AI UPGRADE)
// ===============================
function drawLoop() {
  ctx.clearRect(0, 0, virtualCanvas.width, virtualCanvas.height);

  if (isCameraReady) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, -virtualCanvas.width, 0, virtualCanvas.width, virtualCanvas.height);
    ctx.restore();
  }

  if (selectedDress && virtualDressImg.complete) {

    let startX = virtualCanvas.width * quickMode.xRatio;
    let startY = virtualCanvas.height * quickMode.yRatio;
    let dressWidth = virtualCanvas.width * quickMode.widthRatio;
    let dressHeight = virtualCanvas.height * quickMode.heightRatio;

    // ✅ إذا BlazePose جاهز -> استخدم التتبع الحقيقي
    if (latestPoseResults?.poseLandmarks) {
      const L = latestPoseResults.poseLandmarks[11];
      const R = latestPoseResults.poseLandmarks[12];
      const H = latestPoseResults.poseLandmarks[24];

      const lx = virtualCanvas.width - (L.x * virtualCanvas.width);
      const rx = virtualCanvas.width - (R.x * virtualCanvas.width);
      const sy = ((L.y + R.y) / 2) * virtualCanvas.height;
      const hy = H.y * virtualCanvas.height;

      const bodyWidth = Math.abs(rx - lx);

      dressWidth = bodyWidth * 1.55;
      dressHeight = (hy - sy) * 3.1;

      startX = Math.min(lx, rx) - (dressWidth - bodyWidth) / 2;
      startY = sy - bodyWidth * 0.18;
    }

    ctx.globalAlpha = 0.95;
    ctx.drawImage(virtualDressImg, startX, startY, dressWidth, dressHeight);
    ctx.globalAlpha = 1.0;
  }

  requestAnimationFrame(drawLoop);
}

// ===============================
// CAMERA
// ===============================
async function setupWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamVideo.srcObject = stream;

    return new Promise((resolve) => {
      webcamVideo.onloadedmetadata = () => {
        webcamVideo.play();
        virtualCanvas.width = webcamVideo.videoWidth;
        virtualCanvas.height = webcamVideo.videoHeight;
        isCameraReady = true;
        resolve(true);
      };
    });
  } catch (err) {
    console.error("Camera Error:", err);
    loadingMessage.textContent = "Camera access failed!";
    return false;
  }
}

// ===============================
// LOAD BLAZEPOSE (BACKGROUND)
// ===============================
async function initializeMediaPipe() {
  loadingMessage.textContent = "Loading AI model...";

  pose = new Pose({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(onMediaPipeResults);

  camera = new Camera(webcamVideo, {
    onFrame: async () => await pose.send({ image: webcamVideo }),
    width: 640,
    height: 480
  });

  await camera.start();
  loadingMessage.style.display = "none";
}

// ===============================
// DRESSES UI
// ===============================
function renderDresses() {
  dresses.forEach(dress => {
    const card = document.createElement('div');
    card.className = 'dress-card';
    card.innerHTML = `
      <img src="${dress.imageSrc}">
      <h3>${dress.name}</h3>
    `;

    card.onclick = () => {
      document.querySelectorAll('.dress-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      selectedDress = dress;
      virtualDressImg.src = dress.imageSrc;
    };

    dressesGrid.appendChild(card);
  });

  // ✅ تحميل أول فستان تلقائيًا
  selectedDress = dresses[0];
  virtualDressImg.src = dresses[0].imageSrc;
}

// ===============================
// INITIALIZE
// ===============================
async function initializeApp() {
  renderDresses();
  const camOK = await setupWebcam();
  if (camOK) {
    drawLoop();             // 🔥 عرض فوري
    initializeMediaPipe();  // 🤖 ترقية تلقائية لاحقًا
  }
}

initializeApp();

