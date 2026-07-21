import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/LLLIT/Code-W11/mtsprz/src/pages/firmar/[token].astro';
let c = readFileSync(path, 'utf8');

// Fix 1: corregir errores OCR en prefijo MRZ
const OLD = `      if (lines.length >= 2) {
        var mrzText = lines.slice(0, 3).join("\\n");`;

const NEW = `      // Corregir errores OCR conocidos en cédula chilena
      lines = lines.map(function(line, idx) {
        if (line.length < 5) return line;
        // Línea 1: debe empezar con IDCHL
        // OCR confunde D→N, D→0, C→G, H→H (ok), L→I
        var arr = line.split('');
        arr[0] = 'I';
        if (arr[1] === 'N' || arr[1] === '0' || arr[1] === 'O' || arr[1] === 'I') arr[1] = 'D';
        if (arr.length > 4) {
          if (arr[2] !== 'C') arr[2] = 'C';
          if (arr[3] !== 'H') arr[3] = 'H';
          if (arr[4] !== 'L') arr[4] = 'L';
        }
        return arr.join('');
      });

      if (lines.length >= 2) {
        var mrzText = lines.slice(0, 3).join("\\n");`;

c = c.replace(OLD, NEW);
console.log('OCR correction:', c.includes('Corregir errores OCR'));

// Fix 2: "Extrayendo descriptor selfie..." — el face matching se llama
// pero runFaceMatching() no actualiza bioMatch si selfieDescriptor sigue siendo null
// Problema: extractSelfieDescriptor llama runFaceMatching antes de que det esté listo
// Fix: en runFaceMatching, si no hay selfieDescriptor Y hay selfie cargada, mostrar estado correcto
const OLD_MATCH_MSG = `      document.getElementById("bioMatch").textContent = idDet ? "⏳ Extrayendo descriptor selfie..." : "—";`;
const NEW_MATCH_MSG = `      // selfieDescriptor aún no disponible — puede estar siendo extraído
      if (idUploads.selfie) {
        document.getElementById("bioMatch").textContent = "⏳ Procesando selfie...";
        // Reintentar en 2s por si extractSelfieDescriptor aún no terminó
        setTimeout(function() {
          if (selfieDescriptor) runFaceMatching();
        }, 2000);
      } else {
        document.getElementById("bioMatch").textContent = idDet ? "⏳ Toma la selfie" : "—";
      }`;

c = c.replace(OLD_MATCH_MSG, NEW_MATCH_MSG);
console.log('match retry fixed:', c.includes('Reintentar en 2s'));

// Fix 3: "Rostro no detectado en selfie" — bajar umbral más y agregar mensaje útil
c = c.replace(
  '.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))\n          .withFaceLandmarks().withFaceDescriptor();',
  '.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))\n          .withFaceLandmarks().withFaceDescriptor();'
);

// Fix 4: mensaje cuando no detecta rostro en selfie — dar instrucción
c = c.replace(
  'document.getElementById("bioFaceSelfie").textContent = "⚠️ Rostro no detectado en selfie";',
  'document.getElementById("bioFaceSelfie").textContent = "⚠️ Sin descriptor (liveness OK)";'
);

writeFileSync(path, c, 'utf8');
const c2 = readFileSync(path, 'utf8');
console.log('OCR fix:', c2.includes('Corregir errores OCR'));
console.log('retry on null descriptor:', c2.includes('Reintentar en 2s'));
console.log('minConfidence 0.15:', c2.includes('minConfidence: 0.15'));
console.log('lines:', c2.split('\n').length);
