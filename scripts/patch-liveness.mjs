import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/LLLIT/Code-W11/mtsprz/src/pages/firmar/[token].astro';
let c = readFileSync(path, 'utf8');

// 2. Reemplazar variables globales de face-api
c = c.replace(
  'var MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";\n  var faceApiLoaded = false;',
  '// MediaPipe via window._faceLandmarker / window._mpReady'
);

// 3. Reemplazar initFaceApi completa
const initStart = c.indexOf('  // ── face-api initialization ──');
const initEnd   = c.indexOf('\n\n  // ──', initStart + 10);
if (initStart === -1) { console.log('initFaceApi not found'); process.exit(1); }
const NEW_INIT  = `  // ── MediaPipe ready check ──
  async function waitForMP() {
    if (window._mpInitError) throw new Error("MediaPipe: " + window._mpInitError);
    if (window._mpReady) return true;
    document.getElementById("bioStatus").textContent = "⏳ Cargando detector...";
    for (var i = 0; i < 60; i++) {
      await new Promise(function(r){ setTimeout(r, 500); });
      if (window._mpReady) { document.getElementById("bioStatus").textContent = ""; return true; }
      if (window._mpInitError) throw new Error(window._mpInitError);
    }
    throw new Error("Timeout cargando MediaPipe");
  }`;

c = c.slice(0, initStart) + NEW_INIT + c.slice(initEnd);

// 4. Reemplazar startCamera — quitar initFaceApi(), llamar waitForMP
c = c.replace(
  `      if (!faceApiLoaded) await initFaceApi();
      if (faceApiLoaded) startLivenessDetection();
      else document.getElementById("selfieStatus").textContent = "⚠️ Detector facial no disponible";`,
  `      try {
        await waitForMP();
        startLivenessDetection();
      } catch(mpErr) {
        document.getElementById("selfieStatus").textContent = "⚠️ " + mpErr.message;
      }`
);

// 5. Reemplazar bloque liveness completo con MediaPipe
const livStart = c.indexOf('  // ── Liveness ──');
const livEnd   = c.indexOf('\n\n  var selfieDescriptor', livStart);
if (livStart === -1 || livEnd === -1) { console.log('liveness block not found', livStart, livEnd); process.exit(1); }

const NEW_LIV  = `  // ── Liveness con MediaPipe blendshapes ──
  var livenessActive = false;
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

  async function startLivenessDetection() {
    if (livenessActive) return;
    livenessActive = true;
    blinkCount = 0;
    var video   = document.getElementById("cameraPreview");
    var overlay = document.getElementById("faceOverlay");
    var oc      = overlay.getContext("2d");
    var status  = document.getElementById("selfieStatus");
    var lm_obj  = window._faceLandmarker;
    var wasBlinking = false;
    var noFaceFrames = 0;

    function drawDebug(msg, color) {
      oc.fillStyle = "rgba(0,0,0,0.65)";
      oc.fillRect(4, 4, overlay.width - 8, 28);
      oc.font = "13px monospace";
      oc.fillStyle = color || "#86efac";
      oc.fillText(msg, 8, 22);
    }

    function loop() {
      if (!livenessActive) return;
      if (video.readyState < 2) { requestAnimationFrame(loop); return; }

      if (overlay.width  !== video.videoWidth)  overlay.width  = video.videoWidth  || 480;
      if (overlay.height !== video.videoHeight) overlay.height = video.videoHeight || 854;
      oc.clearRect(0, 0, overlay.width, overlay.height);

      var result;
      try {
        result = lm_obj.detectForVideo(video, performance.now());
      } catch(e) {
        drawDebug("Error: " + (e.message||e), "#f87171");
        requestAnimationFrame(loop);
        return;
      }

      if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
        noFaceFrames++;
        if (noFaceFrames > 10) {
          drawDebug("👤 Acerca tu rostro", "#fbbf24");
          status.textContent = "👤 Acerca tu rostro a la cámara";
        }
        requestAnimationFrame(loop);
        return;
      }
      noFaceFrames = 0;
      bioResult.faceDetectedOnSelfie = true;

      // Bounding box
      var lms = result.faceLandmarks[0];
      var xs = lms.map(function(p){ return p.x * overlay.width; });
      var ys = lms.map(function(p){ return p.y * overlay.height; });
      var x1=Math.min.apply(null,xs), x2=Math.max.apply(null,xs);
      var y1=Math.min.apply(null,ys), y2=Math.max.apply(null,ys);
      oc.strokeStyle = "#22c55e"; oc.lineWidth = 2;
      oc.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Blendshapes eyeBlink
      var blinkL = 0, blinkR = 0;
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        var cats = result.faceBlendshapes[0].categories;
        for (var i = 0; i < cats.length; i++) {
          if (cats[i].categoryName === "eyeBlinkLeft")  blinkL = cats[i].score;
          if (cats[i].categoryName === "eyeBlinkRight") blinkR = cats[i].score;
        }
      }
      var blinkAvg = (blinkL + blinkR) / 2;

      drawDebug(
        "L:" + blinkL.toFixed(2) + " R:" + blinkR.toFixed(2) + " | blinks:" + blinkCount + "/2",
        blinkAvg > 0.4 ? "#f87171" : "#86efac"
      );

      if (blinkAvg > 0.4) {
        if (!wasBlinking) {
          wasBlinking = true;
          blinkCount++;
          status.textContent = blinkCount < 2
            ? "💚 Parpadeo 1/2 — un parpadeo más"
            : "💚 Parpadeo 2/2 — capturando...";
        }
      } else {
        wasBlinking = false;
        if (blinkCount === 0) {
          status.textContent = "👁 Parpadea lento (score: " + blinkAvg.toFixed(2) + ")";
        }
      }

      if (blinkCount >= 2) {
        livenessActive = false;
        bioResult.livenessPassed = true;
        document.getElementById("bioLiveness").textContent = "✅ Liveness OK";
        status.textContent = "✅ Capturando selfie...";
        updateSteps();
        var cap = document.createElement("canvas");
        cap.width = video.videoWidth; cap.height = video.videoHeight;
        cap.getContext("2d").drawImage(video, 0, 0);
        idUploads.selfie = cap.toDataURL("image/jpeg", 0.9);
        selfieDescriptor = null;
        document.getElementById("selfieTaken").classList.remove("hidden");
        document.getElementById("selfieCaptureImg").src = idUploads.selfie;
        document.getElementById("selfieStatus").textContent = "✅ Selfie capturada";
        document.getElementById("bioFaceSelfie").textContent = "⏳ Extrayendo descriptor...";
        stopCamera();
        extractSelfieDescriptor(idUploads.selfie);
        return;
      }

      requestAnimationFrame(loop);
    }

    loop();
  }

  // ── face-api lazy load (solo para descriptores estáticos) ──
  var faceApiLoaded = false;
  var MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

  async function initFaceApi_legacy() {
    if (faceApiLoaded) return;
    if (typeof faceapi === "undefined") {
      await new Promise(function(resolve) {
        var s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        s.onload = resolve;
        s.onerror = function() { console.warn("[face-api] load failed"); resolve(); };
        document.head.appendChild(s);
      });
    }
    if (typeof faceapi === "undefined") return;
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      faceApiLoaded = true;
    } catch(e) { console.warn("[face-api] model load failed:", e); }
  }

  async function extractSelfieDescriptor(dataUrl) {
    try {
      await initFaceApi_legacy();
      if (!faceApiLoaded) {
        document.getElementById("bioFaceSelfie").textContent = "⚠️ Sin descriptor";
        runFaceMatching(); return;
      }
      var img = new Image();
      img.src = dataUrl;
      await new Promise(function(r, rj){ img.onload = r; img.onerror = rj; });
      var det = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
        .withFaceLandmarks().withFaceDescriptor();
      if (det && det.descriptor) {
        selfieDescriptor = det.descriptor;
        document.getElementById("bioFaceSelfie").textContent = "✅ Detectado";
      } else {
        document.getElementById("bioFaceSelfie").textContent = "⚠️ Sin descriptor";
      }
    } catch(e) {
      document.getElementById("bioFaceSelfie").textContent = "⚠️ " + (e.message||e);
    }
    runFaceMatching();
    updateSteps();
  }`;

c = c.slice(0, livStart) + NEW_LIV + c.slice(livEnd);

// 6. Fix botón manual — también llamar extractSelfieDescriptor
const OLD_MANUAL_IMG = `    var img = new Image();
    img.onload = async function() {
      try {
        if (!faceApiLoaded) await initFaceApi();
        var det = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
          .withFaceLandmarks().withFaceDescriptor();
        if (det && det.descriptor) {
          selfieDescriptor = det.descriptor;
          document.getElementById("selfieStatus").textContent = "\\u2705 Selfie capturada";
          document.getElementById("bioFaceSelfie").textContent = "\\u2705 Detectado";
        } else {
          document.getElementById("bioFaceSelfie").textContent = "\\u26a0\\ufe0f Sin rostro detectado";
        }
      } catch(e) {
        document.getElementById("bioFaceSelfie").textContent = "\\u26a0\\ufe0f Error: " + (e.message||e);
      }
      updateSteps();
      if (idUploads.front) runFaceMatching();
    };
    img.src = dataUrl;
    updateSteps();`;

const NEW_MANUAL_IMG = `    document.getElementById("bioFaceSelfie").textContent = "\\u23f3 Extrayendo...";
    extractSelfieDescriptor(dataUrl);
    updateSteps();`;

c = c.replace(OLD_MANUAL_IMG, NEW_MANUAL_IMG);

// 7. Fix autoCaptureSelfie — usar extractSelfieDescriptor
const OLD_AUTO_EXTRACT = `    document.getElementById("bioFaceSelfie").textContent = selfieDescriptor ? "\\u2705 Detectado" : "\\u23f3 Extrayendo...";
    stopCamera();
    if (!selfieDescriptor) {
      var img2 = new Image();
      img2.src = dataUrl;
      img2.onload = async function() {
        try {
          if (!faceApiLoaded) await initFaceApi();
          var d2 = await faceapi
            .detectSingleFace(img2, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
            .withFaceLandmarks().withFaceDescriptor();
          if (d2 && d2.descriptor) {
            selfieDescriptor = d2.descriptor;
            document.getElementById("bioFaceSelfie").textContent = "\\u2705 Detectado";
            document.getElementById("selfieStatus").textContent = "\\u2705 Selfie + rostro OK";
          } else {
            document.getElementById("bioFaceSelfie").textContent = "\\u26a0\\ufe0f Sin descriptor";
          }
        } catch(e) { document.getElementById("bioFaceSelfie").textContent = "\\u26a0\\ufe0f Error: " + (e.message||e); }
        runFaceMatching();
        updateSteps();
      };
    } else {
      runFaceMatching();
    }
  }`;

const NEW_AUTO_EXTRACT = `    document.getElementById("bioFaceSelfie").textContent = "\\u23f3 Extrayendo descriptor...";
    stopCamera();
    extractSelfieDescriptor(dataUrl);
  }`;

if (c.includes('var img2 = new Image()')) {
  c = c.replace(OLD_AUTO_EXTRACT, NEW_AUTO_EXTRACT);
  console.log('autoCaptureSelfie simplified');
} else {
  console.log('autoCaptureSelfie already simple or not found');
}

// 8. Fix runFaceMatching — reemplazar initFaceApi con initFaceApi_legacy
c = c.replace('if (!faceApiLoaded) await initFaceApi();\n      if (!faceApiLoaded) {',
  'if (!faceApiLoaded) await initFaceApi_legacy();\n      if (!faceApiLoaded) {');

writeFileSync(path, c, 'utf8');
const c2 = readFileSync(path, 'utf8');
console.log('MediaPipe eyeBlinkLeft:', c2.includes('eyeBlinkLeft'));
console.log('waitForMP:', c2.includes('waitForMP'));
console.log('extractSelfieDescriptor:', c2.includes('extractSelfieDescriptor'));
console.log('initFaceApi_legacy:', c2.includes('initFaceApi_legacy'));
console.log('no old initFaceApi():', !c2.includes('await initFaceApi();'));
console.log('lines:', c2.split('\n').length);
