import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/LLLIT/Code-W11/mtsprz/src/pages/firmar/[token].astro';
let c = readFileSync(path, 'utf8');

// Fix 1: stopCamera oculta el contenedor de cámara
const OLD_STOP = `function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function(t) { t.stop(); });
      cameraStream = null;
    }
  }`;

const NEW_STOP = `function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function(t) { t.stop(); });
      cameraStream = null;
    }
    var cont = document.getElementById("cameraContainer");
    if (cont) cont.style.display = "none";
    var fov = document.getElementById("faceOverlay");
    if (fov) fov.getContext("2d").clearRect(0, 0, fov.width, fov.height);
    var guide = document.getElementById("faceGuide");
    if (guide) guide.classList.add("hidden");
    var manDiv = document.getElementById("manualLivenessDiv");
    if (manDiv) manDiv.classList.add("hidden");
  }`;

if (c.includes(OLD_STOP)) {
  c = c.replace(OLD_STOP, NEW_STOP);
  console.log('stopCamera fixed');
} else {
  console.log('stopCamera not matched — trying partial');
  c = c.replace(
    'cameraStream = null;\n    }\n  }',
    `cameraStream = null;
    }
    var cont = document.getElementById("cameraContainer");
    if (cont) cont.style.display = "none";
    var fov = document.getElementById("faceOverlay");
    if (fov) fov.getContext("2d").clearRect(0,0,fov.width,fov.height);
  }`
  );
  console.log('stopCamera partial fix applied');
}

// Fix 2: retakeSelfie muestra de nuevo la cámara
const OLD_RETAKE = `    document.getElementById("cameraOverlay").classList.remove("hidden");
    document.getElementById("startCameraBtn").textContent = "Reintentar";
    livenessActive = false;
    updateBioStatus();`;

const NEW_RETAKE = `    var cont2 = document.getElementById("cameraContainer");
    if (cont2) cont2.style.display = "";
    var fov2 = document.getElementById("faceOverlay");
    if (fov2) fov2.classList.remove("hidden");
    document.getElementById("cameraOverlay").classList.remove("hidden");
    document.getElementById("startCameraBtn").textContent = "Reintentar";
    livenessActive = false;
    updateBioStatus();`;

c = c.replace(OLD_RETAKE, NEW_RETAKE);
console.log('retakeSelfie fixed:', c.includes('cont2'));

// Fix 3: extractSelfieDescriptor — retry loop
const OLD_EXTRACT = `  async function extractSelfieDescriptor(dataUrl) {
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

const NEW_EXTRACT = `  async function extractSelfieDescriptor(dataUrl) {
    document.getElementById("bioFaceSelfie").textContent = "⏳ Cargando detector...";
    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        await initFaceApi_legacy();
        if (!faceApiLoaded) {
          await new Promise(function(r){ setTimeout(r, 1500); });
          continue;
        }
        var img = new Image();
        img.src = dataUrl;
        await new Promise(function(r){ img.onload = r; img.onerror = r; });
        await new Promise(function(r){ setTimeout(r, 50); });
        var det = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
          .withFaceLandmarks().withFaceDescriptor();
        if (det && det.descriptor) {
          selfieDescriptor = det.descriptor;
          document.getElementById("bioFaceSelfie").textContent = "✅ Detectado";
          document.getElementById("selfieStatus").textContent = "✅ Selfie + rostro OK";
        } else {
          document.getElementById("bioFaceSelfie").textContent = "⚠️ Rostro no detectado en selfie";
        }
        break;
      } catch(e) {
        if (attempt === 3) {
          document.getElementById("bioFaceSelfie").textContent = "⚠️ " + (e.message || "Error");
        } else {
          await new Promise(function(r){ setTimeout(r, 1000); });
        }
      }
    }
    runFaceMatching();
    updateSteps();
  }`;

if (c.includes(OLD_EXTRACT)) {
  c = c.replace(OLD_EXTRACT, NEW_EXTRACT);
  console.log('extractSelfieDescriptor replaced');
} else {
  console.log('extractSelfieDescriptor not matched — manual check needed');
}

// Fix 4: MRZ — asegurarse de que onMrzInput existe y funciona
const hasMrzOninput = c.includes('oninput="onMrzInput(this)"');
const hasMrzFn = c.includes('function onMrzInput');
console.log('MRZ oninput attr:', hasMrzOninput);
console.log('MRZ function:', hasMrzFn);

// Fix 5: Coincidencia facial mensaje
c = c.replace(
  '"\\u23f3 Toma la selfie para comparar"',
  '"\\u23f3 Extrayendo descriptor selfie..."'
);
c = c.replace(
  '"⏳ Toma la selfie para comparar"',
  '"⏳ Extrayendo descriptor selfie..."'
);

writeFileSync(path, c, 'utf8');
const c2 = readFileSync(path, 'utf8');
console.log('stopCamera hides container:', c2.includes('cameraContainer") !== -1') || c2.includes('cont.style.display = "none"'));
console.log('extractSelfieDescriptor retry:', c2.includes('attempt <= 3'));
console.log('lines:', c2.split('\n').length);
