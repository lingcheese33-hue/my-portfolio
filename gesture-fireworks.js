// ========================================
// 手勢煙花 - Gesture Fireworks (張開五指 + 揮動觸發，無聲音)
// ========================================
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---- 1. 創建隱藏的攝像頭 ----
const video = document.createElement("video");
video.setAttribute("playsinline", "");
video.style.display = "none";
document.body.appendChild(video);

// ---- 2. 初始化煙花（柔焦、彩色、單發）----
let fireworks = null;

function ensureFireworks() {
  if (fireworks) return;

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 9999;
    filter: blur(0.6px) saturate(1.4);
    mix-blend-mode: multiply;
  `;
  document.body.appendChild(container);

  fireworks = new Fireworks.default(container, {
    autoresize: true,
    opacity: 0.6,
    acceleration: 1.01,
    friction: 0.985,
    gravity: 0.6,
    particles: 350,
    explosion: 15,
    intensity: 30,
    flickering: 40,
    hue: { min: 0, max: 360 },
    brightness: { min: 60, max: 90 },
    decay: { min: 0.008, max: 0.015 },
    traceLength: 8,
    traceSpeed: 18,
    lineWidth: { explosion: 5, trace: 3 },
    rocketsPoint: { min: 50, max: 50 },
  });
}

function triggerFireworks() {
  ensureFireworks();
  fireworks.launch(1);
}

// ---- 3. 判斷五指是否張開 ----
// MediaPipe 手部關鍵點索引：
// 拇指：1(CMC), 2(MCP), 3(IP), 4(TIP)
// 食指：5(MCP), 6(PIP), 7(DIP), 8(TIP)
// 中指：9(MCP), 10(PIP), 11(DIP), 12(TIP)
// 無名指：13(MCP), 14(PIP), 15(DIP), 16(TIP)
// 小指：17(MCP), 18(PIP), 19(DIP), 20(TIP)

function isFingerExtended(landmarks, tipIndex, pipIndex) {
  // 指尖的 y 坐标 < PIP 关节的 y 坐标 → 手指伸直（y 轴向下为正）
  return landmarks[tipIndex].y < landmarks[pipIndex].y;
}

function isThumbExtended(landmarks, handedness) {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];

  if (handedness === "Right") {
    return thumbTip.x > thumbIp.x;
  } else {
    return thumbTip.x < thumbIp.x;
  }
}

function isFiveFingersOpen(landmarks, handedness) {
  const index = isFingerExtended(landmarks, 8, 6);
  const middle = isFingerExtended(landmarks, 12, 10);
  const ring = isFingerExtended(landmarks, 16, 14);
  const pinky = isFingerExtended(landmarks, 20, 18);
  const thumb = isThumbExtended(landmarks, handedness);

  // 5 根手指全部伸直才算「张开五指」
  return index && middle && ring && pinky && thumb;
}

// ---- 4. 揮手檢測器（基於相對手腕的位移）----
class WaveDetector {
  constructor() {
    this.history = [];
    this.lastTriggerTime = 0;
    this.COOLDOWN_MS = 1800;
    this.WINDOW_MS = 300;
    this.SPEED_THRESHOLD = 0.5;
  }

  update(landmarks, now) {
    if (!landmarks) return false;

    const indexTip = landmarks[8];
    const wrist = landmarks[0];

    // 計算食指尖相對於手腕的偏移量，避免頭動誤觸發
    const relativeX = indexTip.x - wrist.x;

    this.history.push({ x: relativeX, t: now });
    this.history = this.history.filter((p) => now - p.t < this.WINDOW_MS);

    if (this.history.length < 2) return false;

    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];
    const dt = (newest.t - oldest.t) / 1000;
    if (dt <= 0) return false;

    const dx = Math.abs(newest.x - oldest.x);
    const speed = dx / dt;

    if (now - this.lastTriggerTime < this.COOLDOWN_MS) return false;

    if (speed > this.SPEED_THRESHOLD) {
      this.lastTriggerTime = now;
      this.history = [];
      console.log("✨ 揮手觸發！速度:", speed.toFixed(2));
      return true;
    }
    return false;
  }
}

const waveDetector = new WaveDetector();

// ---- 5. 初始化手部追蹤 ----
async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });

  let lastVideoTime = -1;

  function loop() {
    const now = performance.now();

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarker.detectForVideo(video, now);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const handedness = results.handedness[0][0].categoryName;

        // 先判斷五指是否張開
        const fiveOpen = isFiveFingersOpen(landmarks, handedness);

        // 只有張開五指時，才啟動揮手檢測
        if (fiveOpen && waveDetector.update(landmarks, now)) {
          console.log("🖐️ 張開五指 + 揮動 → 觸發煙花！");
          triggerFireworks();
        }
      }
    }

    requestAnimationFrame(loop);
  }

  loop();
}

init().catch((err) => console.error("手勢初始化失敗:", err));
