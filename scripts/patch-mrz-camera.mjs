import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/LLLIT/Code-W11/mtsprz/src/pages/firmar/[token].astro';
let c = readFileSync(path, 'utf8');

// ── Fix 1: agregar id="cameraContainer" al div del video ──
c = c.replace(
  '<div class="relative mx-auto overflow-hidden rounded-xl border border-white/[0.08] bg-black" style="width:180px;aspect-ratio:9/16">',
  '<div id="cameraContainer" class="relative mx-auto overflow-hidden rounded-xl border border-white/[0.08] bg-black" style="width:180px;aspect-ratio:9/16">'
);
console.log('cameraContainer id added:', c.includes('id="cameraContainer"'));

// ── Fix 2: Tesseract.js OCR para MRZ ──
// Agregar script de Tesseract antes del mpLoader
c = c.replace(
  '<script type="module" id="mpLoader">',
  `<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<script type="module" id="mpLoader">`
);
console.log('tesseract script added:', c.includes('tesseract.min.js'));

// ── Fix 3: reemplazar runMrzFromImage (ya es no-op) por OCR real con Tesseract ──
// Buscar la función y reemplazarla
const OLD_MRZ_FN = '  function runMrzFromImage() {}';
const NEW_MRZ_FN = `  async function runMrzFromImage(dataUrl) {
    var mrzStatus = document.getElementById("mrzStatus");
    mrzStatus.textContent = "🔍 Leyendo MRZ con OCR...";
    mrzStatus.className = "mt-1 text-[10px] text-white/40";
    mrzStatus.classList.remove("hidden");
    try {
      if (typeof Tesseract === "undefined") {
        mrzStatus.textContent = "⚠️ OCR no disponible — ingresa el MRZ manualmente";
        mrzStatus.className = "mt-1 text-[10px] text-amber-400";
        return;
      }
      // OCR con perfil MRZ: fuente OCR-B, solo mayúsculas y símbolos MRZ
      var result = await Tesseract.recognize(dataUrl, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
        tessedit_pageseg_mode: "6",   // bloque de texto uniforme
        logger: function() {}
      });
      var rawText = result.data.text || "";
      // Filtrar solo líneas que parecen MRZ (≥25 chars, mayúsculas + números + <)
      var lines = rawText.split("\\n").map(function(l) {
        return l.replace(/[^A-Z0-9<]/g, "").trim();
      }).filter(function(l) { return l.length >= 25; });

      if (lines.length >= 2) {
        var mrzText = lines.slice(0, 3).join("\\n");
        var mrzInput = document.getElementById("mrzInput");
        if (mrzInput) {
          mrzInput.value = mrzText;
          onMrzInput(mrzInput);
          mrzStatus.textContent = "✅ MRZ extraído automáticamente";
          mrzStatus.className = "mt-1 text-[10px] text-emerald-400";
        }
      } else {
        mrzStatus.textContent = "⚠️ No se detectó MRZ — ingresa manualmente las 3 líneas";
        mrzStatus.className = "mt-1 text-[10px] text-amber-400";
      }
    } catch(e) {
      mrzStatus.textContent = "⚠️ Error OCR: " + (e.message || e) + " — ingresa manualmente";
      mrzStatus.className = "mt-1 text-[10px] text-amber-400";
    }
  }`;

if (c.includes(OLD_MRZ_FN)) {
  c = c.replace(OLD_MRZ_FN, NEW_MRZ_FN);
  console.log('runMrzFromImage replaced with OCR');
} else {
  // No existe como no-op, insertarla antes de handleIdUpload
  c = c.replace(
    '  function handleIdUpload(input, type) {',
    NEW_MRZ_FN + '\n\n  function handleIdUpload(input, type) {'
  );
  console.log('runMrzFromImage inserted before handleIdUpload');
}

// ── Fix 4: llamar runMrzFromImage al subir la cédula trasera ──
c = c.replace(
  '      // MRZ se ingresa manualmente en el textarea estático',
  '      if (type === "back") runMrzFromImage(e.target.result);'
);
console.log('back upload calls runMrzFromImage:', c.includes('if (type === "back") runMrzFromImage'));

// ── Fix 5: instrucción del textarea más clara ──
c = c.replace(
  'placeholder="Pega aqu&iacute; las 3 l&iacute;neas del MRZ exactamente como aparecen"',
  'placeholder="Se llena automáticamente al subir la foto — o pégalo manualmente"'
);

writeFileSync(path, c, 'utf8');
const c2 = readFileSync(path, 'utf8');
console.log('tesseract:', c2.includes('tesseract.min.js'));
console.log('cameraContainer id:', c2.includes('id="cameraContainer"'));
console.log('OCR fn:', c2.includes('Tesseract.recognize'));
console.log('back calls OCR:', c2.includes('runMrzFromImage(e.target.result)'));
console.log('lines:', c2.split('\n').length);
