// ── GLOBAL STATE ──────────────────────────────────────
const bananaImg = new Image();
bananaImg.src = "img/banana.png";
const appleImg = new Image();
appleImg.src = "img/apple.png";

let activePage = "detect";
let isInference = false;
let confThreshold = 0.5;
let counts = { banana: 0, apple: 0 };
let frames = 0;
let collectGallery = [];

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar ");
  sidebar.classList.toggle("hidden");
}
// Navigation Logic
function nav(id) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");

  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const targetItem = navItems.find((item) =>
    item.getAttribute("onclick").includes(`'${id}'`),
  );
  if (targetItem) {
    targetItem.classList.add("active");
  }

  activePage = id;

  if (id === "augment") initAug();
  if (id === "gradcam") showGradCam("banana");
  if (id === "models") drawTradeoff();
  if (id === "edge") initEdgeDashboard();
}

// Global Logger
function addLog(msg, colorClass) {
  const box = document.getElementById("logBox");
  if (!box) return;
  const div = document.createElement("div");
  div.className = colorClass;
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  box.prepend(div);
  if (box.children.length > 25) box.lastChild.remove();
}

// ── FRUIT DRAWING FUNCTIONS (Realistic Renders with Shading & Detail) ──

function drawBanana(ctx, x, y, scale, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = 100 * scale;
  const h = 50 * scale;

  ctx.drawImage(bananaImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawApple(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  const w = 100 * scale;
  const h = 100 * scale;

  ctx.drawImage(appleImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ── 1. DETECTION INFERENCE LOGIC ──
const detCanvas = document.getElementById("detectCanvas");
const detCtx = detCanvas.getContext("2d");

let detectionFruits = [
  { type: "banana", x: 220, y: 150, s: 1.15, a: 0.15, vx: 1.2, vy: 0.8 },
  { type: "apple", x: 580, y: 260, s: 1.05, a: 0, vx: -0.9, vy: 1.1 },
  { type: "banana", x: 380, y: 320, s: 0.95, a: -0.4, vx: 1.4, vy: -1.0 },
];

function toggleInference() {
  isInference = !isInference;
  const btn = document.getElementById("btnToggle");
  const btnText = document.getElementById("btnText");
  const btnIcon = document.getElementById("btnIcon");
  const scan = document.getElementById("scanLine");

  if (isInference) {
    btnText.innerText = "បញ្ឈប់ការ Detect";
    btnIcon.innerText = "⏹";
    btn.classList.replace("bg-blue-600", "bg-red-600");
    scan.style.display = "block";
    addLog(
      "[SYSTEM] Inference Live Engine Started (YOLOv8-Nano TFLite Model).",
      "text-blue-400",
    );
  } else {
    btnText.innerText = "ចាប់ផ្ដើម Detect";
    btnIcon.innerText = "▶";
    btn.classList.replace("bg-red-600", "bg-blue-600");
    scan.style.display = "none";
    addLog("[SYSTEM] Inference Live Engine Paused.", "text-gray-500");
  }
}

function resetDetectionStats() {
  counts = { banana: 0, apple: 0 };
  document.getElementById("countBanana").innerText = "0";
  document.getElementById("countApple").innerText = "0";
  addLog("[SYSTEM] Reset statistics counters.", "text-orange-400");
}

function renderDetection() {
  const W = detCanvas.width;
  const H = detCanvas.height;

  detCtx.fillStyle = "#080c10";
  detCtx.fillRect(0, 0, W, H);

  // Tech Grid Background
  detCtx.strokeStyle = "rgba(255,255,255,0.02)";
  detCtx.lineWidth = 1;
  for (let i = 0; i < W; i += 40) {
    detCtx.beginPath();
    detCtx.moveTo(i, 0);
    detCtx.lineTo(i, H);
    detCtx.stroke();
  }
  for (let j = 0; j < H; j += 40) {
    detCtx.beginPath();
    detCtx.moveTo(0, j);
    detCtx.lineTo(W, j);
    detCtx.stroke();
  }

  detectionFruits.forEach((obj) => {
    if (isInference) {
      obj.x += obj.vx;
      obj.y += obj.vy;
      if (obj.x < 80 || obj.x > W - 80) obj.vx *= -1;
      if (obj.y < 80 || obj.y > H - 80) obj.vy *= -1;
    }

    // Render beautiful fruit models
    if (obj.type === "banana") drawBanana(detCtx, obj.x, obj.y, obj.s, obj.a);
    else drawApple(detCtx, obj.x, obj.y, obj.s);

    // AI Bounding Boxes overlay
    if (isInference) {
      const conf = 0.81 + Math.sin(Date.now() * 0.003 + obj.x) * 0.12;
      if (conf >= confThreshold) {
        const color = obj.type === "banana" ? "#f5c842" : "#e84c4c";
        const label =
          obj.type === "banana" ? "🍌 ចេក (Banana)" : "🍎 ប៉ោម (Apple)";

        detCtx.strokeStyle = color;
        detCtx.lineWidth = 2.5;
        // Draw elegant bounding corners
        detCtx.strokeRect(obj.x - 55, obj.y - 55, 110, 110);

        // Label Box
        detCtx.fillStyle = color;
        detCtx.fillRect(obj.x - 55, obj.y - 82, 110, 25);

        // Text label
        detCtx.fillStyle = "#000000";
        detCtx.font = "bold 11px Kanit, sans-serif";
        detCtx.fillText(
          `${label} ${Math.floor(conf * 100)}%`,
          obj.x - 50,
          obj.y - 65,
        );

        // Randomly simulate statistical detections
        if (Math.random() > 0.993) {
          counts[obj.type]++;
          document.getElementById("countBanana").innerText = counts.banana;
          document.getElementById("countApple").innerText = counts.apple;
          addLog(
            `Detected Fruit Class: ${obj.type.toUpperCase()} · Score: ${Math.floor(conf * 100)}%`,
            obj.type === "banana" ? "text-[#f5c842]" : "text-[#e84c4c]",
          );
        }
      }
    }
  });

  requestAnimationFrame(renderDetection);
}

// ── 2. DATA COLLECTION ENGINE ──
const colCanvas = document.getElementById("collectCanvas");
const colCtx = colCanvas.getContext("2d");
let colFruitX = 400,
  colFruitY = 225,
  colFruitDir = 1;

function renderCollectStudio() {
  const W = colCanvas.width;
  const H = colCanvas.height;

  colCtx.fillStyle = "#0a0d12";
  colCtx.fillRect(0, 0, W, H);

  // Alignment grid crosshair
  colCtx.strokeStyle = "rgba(255,255,255,0.05)";
  colCtx.lineWidth = 1;
  colCtx.beginPath();
  colCtx.moveTo(W / 2, 0);
  colCtx.lineTo(W / 2, H);
  colCtx.stroke();
  colCtx.beginPath();
  colCtx.moveTo(0, H / 2);
  colCtx.lineTo(W, H / 2);
  colCtx.stroke();

  // Bounding box frame target
  colCtx.strokeStyle = "#f0883e";
  colCtx.lineWidth = 2;
  colCtx.setLineDash([8, 4]);
  colCtx.strokeRect(W / 2 - 100, H / 2 - 100, 200, 200);
  colCtx.setLineDash([]);

  // Slowly animate the fruit in the studio viewport
  colFruitX += 0.4 * colFruitDir;
  if (Math.abs(colFruitX - 400) > 30) colFruitDir *= -1;

  const currentSelection = document.getElementById("collectLabel").value;
  if (currentSelection === "banana") {
    drawBanana(colCtx, colFruitX, colFruitY, 1.6, 0.2);
  } else {
    drawApple(colCtx, colFruitX, colFruitY, 1.4);
  }

  requestAnimationFrame(renderCollectStudio);
}

function captureDataImage() {
  const currentSelection = document.getElementById("collectLabel").value;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 100;
  tempCanvas.height = 100;
  const tempCtx = tempCanvas.getContext("2d");

  // Capture centered crop from collectCanvas
  tempCtx.drawImage(
    colCanvas,
    colCanvas.width / 2 - 100,
    colCanvas.height / 2 - 100,
    200,
    200,
    0,
    0,
    100,
    100,
  );

  const dataUrl = tempCanvas.toDataURL();
  collectGallery.push({ type: currentSelection, img: dataUrl });

  updateCollectGalleryUI();
  addLog(
    `Captured data specimen for class: ${currentSelection.toUpperCase()}`,
    "text-orange-400",
  );
}

function clearDataset() {
  collectGallery = [];
  updateCollectGalleryUI();
  addLog("Succeeded in clearing all dataset samples.", "text-red-400");
}

function updateCollectGalleryUI() {
  const gal = document.getElementById("captureGallery");
  const banCountEl = document.getElementById("dsBanCount");
  const appCountEl = document.getElementById("dsAppCount");

  let banCount = 0;
  let appCount = 0;

  if (collectGallery.length === 0) {
    gal.innerHTML =
      '<div class="text-[10px] text-gray-500 text-center col-span-3 py-6">គ្មានរូបភាពនៅឡើយទេ</div>';
  } else {
    gal.innerHTML = collectGallery
      .map((item, index) => {
        if (item.type === "banana") banCount++;
        else appCount++;

        const badgeColor =
          item.type === "banana"
            ? "bg-[#f5c842]/20 text-[#f5c842]"
            : "bg-[#e84c4c]/20 text-[#e84c4c]";
        return `
        <div class="relative bg-white/5 border border-white/10 rounded-md overflow-hidden aspect-square group">
          <img src="${item.img}" class="w-full h-full object-cover">
          <span class="absolute bottom-1 left-1 text-[8px] px-1 rounded ${badgeColor} font-mono">${item.type}</span>
          <button onclick="deleteSample(${index})" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center transition-all">✕</button>
        </div>
      `;
      })
      .join("");
  }

  banCountEl.innerText = banCount;
  appCountEl.innerText = appCount;
}

function deleteSample(index) {
  collectGallery.splice(index, 1);
  updateCollectGalleryUI();
}

// ── 3. DATA AUGMENTATION SIMULATOR ──
let activeAugments = new Set();

function initAug() {
  const grid = document.getElementById("augGrid");
  const type = document.getElementById("augFruitSelect").value;

  const augEffects = [
    { id: "original", name: "Original (ប្រភពដើម)" },
    { id: "rotate", name: "Rotate ±15° (បង្វិល)" },
    { id: "flip", name: "Horizontal Flip (ត្រឡប់)" },
    { id: "bright", name: "Brightness +30% (ពន្លឺ)" },
    { id: "dark", name: "Darkness -30% (ងងឹត)" },
    { id: "noise", name: "Gaussian Noise (គ្រាប់លម្អិត)" },
    { id: "blur", name: "Gaussian Blur (ព្រាល)" },
    { id: "crop", name: "Random Crop (កាត់ចំណែក)" },
  ];

  grid.innerHTML = augEffects
    .map((eff, index) => {
      const isActive = activeAugments.has(eff.id) || eff.id === "original";
      return `
      <div class="aug-cell p-2 flex flex-col justify-between ${isActive ? "active" : ""}" id="aug-${eff.id}" onclick="toggleAugment('${eff.id}')">
         <canvas id="augCanvas-${eff.id}" width="150" height="110" class="rounded overflow-hidden bg-black/40"></canvas>
         <div class="text-[10px] text-center font-mono mt-2 text-gray-400 group-hover:text-white">${eff.name}</div>
      </div>
    `;
    })
    .join("");

  setTimeout(() => {
    augEffects.forEach((eff) => {
      drawAugmentedFruit(eff.id, type);
    });
  }, 50);
}

function drawAugmentedFruit(effectId, type) {
  const canvas = document.getElementById(`augCanvas-${effectId}`);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, W, H);

  ctx.save();

  // Transformations based on effect
  if (effectId === "rotate") {
    ctx.translate(W / 2, H / 2);
    ctx.rotate(0.26); // ~15 degrees
    ctx.translate(-W / 2, -H / 2);
  } else if (effectId === "flip") {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  } else if (effectId === "crop") {
    ctx.translate(-15, -10);
    ctx.scale(1.2, 1.2);
  }

  // Draw the original beautifully
  if (type === "banana") {
    drawBanana(ctx, W / 2, H / 2 + 5, 1.25, 0.1);
  } else {
    drawApple(ctx, W / 2, H / 2 + 5, 1.1);
  }

  ctx.restore();

  // Pixel level transformations
  if (
    effectId === "bright" ||
    effectId === "dark" ||
    effectId === "noise" ||
    effectId === "blur"
  ) {
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    if (effectId === "bright") {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.3); // Red
        data[i + 1] = Math.min(255, data[i + 1] * 1.3); // Green
        data[i + 2] = Math.min(255, data[i + 2] * 1.3); // Blue
      }
    } else if (effectId === "dark") {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * 0.7;
        data[i + 1] = data[i + 1] * 0.7;
        data[i + 2] = data[i + 2] * 0.7;
      }
    } else if (effectId === "noise") {
      for (let i = 0; i < data.length; i += 4) {
        let noise = (Math.random() - 0.5) * 35;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
    } else if (effectId === "blur") {
      ctx.filter = "blur(2px)";
      ctx.drawImage(canvas, 0, 0);
      return;
    }

    ctx.putImageData(imgData, 0, 0);
  }
}

function toggleAugment(id) {
  if (id === "original") return;
  const cell = document.getElementById(`aug-${id}`);
  if (activeAugments.has(id)) {
    activeAugments.delete(id);
    cell.classList.remove("active");
  } else {
    activeAugments.add(id);
    cell.classList.add("active");
  }
}

function applyAllAugments() {
  const list = ["rotate", "flip", "bright", "dark", "noise", "blur", "crop"];
  list.forEach((id) => {
    activeAugments.add(id);
    const cell = document.getElementById(`aug-${id}`);
    if (cell) cell.classList.add("active");
  });
}

function resetAugments() {
  activeAugments.clear();
  document.querySelectorAll(".aug-cell").forEach((c) => {
    if (c.id !== "aug-original") c.classList.remove("active");
  });
}

// ── 4. CONFUSION MATRIX CALCULATION INTERACTIVE LOGIC ──
function updateConfusionMatrixLogic() {
  const range = document.getElementById("cmThreshold");
  const val = range.value;
  document.getElementById("cmThresholdVal").innerText = val + "%";

  // Real world simulation math formulas based on selected confidence
  const confidenceFactor = parseFloat(val) / 100;

  // Simulated true labels total samples = 180
  // Accuracy will change depending on confidence settings
  const baseAccuracy = 0.94 - Math.abs(confidenceFactor - 0.7) * 0.35;
  const tp = Math.round(90 * baseAccuracy * (1.05 - confidenceFactor * 0.05));
  const tn = Math.round(90 * baseAccuracy * (1.02 - confidenceFactor * 0.02));
  const fp = Math.round(90 - tn);
  const fn = Math.round(90 - tp);

  // Update DOM values
  document.getElementById("cm-tp-val").innerText = tp;
  document.getElementById("cm-tn-val").innerText = tn;
  document.getElementById("cm-fp-val").innerText = fp;
  document.getElementById("cm-fn-val").innerText = fn;

  // Calculate Metrics
  const acc = ((tp + tn) / (tp + tn + fp + fn)) * 100;
  const prec = (tp / (tp + fp)) * 100;
  const rec = (tp / (tp + fn)) * 100;
  const f1 = (2 * prec * rec) / (prec + rec);

  document.getElementById("mAcc").innerText = acc.toFixed(1) + "%";
  document.getElementById("mPrec").innerText = prec.toFixed(1) + "%";
  document.getElementById("mRec").innerText = rec.toFixed(1) + "%";
  document.getElementById("mF1").innerText = f1.toFixed(1) + "%";

  document.getElementById("barAcc").style.width = acc.toFixed(1) + "%";
  document.getElementById("barPrec").style.width = prec.toFixed(1) + "%";
  document.getElementById("barRec").style.width = rec.toFixed(1) + "%";
  document.getElementById("barF1").style.width = f1.toFixed(1) + "%";
}

// ── 5. MODEL TRADEOFF PLOTTING ──
function drawTradeoff() {
  const canvas = document.getElementById("tradeoffChart");
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = 250;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#0c1015";
  ctx.fillRect(0, 0, W, H);

  // Render scatter chart axes
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 20);
  ctx.lineTo(50, H - 40);
  ctx.lineTo(W - 20, H - 40);
  ctx.stroke();

  // Axes label tags
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px JetBrains Mono";
  ctx.fillText("Speed (FPS) →", W - 100, H - 25);

  ctx.save();
  ctx.translate(20, H / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("mAP @50 (%) →", 0, 0);
  ctx.restore();

  // Draw simulated data points for models
  const models = [
    {
      name: "YOLOv8-Nano",
      fps: 45,
      map: 88,
      color: "#3fb950",
      x: 50 + (W - 100) * 0.85,
      y: H - 40 - (H - 80) * 0.55,
    },
    {
      name: "YOLOv8-Small",
      fps: 32,
      map: 92,
      color: "#2f81f7",
      x: 50 + (W - 100) * 0.6,
      y: H - 40 - (H - 80) * 0.7,
    },
    {
      name: "YOLOv8-Med",
      fps: 20,
      map: 95,
      color: "#f0883e",
      x: 50 + (W - 100) * 0.35,
      y: H - 40 - (H - 80) * 0.85,
    },
    {
      name: "YOLOv11-Nano",
      fps: 25,
      map: 97,
      color: "#a371f7",
      x: 50 + (W - 100) * 0.45,
      y: H - 40 - (H - 80) * 0.94,
    },
  ];

  models.forEach((m) => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.shadowBlur = 8;
    ctx.shadowColor = m.color;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px Kanit";
    ctx.fillText(m.name, m.x - 30, m.y - 12);
    ctx.fillStyle = m.color;
    ctx.font = "8px JetBrains Mono";
    ctx.fillText(`(${m.fps} FPS, ${m.map}%)`, m.x - 30, m.y + 18);
  });
}

// ── 6. TRAINING SIMULATOR ──
let trainingActive = false;
let trainingEpoch = 0;
let trainingInterval = null;
let simulatedMetrics = [];

function toggleTraining() {
  const btn = document.getElementById("btnTrain");
  trainingActive = !trainingActive;

  if (trainingActive) {
    btn.innerText = "⏸ បញ្ឈប់";
    btn.classList.replace("bg-blue-600", "bg-red-600");
    trainingInterval = setInterval(simulateEpoch, 500);
  } else {
    btn.innerText = "▶ ចាប់ផ្ដើម Train";
    btn.classList.replace("bg-red-600", "bg-blue-600");
    clearInterval(trainingInterval);
  }
}

function resetTraining() {
  trainingActive = false;
  trainingEpoch = 0;
  simulatedMetrics = [];
  clearInterval(trainingInterval);
  document.getElementById("btnTrain").innerText = "▶ ចាប់ផ្ដើម Train";
  document.getElementById("btnTrain").className =
    "px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono";
  document.getElementById("currentEpoch").innerText = "0";
  document.getElementById("trainingProgress").style.width = "0%";

  const lossCanvas = document.getElementById("lossChart");
  const accCanvas = document.getElementById("accuracyChart");
  lossCanvas
    .getContext("2d")
    .clearRect(0, 0, lossCanvas.width, lossCanvas.height);
  accCanvas.getContext("2d").clearRect(0, 0, accCanvas.width, accCanvas.height);
}

function simulateEpoch() {
  if (trainingEpoch >= 50) {
    clearInterval(trainingInterval);
    trainingActive = false;
    document.getElementById("btnTrain").innerText = "✓ ហ្វឹកហាត់ចប់";
    document.getElementById("btnTrain").className =
      "px-4 py-1.5 bg-green-600 text-white rounded text-xs font-mono pointer-events-none";
    return;
  }
  trainingEpoch++;
  document.getElementById("currentEpoch").innerText = trainingEpoch;
  document.getElementById("trainingProgress").style.width =
    (trainingEpoch / 50) * 100 + "%";

  // Math logic simulating training curve progression
  const loss =
    3.5 * Math.exp(-0.08 * trainingEpoch) + 0.15 + (Math.random() - 0.5) * 0.08;
  const map =
    0.52 +
    0.44 * (1 - Math.exp(-0.1 * trainingEpoch)) +
    (Math.random() - 0.5) * 0.03;

  simulatedMetrics.push({ loss, map });

  drawTrainingCurves();
}

function drawTrainingCurves() {
  const lossCanvas = document.getElementById("lossChart");
  const accCanvas = document.getElementById("accuracyChart");
  if (!lossCanvas || !accCanvas) return;

  const plot = (canvas, dataList, valueKey, label, color) => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, H - 25);
    ctx.lineTo(W - 10, H - 25);
    ctx.stroke();

    if (dataList.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;

    const maxVal = valueKey === "loss" ? 4.0 : 1.0;

    dataList.forEach((point, index) => {
      const x = 40 + (index / 50) * (W - 60);
      const y = H - 25 - (point[valueKey] / maxVal) * (H - 45);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Display current status tags
    ctx.fillStyle = color;
    ctx.font = "9px JetBrains Mono";
    ctx.fillText(
      `${label}: ${dataList[dataList.length - 1][valueKey].toFixed(3)}`,
      W - 120,
      20,
    );
  };

  plot(lossCanvas, simulatedMetrics, "loss", "Train Loss", "#e84c4c");
  plot(accCanvas, simulatedMetrics, "map", "mAP @50", "#3fb950");
}

// ── 7. EXPLAINABLE AI (GRAD-CAM FEATURE HIGHLIGHTS) ──
function showGradCam(type) {
  const canvas = document.getElementById("gradCamCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  document.getElementById("gcBtnBanana").className =
    type === "banana"
      ? "flex-1 py-2 bg-blue-600 text-white rounded text-xs font-mono"
      : "flex-1 py-2 bg-white/5 text-gray-500 rounded text-xs font-mono";
  document.getElementById("gcBtnApple").className =
    type === "apple"
      ? "flex-1 py-2 bg-blue-600 text-white rounded text-xs font-mono"
      : "flex-1 py-2 bg-white/5 text-gray-500 rounded text-xs font-mono";

  ctx.fillStyle = "#060a0f";
  ctx.fillRect(0, 0, W, H);

  // Overlap heatmap gradients on top of beautiful fruit assets
  if (type === "banana") {
    drawBanana(ctx, W / 2, H / 2 + 20, 1.8, 0.1);

    // Radial heatmap gradients around core features of banana
    let heat = ctx.createRadialGradient(
      W / 2 - 20,
      H / 2,
      10,
      W / 2 - 20,
      H / 2,
      120,
    );
    heat.addColorStop(0, "rgba(235, 71, 71, 0.7)"); // Highly activated zone
    heat.addColorStop(0.4, "rgba(242, 218, 63, 0.4)"); // Mid level
    heat.addColorStop(1, "rgba(47, 129, 247, 0)"); // Cold zone
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, W, H);
  } else {
    drawApple(ctx, W / 2, H / 2 + 20, 1.5);

    let heat = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 110);
    heat.addColorStop(0, "rgba(235, 71, 71, 0.75)");
    heat.addColorStop(0.5, "rgba(242, 218, 63, 0.42)");
    heat.addColorStop(1, "rgba(47, 129, 247, 0)");
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, W, H);
  }

  // Feature Breakdown Reports
  const reportBox = document.getElementById("gcFeatureResults");
  const details =
    type === "banana"
      ? `<div>
       <div class="flex justify-between"><span>Color Activation (លឿងទុំ)</span><span class="text-green-400">92%</span></div>
       <div class="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div class="h-full bg-green-400" style="width: 92%"></div></div>
       <span class="text-[8px] text-gray-500 font-light block mt-0.5">ម៉ូដែលផ្តោតលើជួរពណ៌លឿង-ត្នោត (Hsv 40°-70°)</span>
     </div>
     <div>
       <div class="flex justify-between"><span>Shape Extraction (រាងកោង)</span><span class="text-blue-400">86%</span></div>
       <div class="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div class="h-full bg-blue-400" style="width: 86%"></div></div>
       <span class="text-[8px] text-gray-500 font-light block mt-0.5">គែមព័ទ្ធជុំវិញជាលក្ខណៈព្រះច័ន្ទមួយចំហៀង (Crescent)</span>
     </div>`
      : `<div>
       <div class="flex justify-between"><span>Color Activation (ក្រហមចាស់)</span><span class="text-green-400">96%</span></div>
       <div class="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div class="h-full bg-green-400" style="width: 96%"></div></div>
       <span class="text-[8px] text-gray-500 font-light block mt-0.5">ពណ៌ក្រហមចាស់ចាំង Specular Highlight ផ្នែកកណ្ដាល</span>
     </div>
     <div>
       <div class="flex justify-between"><span>Stem/Leaf (ទង និងស្លឹក)</span><span class="text-purple-400">74%</span></div>
       <div class="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden"><div class="h-full bg-purple-400" style="width: 74%"></div></div>
       <span class="text-[8px] text-gray-500 font-light block mt-0.5">ការរកឃើញទង និងស្លឹកព័ទ្ធជុំវិញ lobes ខាងលើ</span>
     </div>`;

  reportBox.innerHTML = details;
}

// ── 8. ROBOT SORTING INDUSTRIAL SIMULATION ──
const robotCanvas = document.getElementById("robotCanvas");
const rCtx = robotCanvas.getContext("2d");
let robotSortingActive = false;
let conveyorX = 0;
let conveyorFruits = [];
let sortedCounts = { banana: 0, apple: 0 };

function toggleRobotSorting() {
  robotSortingActive = !robotSortingActive;
  const btn = document.getElementById("btnToggleRobot");
  if (robotSortingActive) {
    btn.innerText = "⏹ បញ្ឈប់ខ្សែចង្វាក់";
    btn.classList.replace("bg-blue-600", "bg-red-600");
    addLog("[ROBOT] Automation Conveyor Line started.", "text-green-400");
  } else {
    btn.innerText = "▶ បើកខ្សែចង្វាក់";
    btn.classList.replace("bg-red-600", "bg-blue-600");
    addLog("[ROBOT] Conveyor Line halted.", "text-gray-500");
  }
}

function animateRobotSorting() {
  const W = robotCanvas.width;
  const H = robotCanvas.height;

  rCtx.fillStyle = "#06090e";
  rCtx.fillRect(0, 0, W, H);

  // Conveyor Belt Line (ខ្សែក្រវ៉ាត់នាំយក)
  rCtx.fillStyle = "#171c24";
  rCtx.fillRect(50, H / 2 - 20, W - 100, 30);

  // Conveyor rolling slots
  if (robotSortingActive) conveyorX = (conveyorX + 1.8) % 30;
  rCtx.fillStyle = "rgba(255,255,255,0.05)";
  for (let sx = 50 + conveyorX; sx < W - 50; sx += 30) {
    rCtx.fillRect(sx, H / 2 - 20, 2, 30);
  }

  // Camera Inspection Portal (កាមេរ៉ាវិភាគ)
  rCtx.strokeStyle = "rgba(47, 129, 247, 0.4)";
  rCtx.lineWidth = 1.5;
  rCtx.setLineDash([4, 4]);
  rCtx.strokeRect(W / 2 - 80, H / 2 - 120, 160, 200);
  rCtx.setLineDash([]);

  rCtx.fillStyle = "rgba(47, 129, 247, 0.15)";
  rCtx.fillRect(W / 2 - 80, H / 2 - 120, 160, 200);

  rCtx.fillStyle = "#2f81f7";
  rCtx.font = "bold 9px JetBrains Mono";
  rCtx.fillText("📷 AI SENSOR PORTAL", W / 2 - 60, H / 2 - 130);

  // Sorting Boxes targets (ប្រអប់ទទួលផល)
  // Banana Box (Left Bottom)
  rCtx.fillStyle = "rgba(245, 200, 66, 0.1)";
  rCtx.strokeStyle = "#f5c842";
  rCtx.fillRect(100, H - 100, 150, 80);
  rCtx.strokeRect(100, H - 100, 150, 80);
  rCtx.fillStyle = "#f5c842";
  rCtx.font = "bold 11px Kanit";
  rCtx.fillText("🍌 ប្រអប់ ចេក", 145, H - 60);

  // Apple Box (Right Bottom)
  rCtx.fillStyle = "rgba(232, 76, 76, 0.1)";
  rCtx.strokeStyle = "#e84c4c";
  rCtx.fillRect(W - 250, H - 100, 150, 80);
  rCtx.strokeRect(W - 250, H - 100, 150, 80);
  rCtx.fillStyle = "#e84c4c";
  rCtx.fillText("🍎 ប្រអប់ ប៉ោម", W - 205, H - 60);

  // Logic spawning fruits
  if (robotSortingActive && Math.random() > 0.993) {
    conveyorFruits.push({
      type: Math.random() > 0.5 ? "banana" : "apple",
      x: 60,
      y: H / 2 - 5,
      detected: false,
      sorted: false,
    });
  }

  conveyorFruits.forEach((f, idx) => {
    if (robotSortingActive && !f.sorted) f.x += 1.8;

    // Draw fruit
    if (f.type === "banana") drawBanana(rCtx, f.x, f.y, 0.7, 0.2);
    else drawApple(rCtx, f.x, f.y, 0.6);

    // Trigger AI camera detection in portal zone
    if (f.x > W / 2 - 30 && f.x < W / 2 + 30 && !f.detected) {
      f.detected = true;
      actuateMechanicalArm(f.type);
    }

    // Simulated drop logic once it reaches sorting coordinate
    if (f.detected && !f.sorted) {
      if (f.type === "banana" && f.x > 175) {
        f.sorted = true;
        animateDrop(f, 175, H - 100 + 40, "banana");
      } else if (f.type === "apple" && f.x > W - 175) {
        f.sorted = true;
        animateDrop(f, W - 175, H - 100 + 40, "apple");
      }
    }
  });

  // Keep rendering loop going
  requestAnimationFrame(animateRobotSorting);
}

function actuateMechanicalArm(type) {
  if (type === "banana") {
    document.getElementById("servoA_angle").innerText = "90° (Active)";
    document.getElementById("servoA_bar").style.width = "100%";
    setTimeout(() => {
      document.getElementById("servoA_angle").innerText = "0° (Standby)";
      document.getElementById("servoA_bar").style.width = "0%";
    }, 1200);
  } else {
    document.getElementById("servoB_angle").innerText = "90° (Active)";
    document.getElementById("servoB_bar").style.width = "100%";
    setTimeout(() => {
      document.getElementById("servoB_angle").innerText = "0° (Standby)";
      document.getElementById("servoB_bar").style.width = "0%";
    }, 1200);
  }
}

function animateDrop(fruitObj, targetX, targetY, type) {
  let step = 0;
  const timer = setInterval(() => {
    step += 0.1;
    fruitObj.x = fruitObj.x + (targetX - fruitObj.x) * 0.3;
    fruitObj.y = fruitObj.y + (targetY - fruitObj.y) * 0.3;

    if (step >= 1.0) {
      clearInterval(timer);
      // Add to stats
      sortedCounts[type]++;
      document.getElementById("robotBanSorted").innerText = sortedCounts.banana;
      document.getElementById("robotAppSorted").innerText = sortedCounts.apple;

      // Remove from current conveyor queue list
      conveyorFruits = conveyorFruits.filter((f) => f !== fruitObj);
    }
  }, 35);
}

// ── 9. SMART FARM ──
const farmCvs = document.getElementById("farmCanvas");
const farmCtx = farmCvs.getContext("2d");

function renderFarm() {
  if (activePage !== "smartfarm") {
    requestAnimationFrame(renderFarm);
    return;
  }

  const W = farmCvs.width;
  const H = farmCvs.height;

  farmCtx.fillStyle = "#0a0d08";
  farmCtx.fillRect(0, 0, W, H);

  // Real soil ground render
  let soil = farmCtx.createLinearGradient(0, H - 80, 0, H);
  soil.addColorStop(0, "#1c1307");
  soil.addColorStop(1, "#0c0803");
  farmCtx.fillStyle = soil;
  farmCtx.fillRect(0, H - 80, W, 80);

  // Plants Row
  for (let i = 0; i < 6; i++) {
    const x = 150 + i * 140;
    const y = H - 100;

    // Solid organic woody branches (ដើមរុក្ខជាតិ)
    farmCtx.strokeStyle = "#24451f";
    farmCtx.lineWidth = 6;
    farmCtx.beginPath();
    farmCtx.moveTo(x, y + 20);
    farmCtx.lineTo(x, y - 100);
    farmCtx.stroke();

    // Growing leaves details
    farmCtx.fillStyle = "#1c3618";
    farmCtx.beginPath();
    farmCtx.ellipse(x - 18, y - 60, 16, 7, -0.4, 0, Math.PI * 2);
    farmCtx.ellipse(x + 18, y - 80, 16, 7, 0.4, 0, Math.PI * 2);
    farmCtx.fill();

    // Draw Fruit on Crop branches
    if (i % 2 === 0) drawBanana(farmCtx, x + 22, y - 75, 0.7, 0.4);
    else drawApple(farmCtx, x, y - 90, 0.55);

    // AI Intelligent Farm Inspector Box
    farmCtx.strokeStyle = "rgba(63, 185, 80, 0.35)";
    farmCtx.setLineDash([4, 4]);
    farmCtx.strokeRect(x - 40, y - 130, 80, 100);
    farmCtx.setLineDash([]);

    farmCtx.fillStyle = "#3fb950";
    farmCtx.font = "bold 9px JetBrains Mono";
    farmCtx.fillText("HEALTH: 98%", x - 35, y - 135);
  }

  requestAnimationFrame(renderFarm);
}

// ── 10. EDGE AI DASHBOARD MONITORING ──
function initEdgeDashboard() {
  const edgeCPU = document.getElementById("edgeCPU");
  const edgeTemp = document.getElementById("edgeTemp");
  const edgeRAM = document.getElementById("edgeRAM");
  const edgePower = document.getElementById("edgePower");

  const cpuBar = document.getElementById("edgeCPU_bar");
  const tempBar = document.getElementById("edgeTemp_bar");
  const ramBar = document.getElementById("edgeRAM_bar");
  const powerBar = document.getElementById("edgePower_bar");

  // Continously update realistic simulation numbers
  setInterval(() => {
    if (activePage !== "edge") return;

    const cpuVal = Math.round(35 + Math.random() * 25);
    const tempVal = (50.1 + Math.random() * 8).toFixed(1);
    const ramVal = (1.9 + Math.random() * 0.4).toFixed(1);
    const powerVal = (3.2 + Math.random() * 1.1).toFixed(1);

    edgeCPU.innerText = cpuVal + "%";
    edgeTemp.innerText = tempVal + "°C";
    edgeRAM.innerText = ramVal + " GB";
    edgePower.innerText = powerVal + "W";

    cpuBar.style.width = cpuVal + "%";
    tempBar.style.width = (parseFloat(tempVal) / 80) * 100 + "%";
    ramBar.style.width = (parseFloat(ramVal) / 4) * 100 + "%";
    powerBar.style.width = (parseFloat(powerVal) / 6) * 100 + "%";
  }, 1500);

  drawLatencyProfile();
}

function drawLatencyProfile() {
  const canvas = document.getElementById("latencyChart");
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 150;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, W, H);

  // Draw simulated line profile representing real-time object detection speed
  ctx.strokeStyle = "#2f81f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, H - 40);

  for (let x = 10; x < W - 10; x += 15) {
    let randomLatency = H - 40 - (Math.random() * 35 + 15);
    ctx.lineTo(x, randomLatency);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "9px JetBrains Mono";
  ctx.fillText(
    "Model Latency Benchmark: ~22ms/frame on INT8 Quantized model",
    15,
    H - 10,
  );
}

// ── 11. IoT MQTT INTEGRATION SYSTEM ──
function sendMockIotMessage() {
  const logs = document.getElementById("iotLogs");
  const bCount = counts.banana;
  const aCount = counts.apple;

  document.getElementById("iotJsonBanana").innerText = bCount;
  document.getElementById("iotJsonApple").innerText = aCount;

  const div = document.createElement("div");
  div.className = "text-yellow-400 mt-1";
  div.innerText = `[PUBLISH] Topic: fruitai/detections -> payload: {"banana": ${bCount}, "apple": ${aCount}}`;
  logs.prepend(div);
}

function clearIotLogs() {
  const logs = document.getElementById("iotLogs");
  logs.innerHTML =
    '<div class="text-green-400">[CONNECT] Reconnected to hivemq broker.</div>';
}

// ── APP WINDOW INITIALIZATION ──
window.onload = () => {
  renderDetection();
  renderCollectStudio();
  renderFarm();
  updateConfusionMatrixLogic();
  animateRobotSorting();

  addLog(
    "ប្រព័ន្ធសិប្បនិម្មិត FruitAI Pro ត្រូវបានកំណត់រចនាសម្ព័ន្ធរួចរាល់។",
    "text-green-400",
  );
};
