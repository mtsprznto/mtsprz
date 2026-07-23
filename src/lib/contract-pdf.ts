import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFPage } from "pdf-lib";

// ── Data Model ──────────────────────────────────────────────────────────────

export interface ContractData {
  // Campos existentes (se mantienen)
  contractNumber: string;
  clientName: string;
  clientRut: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  companyName: string;
  services: { id: string; name: string; description: string; price: number; deliverables?: string[]; is_monthly?: boolean }[];
  totalAmount: number;
  paymentTerms: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  schedule: string;
  specialClauses: string;
  templateType: string;
  createdAt: string;
  adminSignature?: string;
  clientSignature?: string;
  adminSignedAt?: string;
  clientSignedAt?: string;

  // NUEVOS — opcionales para compatibilidad backward
  clientNationality?: string;
  clientProfession?: string;
  clientCompany?: string;
  paymentMethod?: string;        // "contado" | "50_50" | "hitos"
  warrantyDays?: number;         // default 15
  revisionDays?: number;         // default 5
  acceptanceEmail?: string;      // contraparte técnica
  subcontractingAllowed?: boolean;
  governingLaw?: string;         // default "Chile"
  jurisdiction?: string;         // default "Puerto Varas"
  prestadorRut?: string;

  // NUEVOS — identificación legal correcta (recomendación abogado)
  prestadorNombreCivil?: string; // nombre civil completo del prestador (persona natural)
  clientRepresentante?: string;  // "[nombre], RUT [rut], según consta en escritura/estatutos" — para SpA/SA/Ltda
  clientNotifEmail?: string;     // correo formal del cliente para notificaciones (si distinto a clientEmail)
  prestadorNotifEmail?: string;  // correo formal del prestador (default: contacto@mtsprz.org)
}

// ── Layout Helpers ──────────────────────────────────────────────────────────

const MARGIN = 56;
const SMALL_SIZE = 9;
const NORMAL_SIZE = 10;
const TITLE_SIZE = 16;
const CLAUSE_TITLE_SIZE = 11;
const PAGE_W = 612;
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;

const PRIMARY = rgb(0.39, 0.4, 0.95);
const TEXT = rgb(0.15, 0.15, 0.15);
const MUTED = rgb(0.5, 0.5, 0.5);
const SECTION_BG = rgb(0.96, 0.97, 0.98);
const BORDER = rgb(0.88, 0.88, 0.9);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.06, 0.73, 0.51);

const ORDINALS = [
  "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA",
  "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA",
  "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA", "DÉCIMA TERCERA", "DÉCIMA CUARTA", "DÉCIMA QUINTA",
  "DÉCIMA SEXTA", "DÉCIMA SÉPTIMA", "DÉCIMA OCTAVA", "DÉCIMA NOVENA",
  "VIGÉSIMA", "VIGÉSIMA PRIMERA", "VIGÉSIMA SEGUNDA",
];

// ── Layout Helpers ──────────────────────────────────────────────────────────

interface LayoutCtx {
  page: PDFPage;
  doc: PDFDocument;
  font: any;
  fontBold: any;
  y: number;
  width: number;
  height: number;
}

function addNewPage(ctx: LayoutCtx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: LayoutCtx, needed: number) {
  if (ctx.y - needed < MARGIN + 40) {
    addNewPage(ctx);
  }
}

function drawWrappedText(
  ctx: LayoutCtx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  font: any,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  const flushLine = (l: string) => {
    if (currentY < MARGIN + lineHeight) {
      addNewPage(ctx);
      currentY = ctx.y;
    }
    ctx.page.drawText(l, { x, y: currentY, size: fontSize, font });
    currentY -= lineHeight;
  };

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && line) {
      flushLine(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    flushLine(line);
  }
  return currentY;
}

function countLines(text: string, maxWidth: number, fontSize: number, font: any): number {
  const words = text.split(" ");
  let line = "";
  let count = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
      count++;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) count++;
  return count;
}

/** Dibuja título de cláusula numerada (PRIMERA: ...) y devuelve nueva y */
function drawClauseTitle(ctx: LayoutCtx, index: number, title: string): number {
  ensureSpace(ctx, 40);
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: BORDER,
  });
  ctx.y -= 18;
  const label = `${ORDINALS[index]}. — ${title}`;
  ctx.page.drawText(label, {
    x: MARGIN,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 20;
  return ctx.y;
}

/** Dibuja un ítem con sangría dentro de una cláusula */
function drawClauseItem(
  ctx: LayoutCtx,
  letter: string,
  text: string,
): number {
  ensureSpace(ctx, 24);
  const label = `${letter}) `;
  ctx.page.drawText(label, {
    x: MARGIN + 8,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 14;
  ctx.y = drawWrappedText(ctx, text, MARGIN + 22, ctx.y, CONTENT_W - 22, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 4;
  return ctx.y;
}

/** Dibuja texto de cláusula sin ítems */
function drawClauseText(ctx: LayoutCtx, text: string): number {
  ensureSpace(ctx, 24);
  ctx.y = drawWrappedText(ctx, text, MARGIN, ctx.y, CONTENT_W, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 4;
  return ctx.y;
}

/** Párrafo con texto en negrita seguido de texto normal */
function drawClauseParagraph(ctx: LayoutCtx, boldPart: string, normalPart: string): number {
  ensureSpace(ctx, 24);
  ctx.page.drawText(boldPart, {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 14;
  ctx.y = drawWrappedText(ctx, normalPart, MARGIN, ctx.y, CONTENT_W, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 4;
  return ctx.y;
}

// ── Clause Renderers ────────────────────────────────────────────────────────

function drawClause1_Parties(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 0, "IDENTIFICACIÓN DE LAS PARTES");

  const prestadorRut = data.prestadorRut || import.meta.env.MTSPRZ_RUT || "Pendiente";
  const prestadorNombre = data.prestadorNombreCivil
    ? `${data.prestadorNombreCivil}, que usa el nombre de fantasía Mtsprz — Soluciones Digitales`
    : "Mtsprz — Soluciones Digitales";

  const prestadorNotifEmail = data.prestadorNotifEmail || "contacto@mtsprz.org";
  const clientNotifEmail = data.clientNotifEmail || data.clientEmail;

  const prestadorRows = [
    { label: "PRESTADOR", value: prestadorNombre },
    { label: "RUT PRESTADOR", value: prestadorRut },
    { label: "DOMICILIO PRESTADOR", value: "Puerto Varas, Región de Los Lagos, Chile" },
    { label: "CORREO ELECTRÓNICO", value: prestadorNotifEmail },
  ];

  const isCompanyRut = /^[5-9]\d{7,}/.test((data.clientRut || "").replace(/[.\-]/g, ""));

  const clientRows = [
    { label: "CLIENTE", value: data.clientName },
    ...(isCompanyRut && data.clientRepresentante
      ? [{ label: "REPRESENTANTE LEGAL", value: data.clientRepresentante }]
      : []),
    { label: "RUT CLIENTE", value: data.clientRut || "—" },
    ...(!isCompanyRut ? [{ label: "NACIONALIDAD", value: data.clientNationality || "Chilena" }] : []),
    ...(data.clientProfession ? [{ label: isCompanyRut ? "GIRO" : "PROFESIÓN / GIRO", value: data.clientProfession }] : []),
    { label: "DOMICILIO CLIENTE", value: data.clientAddress || "—" },
    { label: "CORREO (CONTACTO)", value: data.clientEmail },
    ...(data.clientNotifEmail && data.clientNotifEmail !== data.clientEmail
      ? [{ label: "CORREO (NOTIFICACIONES)", value: data.clientNotifEmail }]
      : []),
    { label: "TELÉFONO", value: data.clientPhone || "—" },
  ];

  const drawRow = (label: string, value: string) => {
    ensureSpace(ctx, 16);
    ctx.page.drawText(label, {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.fontBold,
      color: MUTED,
    });
    ctx.y = drawWrappedText(ctx, value, MARGIN + 130, ctx.y, CONTENT_W - 130, SMALL_SIZE, ctx.font, 13);
    ctx.y -= 2;
  };

  for (const p of prestadorRows) drawRow(p.label, p.value);
  ctx.y -= 6;
  for (const p of clientRows) drawRow(p.label, p.value);

  // Nota de personería para personas jurídicas
  if (isCompanyRut) {
    ctx.y -= 4;
    const noteriaText = data.clientRepresentante
      ? "El representante legal indicado actúa en nombre y representación del Cliente, con las facultades " +
        "que le otorga la escritura social o instrumento constitutivo correspondiente. Las partes declaran " +
        "que la personería del representante es suficiente para celebrar y obligar al Cliente en virtud del " +
        "presente contrato."
      : "ADVERTENCIA: El Cliente es persona jurídica. Se recomienda identificar al representante legal y " +
        "citar la fuente de sus poderes (escritura pública, estatutos) antes de suscribir el contrato.";
    ctx.y = drawWrappedText(ctx, noteriaText, MARGIN, ctx.y, CONTENT_W, 8, ctx.font, 12);
  }
  ctx.y -= 8;
}

function drawClause2_Declarations(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 1, "DECLARACIONES");

  drawClauseText(ctx,
    "El PRESTADOR declara: (a) Ser persona natural, con capacidad para contratar y obligarse conforme al " +
    "Artículo 1445 del Código Civil. (b) Dedicarse profesionalmente a la prestación de servicios digitales, " +
    "incluyendo diseño web, desarrollo de software, mantenimiento de sitios web, marketing digital, " +
    "gestión de campañas publicitarias en plataformas digitales, posicionamiento en buscadores (SEO), " +
    "recolección y procesamiento automatizado de datos (web scraping y ETL), e integración de sistemas. " +
    "(c) Contar con la experiencia y conocimientos técnicos necesarios para ejecutar los servicios contratados."
  );

  drawClauseText(ctx,
    "El CLIENTE declara: (a) Tener capacidad legal para contratar. (b) Que los datos proporcionados son veraces y " +
    "exactos. (c) Que el presente contrato tiene naturaleza civil y NO constituye una relación laboral, " +
    "reconociendo expresamente la independencia del Prestador. (d) Ser contribuyente de Primera Categoría " +
    "obligado por ley a llevar contabilidad completa, y en consecuencia obligado a practicar y enterar la " +
    "retención sobre las boletas de honorarios que emita el Prestador conforme a la cláusula SÉPTIMA. " +
    "Si esta calidad variare durante la vigencia del contrato, el Cliente se obliga a informarlo al " +
    "Prestador dentro de los 5 días hábiles siguientes al cambio."
  );
}

function drawClause3_Object(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 2, "OBJETO DEL CONTRATO");

  const objectText =
    data.templateType === "jornada_dedicada"
      ? `El Prestador se obliga a prestar al Cliente los servicios profesionales de diseño web, mantenimiento de sitios web, y programación de sistemas de gestión de datos, bajo la modalidad de jornada dedicada remota, de conformidad con las cláusulas del presente contrato.`
      : `El Prestador se obliga a prestar al Cliente los servicios digitales detallados en la cláusula CUARTA del presente contrato, conforme a las especificaciones técnicas y funcionales acordadas entre las partes.`;

  drawClauseText(ctx, objectText);

  drawClauseParagraph(ctx, "Alcance incluido: ",
    "Los servicios específicos contratados se detallan en la cláusula CUARTA. Los entregables, plazos y " +
    "especificaciones de cada servicio se describen en el Anexo A adjunto al presente contrato, que forma " +
    "parte integrante del mismo."
  );

  drawClauseParagraph(ctx, "Alcance excluido: ",
    "Quedan excluidos del objeto del contrato: (a) servicios no listados en la cláusula CUARTA; " +
    "(b) modificaciones sustanciales al alcance original no acordadas por escrito; (c) licencias " +
    "de software de terceros, costos de suscripción o infraestructura tecnológica, salvo que se " +
    "incluyan expresamente como entregable en el Anexo A del presente contrato; (d) la inversión " +
    "publicitaria pagada a plataformas de terceros (Google Ads, Meta Ads u otras), que constituye " +
    "un gasto directo del Cliente a dichas plataformas y es completamente independiente de los " +
    "honorarios del Prestador por la gestión de campañas."
  );
}

function drawClause4_Services(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 3, "SERVICIOS CONTRATADOS");

  // P1: Filtrar servicios con valor <= 0
  const activeServices = (data.services || []).filter(s => (s.price || 0) > 0);
  const monthlySvcs = activeServices.filter(s => s.is_monthly);
  const punctualSvcs = activeServices.filter(s => !s.is_monthly);
  const duration = data.durationMonths || 1;

  // P2: Compute effective total (monthly × months)
  const monthlyTotal = monthlySvcs.reduce((sum, s) => sum + (s.price || 0) * duration, 0);
  const punctualTotal = punctualSvcs.reduce((sum, s) => sum + (s.price || 0), 0);
  const effectiveTotal = monthlyTotal + punctualTotal;

  const colValorX = PAGE_W - MARGIN - 90;   // Subtotal column
  const colModalX = colValorX - 90;           // Modalidad column
  const colVUnitX = colModalX - 74;           // Valor unitario column

  // Helper: determine block label for a punctual service by name
  const fundacionKeys = ["diagnóstico", "diagnostico", "logo", "identidad", "auditoría", "auditoria", "seo", "marca"];
  const plataformaKeys = ["sitio web", "landing", "tienda", "ecommerce", "aplicación", "aplicacion", "web app", "api", "backend", "dashboard", "panel"];
  const automatizacionKeys = ["automatización", "automatizacion", "excel", "n8n", "make", "bot", "whatsapp", "email marketing", "crm", "ocr", "scrap", "etl"];
  const hitoKeys = ["aplicacion", "aplicación", "tienda", "ecommerce"];
  const getBlockLabel = (svc: {name: string; price: number; is_monthly?: boolean}): string => {
    const sl = svc.name.toLowerCase();
    if (svc.is_monthly) return `Mensual ×${duration}`;
    if (hitoKeys.some(k => sl.includes(k)) && (svc.price || 0) >= 500000) return "Hito 40/30/30";
    if (fundacionKeys.some(k => sl.includes(k))) return "Bloque 1";
    if (plataformaKeys.some(k => sl.includes(k))) return "Bloque 2";
    if (automatizacionKeys.some(k => sl.includes(k))) return "Bloque 3";
    return "Bloque 1";
  };

  // ── HEADER: 4-column (Servicio | Valor unitario | Modalidad | Subtotal) ──
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 4, width: CONTENT_W, height: 24, color: SECTION_BG });
  ctx.page.drawText("Servicio", { x: MARGIN + 8, y: ctx.y + 4, size: SMALL_SIZE, font: ctx.fontBold, color: TEXT });
  ctx.page.drawText("Valor unitario", { x: colVUnitX, y: ctx.y + 4, size: 7, font: ctx.fontBold, color: MUTED });
  ctx.page.drawText("Modalidad", { x: colModalX, y: ctx.y + 4, size: 7, font: ctx.fontBold, color: MUTED });
  ctx.page.drawText("Subtotal", { x: colValorX, y: ctx.y + 4, size: 7, font: ctx.fontBold, color: MUTED });
  ctx.y -= 28;

  // ── All services: unified 4-column loop ──
  for (const svc of activeServices) {
    const isMonthly = !!svc.is_monthly;
    const subtotal = isMonthly ? (svc.price || 0) * duration : (svc.price || 0);
    const nameLines = countLines(svc.name, colVUnitX - MARGIN - 16, SMALL_SIZE, ctx.font);
    const rowH = Math.max(20, nameLines * 13 + 8);
    ensureSpace(ctx, rowH + 4);
    const rowColor = isMonthly ? rgb(0.97, 0.98, 1.0) : WHITE;
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 2, width: CONTENT_W, height: rowH, color: rowColor });
    drawWrappedText(ctx, svc.name, MARGIN + 8, ctx.y + 2, colVUnitX - MARGIN - 16, SMALL_SIZE, ctx.font, 13);
    ctx.page.drawText(`$${(svc.price || 0).toLocaleString("es-CL")}`, {
      x: colVUnitX, y: ctx.y + 2, size: SMALL_SIZE, font: ctx.font, color: TEXT,
    });
    ctx.page.drawText(getBlockLabel(svc), {
      x: colModalX, y: ctx.y + 2, size: 7, font: isMonthly ? ctx.fontBold : ctx.font, color: isMonthly ? PRIMARY : MUTED,
    });
    ctx.page.drawText(`$${subtotal.toLocaleString("es-CL")}`, {
      x: colValorX, y: ctx.y + 2, size: SMALL_SIZE, font: ctx.font, color: TEXT,
    });
    ctx.y -= rowH + 2;
  }

  if (activeServices.length === 0) {
    drawClauseText(ctx,
      "No se han definido servicios con valor en el presente contrato. " +
      "Los servicios se incorporarán mediante anexo suscrito por las partes."
    );
    return;
  }

  ensureSpace(ctx, 60);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 20;

  // Total row
  ctx.page.drawText("TOTAL", {
    x: colVUnitX - 8,
    y: ctx.y,
    size: NORMAL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText(`$${effectiveTotal.toLocaleString("es-CL")}`, {
    x: colValorX,
    y: ctx.y,
    size: NORMAL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 24;

  // Notes below table
  if (monthlySvcs.length > 0) {
    drawClauseParagraph(ctx, "Servicios de devengo mensual: ",
      `Los servicios identificados como "Mensual ×${duration}" en la columna Modalidad se devengan ` +
      "y facturan por mensualidades conforme a las Cláusulas Especiales, que prevalecen sobre la " +
      "modalidad general de pago de la cláusula SÉPTIMA. El valor unitario corresponde al precio por " +
      "mes de servicio; el subtotal es el valor unitario multiplicado por el número de mensualidades. " +
      "La terminación anticipada extingue la obligación de prestar las mensualidades no devengadas, " +
      "sin derecho a devolución de las ya prestadas ni pagadas."
    );
  }
  if (punctualSvcs.some(s => {
    const sl = s.name.toLowerCase();
    return hitoKeys.some(k => sl.includes(k)) && (s.price || 0) >= 500000;
  })) {
    drawClauseParagraph(ctx, "Servicios con hitos propios: ",
      "Los servicios identificados como \"Hito 40/30/30\" en la columna Modalidad se pagan: " +
      "40% al inicio, 30% contra entrega en entorno de pruebas (staging), y 30% contra recepción " +
      "conforme final. Estos servicios no integran bloque alguno."
    );
  }
}

function drawClause5_ObligationsPrestador(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 4, "OBLIGACIONES DEL PRESTADOR");

  const items = [
    "Ejecutar los servicios con estándar profesional y la diligencia exigible conforme al Artículo 1547 del Código Civil (culpa leve).",
    "Cumplir los plazos y condiciones pactadas en el presente contrato, de conformidad con los Artículos 1545 y 1547 del Código Civil.",
    "Mantener informado al Cliente del estado de avance de los servicios y cualquier eventualidad que pudiera afectar su ejecución.",
    "Entregar los códigos fuentes, archivos editables y activos digitales producidos. Los avances parciales " +
    "se pondrán a disposición del Cliente en un entorno de pruebas (staging) o vista previa durante la " +
    "ejecución del proyecto para su revisión y aprobación progresiva. La entrega definitiva del código " +
    "fuente, archivos editables y activos finales de cada servicio se realizará al momento del pago íntegro " +
    "del honorario de ese servicio, conforme a la cláusula DÉCIMA PRIMERA, mediante repositorio privado " +
    "(GitHub/GitLab) y/o descarga directa, en formatos estándar de la industria " +
    "(código fuente editable, archivos de diseño vectoriales o editables según corresponda).",
    "Emitir boleta electrónica de honorarios por cada pago recibido, conforme al Artículo 88 del Código Tributario.",
    "No utilizar información del Cliente para fines distintos al objeto del contrato.",
  ];
  const letters = "abcdef".split("");
  for (let i = 0; i < items.length; i++) {
    drawClauseItem(ctx, letters[i], items[i]);
  }
}

function drawClause6_ObligationsClient(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 5, "OBLIGACIONES DEL CLIENTE");

  const items = [
    "Pagar los honorarios en la forma y plazo estipulados en la cláusula SÉPTIMA del presente contrato.",
    "Entregar oportunamente toda la información, accesos, credenciales y recursos necesarios para la ejecución de los servicios.",
    "Revisar los entregables dentro del plazo de revisión estipulado; el silencio del Cliente una vez vencido dicho plazo constituirá aprobación tácita.",
    "No exigir conductas que impliquen subordinación o dependencia laboral, respetando la independencia del Prestador.",
    "Designar una contraparte técnica para la coordinación y recepción de los servicios.",
    "Garantizar que los textos, imágenes, logotipos, marcas, bases de datos, videos y demás materiales " +
    "que entregue al Prestador para su incorporación a los entregables son de su propiedad o cuenta con " +
    "licencia suficiente para su uso y explotación en la forma prevista en el contrato. El Cliente mantendrá " +
    "indemne al Prestador frente a cualquier reclamo de terceros derivado de dichos materiales, obligación " +
    "que subsistirá por 3 años desde el término del contrato.",
  ];
  const letters = "abcdef".split("");
  for (let i = 0; i < items.length; i++) {
    drawClauseItem(ctx, letters[i], items[i]);
  }
}

function drawClause7_Payment(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 6, "HONORARIOS Y FORMA DE PAGO");

  // Recompute effective total igual que en CUARTA (monthly × duration)
  const activeServices = (data.services || []).filter(s => (s.price || 0) > 0);
  const monthlySvcs = activeServices.filter(s => s.is_monthly);
  const punctualSvcs = activeServices.filter(s => !s.is_monthly);
  const duration = data.durationMonths || 1;
  const monthlyTotal = monthlySvcs.reduce((sum, s) => sum + (s.price || 0) * duration, 0);
  const punctualTotal = punctualSvcs.reduce((sum, s) => sum + (s.price || 0), 0);
  const effectiveTotal = monthlyTotal + punctualTotal;
  const total = effectiveTotal.toLocaleString("es-CL");
  const retentionRate = "15,25%";

  drawClauseParagraph(ctx, "Monto: ",
    `El valor total de los servicios asciende a $${total} CLP (${total} pesos chilenos). El Prestador es persona natural que emite boleta de honorarios, por lo que estos servicios no están afectos a IVA a la fecha de suscripción, sin perjuicio de la cláusula de ajuste tributario de la presente cláusula. El valor corresponde al monto bruto de las boletas de honorarios; la retención legal se descuenta de dicho monto.`
  );

  // Jerarquía única de pago — 2 niveles (Opción A: sin numeral de devengo mensual)
  drawClauseParagraph(ctx, "Modalidad de pago: ",
    "Los servicios contratados se pagan conforme a la siguiente jerarquía, que las partes declaran " +
    "excluyente y ordenada:"
  );
  drawClauseItem(ctx, "1°",
    "Servicios con hitos propios. Aquellos servicios para los cuales el Anexo A establezca hitos de " +
    "pago específicos se pagarán exclusivamente conforme a dichos hitos, que sustituyen para ellos " +
    "toda otra modalidad prevista en esta cláusula. Estos servicios quedan excluidos del cálculo " +
    "de los pagos de bloque."
  );
  drawClauseItem(ctx, "2°",
    "Servicios agrupados en bloques. Los demás servicios se agrupan en los bloques indicados en el " +
    "Anexo A. Cada bloque se paga en un 50% al inicio de su ejecución y el 50% restante dentro de " +
    "los 5 días hábiles siguientes a la recepción conforme de la totalidad de los servicios que lo " +
    "integran. El valor de cada bloque es la suma de los servicios que lo componen, según se indica " +
    "en el Anexo A."
  );

  drawClauseParagraph(ctx, "Medio de pago: ",
    "Transferencia electrónica a la cuenta bancaria del Prestador que se indicará en la boleta de honorarios respectiva."
  );

  drawClauseText(ctx,
    `Boleta de honorarios: El Prestador emitirá boleta electrónica de honorarios por cada pago recibido, ` +
    `conforme al Artículo 88 del Código Tributario. El Cliente ha declarado ser contribuyente de Primera ` +
    `Categoría obligado por ley a llevar contabilidad completa (cláusula SEGUNDA, letra (d)), por lo que ` +
    `deberá enterar la retención del ${retentionRate} en el Servicio de Impuestos Internos (SII), ` +
    `de acuerdo con la tasa vigente a la fecha del presente contrato en virtud del calendario progresivo ` +
    `de la Ley N° 21.133. La retención aplicable será la tasa vigente a la fecha de emisión de cada boleta, dado que el calendario progresivo de la Ley N° 21.133 modifica la tasa anualmente (15,25% en 2026, 16% en 2027, 17% en 2028). Si el Cliente no estuviere obligado a llevar contabilidad completa al momento de la emisión de una boleta, el Prestador deberá enterar directamente el pago provisional.`
  );

  drawClauseParagraph(ctx, "Mora automática y reajuste: ",
    "El solo vencimiento del plazo de pago convenido constituirá al Cliente en mora, sin necesidad " +
    "de requerimiento judicial ni extrajudicial previo, conforme al Artículo 1551 N°1 del Código Civil. " +
    "Las partes pactan reajustabilidad de las obligaciones de dinero según la variación del Índice de " +
    "Precios al Consumidor (IPC) desde la fecha de exigibilidad hasta el pago efectivo."
  );

  drawClauseParagraph(ctx, "Cláusula penal por mora del Cliente (Art. 1535 CC): ",
    "En caso de mora en el pago de cualquier cuota u hito acordado, el Cliente pagará al Prestador, " +
    "a título de pena convencional, el interés máximo convencional para operaciones de crédito de dinero " +
    "reajustables en moneda nacional de 90 días o más, en el tramo que corresponda al monto adeudado, " +
    "que la Comisión para el Mercado Financiero (CMF) fije y publique conforme al Artículo 6° de la " +
    "Ley N°18.010, expresado en su equivalente mensual y aplicado por cada mes o fracción de atraso " +
    "sobre el saldo insoluto reajustado conforme al párrafo anterior, con un tope máximo del 15% de " +
    "dicho saldo. Si dejare de publicarse dicha tasa, se aplicará el interés corriente de la misma " +
    "categoría incrementado en un cincuenta por ciento. Se deja constancia que el reajuste IPC ya está " +
    "contemplado en el párrafo anterior y no se aplica duplicadamente sobre la pena. La pena convencional " +
    "reemplaza toda otra indemnización moratoria, sin perjuicio del cargo de cobranza del párrafo siguiente. " +
    "El Prestador podrá exigir simultáneamente el cumplimiento de la obligación principal y la pena, " +
    "conforme al inciso 2° del Artículo 1537 del Código Civil."
  );

  drawClauseParagraph(ctx, "Gastos de cobranza extrajudicial: ",
    "Adicionalmente y a título de daño emergente, transcurridos 15 días corridos desde la constitución " +
    "en mora sin pago, el Cliente pagará los gastos de gestión de cobranza extrajudicial, que las partes " +
    "avalúan anticipadamente en un 3% del saldo insoluto. Este cargo es independiente de la pena " +
    "moratoria del párrafo anterior y no está sujeto al tope del 15%."
  );

  drawClauseParagraph(ctx, "Cláusula penal por retraso en entrega de insumos: ",
    "Si el Cliente incurre en mora en la entrega de información, accesos o insumos necesarios para la " +
    "ejecución de los servicios, el plazo de entrega del Prestador se prorrogará automáticamente en igual " +
    "número de días hábiles al retraso del Cliente, sin que ello constituya incumplimiento del Prestador."
  );

  drawClauseParagraph(ctx, "Plazo de pago del saldo por servicio: ",
    "Se entenderá producida la recepción conforme de un servicio cuando hayan sido recibidos " +
    "conforme —expresa o tácitamente— todos los entregables que lo componen según el Anexo A, " +
    "o mediante acta de recepción del servicio completo suscrita por ambas partes. " +
    "La recepción conforme del servicio abre un plazo de 5 días hábiles para el pago del saldo " +
    "correspondiente a ese servicio. Vencido dicho plazo sin pago, el Cliente quedará constituido " +
    "en mora de pleno derecho, sin necesidad de requerimiento previo."
  );

  drawClauseParagraph(ctx, "Suspensión por mora: ",
    "El Prestador podrá suspender la prestación de los servicios mientras el Cliente se encuentre " +
    "en mora en el pago de cualquier cuota u honorario exigible, sin que dicha suspensión constituya " +
    "incumplimiento del Prestador ni le haga perder el derecho a los honorarios devengados. La " +
    "suspensión se fundamenta en la excepción de contrato no cumplido del Artículo 1552 del Código " +
    "Civil. El Prestador notificará la suspensión por escrito al correo de notificaciones del Cliente, " +
    "con al menos 48 horas de anticipación. El plazo de entrega del Prestador se prorrogará " +
    "automáticamente por el mismo número de días hábiles que dure la suspensión."
  );

  drawClauseParagraph(ctx, "Custodia de entornos no pagados: ",
    "Transcurridos 90 días corridos desde que el Cliente se constituya en mora respecto del pago " +
    "de cualquier servicio sin que se haya regularizado el pago, el Prestador, previo aviso escrito " +
    "de 10 días hábiles al correo de notificaciones del Cliente, podrá dar de baja los entornos de " +
    "staging y eliminar los entregables no pagados, sin responsabilidad para el Prestador."
  );

  drawClauseParagraph(ctx, "Impuestos — cláusula de ajuste tributario (gross-up): ",
    "Los honorarios pactados en la cláusula CUARTA se entienden netos de todo impuesto indirecto. " +
    "El Prestador declara ser persona natural que emite boleta de honorarios, prestación exenta de IVA " +
    "conforme al Artículo 12 letra E N°8 del D.L. N°825 en relación con el Artículo 42 N°2 de la LIR. " +
    "No obstante, si por resolución de autoridad competente, cambio normativo o reclasificación de la " +
    "actividad del Prestador —salvo que dicha reclasificación derive exclusivamente de un cambio " +
    "voluntario de estructura societaria del Prestador adoptado con posterioridad a la firma— se " +
    "determinare que alguno o todos los servicios se encuentran afectos a Impuesto al Valor Agregado " +
    "(IVA) u otro impuesto indirecto, el Cliente pagará dicho tributo adicionalmente al honorario pactado, " +
    "tanto respecto de los pagos pendientes como de los ya enterados. El Prestador emitirá la " +
    "documentación tributaria que proceda dentro de los plazos legales, y el Cliente pagará el " +
    "tributo dentro de los 10 días hábiles siguientes a la recepción de dicho documento. El Prestador " +
    "se obliga a informar al Cliente, con la mayor anticipación posible, cualquier cambio en su " +
    "situación tributaria que pueda afectar esta cláusula."
  );
}

function drawClause8_Term(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 7, "PLAZO, VIGENCIA Y TÉRMINO");

  const startDate = data.startDate || "—";
  const endDate = data.endDate || "—";

  // B4: entrada en vigor unificada — funciona con o sin bloques
  const hasBlocks = (data.services || []).some(s => (s.price || 0) > 0 && !s.is_monthly);
  const entradaVigorText = hasBlocks
    ? `El presente contrato se perfecciona con su suscripción por ambas partes. La ejecución de los ` +
      `servicios y el cómputo de la vigencia de ${data.durationMonths || 1} mes(es) comenzarán con el ` +
      `pago inicial del primer bloque de servicios cuya ejecución las partes acuerden iniciar, o, si el ` +
      `contrato no comprendiere bloques, con el primer pago inicial que corresponda conforme a la jerarquía ` +
      `de la cláusula SÉPTIMA. Dicho pago deberá enterarse dentro de los 5 días hábiles siguientes a la ` +
      `suscripción. El plazo de ${data.durationMonths || 1} mes(es) se contará desde la fecha efectiva de ` +
      `ese primer pago. La falta de pago inicial dentro de dicho plazo facultará al Prestador, a su elección, ` +
      `para exigir el cumplimiento forzado o para resolver el contrato de pleno derecho, sin necesidad de ` +
      `declaración judicial, previa comunicación escrita al correo de notificaciones del Cliente, produciendo ` +
      `efectos desde su envío —no obstante lo dispuesto en la cláusula DÉCIMA OCTAVA—, en ambos casos con ` +
      `derecho a indemnización de perjuicios.`
    : `El presente contrato se perfecciona con su suscripción por ambas partes. La ejecución de los ` +
      `servicios y el cómputo de la vigencia de ${data.durationMonths || 1} mes(es) comenzarán con el ` +
      `primer pago que corresponda conforme a la jerarquía de la cláusula SÉPTIMA. Dicho pago deberá ` +
      `enterarse dentro de los 5 días hábiles siguientes a la suscripción. El plazo de ` +
      `${data.durationMonths || 1} mes(es) se contará desde la fecha efectiva de ese primer pago. ` +
      `La falta de pago dentro de dicho plazo facultará al Prestador, a su elección, para exigir el ` +
      `cumplimiento forzado o para resolver el contrato de pleno derecho, sin necesidad de declaración ` +
      `judicial, previa comunicación escrita al correo de notificaciones del Cliente, en ambos casos con ` +
      `derecho a indemnización de perjuicios.`;
  drawClauseParagraph(ctx, "Perfeccionamiento y entrada en vigor: ", entradaVigorText);

  drawClauseParagraph(ctx, "Término anticipado: ",
    "El contrato podrá terminar anticipadamente por: (a) mutuo acuerdo por escrito entre las partes; " +
    "(b) incumplimiento grave de cualquiera de las partes, aplicándose la condición resolutoria tácita del " +
    "Artículo 1489 del Código Civil; (c) caso fortuito o fuerza mayor; (d) aviso escrito de cualquiera de " +
    "las partes con al menos 30 días de anticipación. Durante los primeros 45 días corridos contados " +
    "desde la entrada en vigor, el desistimiento unilateral del Cliente conforme a la letra (d) no " +
    "producirá efecto. Vencido ese período, el aviso de 30 días comenzará a correr."
  );

  drawClauseParagraph(ctx, "Cascada de liquidación por desistimiento del Cliente: ",
    "Si el Cliente ejerce la facultad de la letra (d) una vez vencido el período de 45 días, " +
    "la liquidación se regirá por la siguiente cascada, en el orden que se indica, la que " +
    "constituye avaluación anticipada de perjuicios conforme al Artículo 1999 inciso 2° en " +
    "relación con el Artículo 2006 del Código Civil y no acumula con otras indemnizaciones, " +
    "salvo el daño emergente directo por costos ya incurridos: " +
    "(1º) el Cliente pagará el saldo del valor de los servicios efectivamente ejecutados y " +
    "recibidos conforme a la fecha de término, menos los pagos iniciales ya enterados por " +
    "dichos servicios; (2º) los pagos iniciales ya recibidos por servicios no ejecutados o " +
    "no recibidos conforme se imputarán a los perjuicios del Prestador por reserva de " +
    "capacidad y costos incurridos; (3º) el Cliente pagará una indemnización adicional " +
    "equivalente a: (i) el 50% del valor de los servicios cuya ejecución se hubiere iniciado " +
    "y no concluido a la fecha de término; y (ii) el 15% del valor de los servicios cuya " +
    "ejecución no se hubiere iniciado. Se entenderá iniciado un servicio desde que el " +
    "Prestador haya realizado la sesión de levantamiento, o entregado el primer avance en " +
    "entorno de pruebas, o solicitado por escrito los insumos necesarios para su ejecución; " +
    "(4º) adicionalmente, y sin perjuicio de los porcentajes anteriores, el Prestador podrá " +
    "cobrar el daño emergente directo acreditado —gastos en infraestructura, subcontratistas " +
    "o licencias ya pagados con motivo de los servicios abandonados— hasta un máximo del " +
    "honorario del servicio respectivo, o del costo efectivamente documentado si este fuere superior " +
    "y hubiere sido informado por escrito al Cliente antes de incurrirse en él; (5º) practicadas las imputaciones anteriores, si " +
    "resultare un remanente a favor del Cliente, el Prestador se lo restituirá dentro de los " +
    "15 días hábiles siguientes. Si resultare un saldo a favor del Prestador, será exigible " +
    "en el mismo plazo, con aplicación de la cláusula penal por mora de la cláusula SÉPTIMA. " +
    "Las partes declaran que esta cascada completa constituye una avaluación anticipada y " +
    "razonable de perjuicios, y que ninguna de sus partidas tiene carácter de cláusula penal " +
    "autónoma sino que todas integran un régimen indemnizatorio unitario y equilibrado. " +
    "Las partes dejan expresa constancia de que las sumas pactadas en la presente cascada son " +
    "inferiores a la indemnización que correspondería al Prestador conforme al Artículo 1999 inciso " +
    "2° en relación con el Artículo 2006 del Código Civil, disposiciones que le reconocen el derecho " +
    "a los costos incurridos, al valor del trabajo hecho y a lo que hubiere podido ganar en la obra. " +
    "En consecuencia, esta avaluación es moderada y no acumulable con otras indemnizaciones por lucro " +
    "cesante o daño moratorio, sin perjuicio del daño emergente previsto en el numeral 4º."
  );

  drawClauseParagraph(ctx, "Efectos del término: ",
    "Al término del contrato por cualquier causa, el Prestador entregará los avances y activos " +
    "parciales producidos de los servicios no concluidos, y devolverá toda la información " +
    "confidencial del Cliente en su poder, salvo aquella que deba conservar por obligación " +
    "legal o tributaria, y salvo los accesos que subsistan conforme a la cláusula de supervivencia. " +
    "Respecto de los servicios no concluidos, si las partes no logran acuerdo sobre el porcentaje " +
    "de avance, dicho desacuerdo se resolverá mediante informe de un perito técnico independiente " +
    "de reconocida competencia en la materia específica objeto de la discrepancia, designado de " +
    "común acuerdo dentro de 10 días hábiles. A falta de acuerdo, la designación la efectuará " +
    "el Centro de Arbitraje y Mediación de la Cámara de Comercio de Santiago (CAM Santiago), " +
    "a solicitud de cualquiera de las partes, mediante procedimiento simplificado. El informe " +
    "del perito será vinculante para las partes y se evacuará en un plazo máximo de 15 días " +
    "corridos. Sus costos se pagarán por mitades, salvo que el informe acoja íntegramente la " +
    "posición de una de las partes, caso en el cual los soportará la otra. Esta peritación " +
    "técnica es independiente y no condiciona ni suspende las acciones de cobro de honorarios " +
    "ya exigibles."
  );

  drawClauseParagraph(ctx, "Divisibilidad: ",
    "Cuando el presente contrato comprenda dos o más servicios independientes, el incumplimiento " +
    "relativo a uno de ellos no afectará la vigencia ni la exigibilidad de los demás, salvo que " +
    "las partes acuerden expresamente lo contrario por escrito. La condición resolutoria del " +
    "Artículo 1489 del Código Civil operará de forma parcial, circunscrita al servicio incumplido."
  );
}

function drawClause9_Deliverables(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 8, "ENTREGABLES Y RECEPCIÓN");

  const revisionDays = data.revisionDays || 5;

  drawClauseText(ctx,
    "El Prestador entregará los productos y activos digitales conforme a las especificaciones acordadas. " +
    "El Cliente dispondrá de un plazo de " + revisionDays + " días hábiles para revisar cada entregable " +
    "y formular observaciones por escrito."
  );

  drawClauseText(ctx,
    "Se incluye dentro del valor contratado una ronda de correcciones menores por defecto. " +
    "El número de rondas de revisión específico para cada servicio —que podrá ser superior a una— " +
    "se detalla en el Anexo A, que prevalece sobre esta cláusula general en virtud del principio " +
    "de especialidad. A falta de mención expresa en el Anexo A, cada servicio incluye una (1) ronda " +
    "de correcciones menores. Las revisiones o cambios que excedan las rondas estipuladas en el Anexo A " +
    "se considerarán modificaciones sustanciales y se regirán por la cláusula DÉCIMA CUARTA " +
    "(Modificaciones) y estarán sujetas a cotización adicional."
  );

  drawClauseParagraph(ctx, "Aprobación tácita: ",
    "Si el Cliente no formula observaciones dentro del plazo de " + revisionDays + " días hábiles, " +
    "se entenderá que el entregable ha sido recibido conforme y aprobado en todas sus partes. " +
    "Cuando el Prestador notifique más de 3 entregables de forma simultánea (en una misma " +
    "comunicación), el plazo de revisión se extenderá automáticamente a 10 días hábiles para " +
    "todos ellos, a fin de garantizar al Cliente tiempo suficiente de revisión."
  );

  drawClauseParagraph(ctx, "Recomendación: ",
    "Las partes podrán suscribir un acta de recepción conforme para cada hito o entregable significativo."
  );
}

function drawClause10_Independence(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 9, "INDEPENDENCIA DEL PRESTADOR");

  drawClauseText(ctx,
    "Las partes reconocen expresamente que el Prestador actúa como contratista independiente, " +
    "en los términos de los Artículos 2006 al 2012 del Código Civil, y que NO existe entre ellas " +
    "relación laboral alguna regulada por el Código del Trabajo."
  );

  const independenceItems = [
    "El Prestador organiza libremente sus métodos, horarios y lugar de trabajo.",
    "El Prestador puede prestar servicios a terceros simultáneamente durante la vigencia del contrato.",
    "El Prestador asume el riesgo económico de su actividad, incluyendo el pago de sus cotizaciones previsionales y obligaciones tributarias.",
    "El Cliente no podrá exigir al Prestador el cumplimiento de jornada laboral, horario fijo, ni conductas propias de un vínculo de subordinación y dependencia.",
    "El Prestador es responsable del pago de sus obligaciones tributarias y previsionales conforme a la Ley N° 21.133.",
  ];
  const letters = "abcde".split("");
  for (let i = 0; i < independenceItems.length; i++) {
    drawClauseItem(ctx, letters[i], independenceItems[i]);
  }
}

function drawClause11_IntellectualProperty(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 10, "PROPIEDAD INTELECTUAL");

  // ── Layer 1: Software — cesión directa vía Art. 8 inc. 3° Ley 17.336 ──
  drawClauseParagraph(ctx, "A. Programas computacionales (software): ",
    "Respecto de los programas computacionales —incluyendo códigos fuentes, aplicaciones web, APIs, " +
    "backend, automatizaciones, bots, scrapers, scripts, integraciones y similar— creados en virtud " +
    "del presente contrato, se aplica lo dispuesto en el Artículo 8 inciso 3° de la Ley N° 17.336, " +
    "reputándose cedidos al Cliente los derechos patrimoniales sobre dichos programas desde el pago " +
    "íntegro del honorario del servicio respectivo. La retención de derechos hasta el pago total " +
    "constituye la estipulación escrita en contrario a que se refiere dicha norma."
  );

  // ── Layer 2: Obras no-software — licencia exclusiva (sostenida por sí sola) ──
  drawClauseParagraph(ctx, "B. Demás obras (diseño, contenidos, identidad visual): ",
    "Respecto de las demás obras creadas en virtud del presente contrato —incluyendo diseños UI/UX, " +
    "identidad visual, manual de marca, logotipos, contenidos, textos, copywriting, gráficas para " +
    "redes sociales, fotografías y cualquier otra obra no comprendida en la letra A anterior— el " +
    "Prestador concede al Cliente una licencia exclusiva —sin perjuicio de la facultad de portafolio " +
    "de la presente cláusula—, irrevocable, mundial, perpetua, gratuita y transferible, con todas " +
    "las facultades de explotación reconocidas por la Ley N° 17.336, que operará desde el pago " +
    "íntegro del honorario del servicio respectivo. Las partes se comprometen a suscribir, " +
    "a requerimiento escrito de cualquiera de ellas y dentro de los 30 días hábiles siguientes, la " +
    "cesión formal de derechos sobre estas obras ante notario, siendo los costos notariales y de " +
    "registro de exclusivo cargo del Cliente. Mientras no se complete el pago del servicio respectivo, " +
    "el Cliente no adquiere derecho alguno sobre estas obras y cualquier uso previo se considerará " +
    "licencia precaria y revocable, limitada a fines de revisión y prueba, sin derecho a explotación " +
    "comercial, publicación ni modificación."
  );

  // ── Condición suspensiva común (pago) ──
  drawClauseParagraph(ctx, "Condición suspensiva común: ",
    "Tanto la cesión de la letra A como la licencia de la letra B están sujetas a la condición " +
    "suspensiva del pago íntegro del honorario del servicio respectivo. Mientras no se complete " +
    "dicho pago, el Cliente no adquiere los derechos patrimoniales ni la licencia sobre las obras " +
    "correspondientes. Cuando el contrato comprenda servicios independientes, la cesión o licencia " +
    "de cada servicio operará de forma independiente contra el pago íntegro de ese servicio en " +
    "particular, de forma consistente con la divisibilidad pactada en la cláusula OCTAVA."
  );

  // ── Secuencia de entrega y pago ──
  drawClauseParagraph(ctx, "Secuencia de entrega y pago: ",
    "A fin de evitar un bloqueo entre entrega y pago, las partes acuerdan la siguiente secuencia: " +
    "(i) el Prestador notifica la disponibilidad del entregable en entorno de pruebas (staging); " +
    "(ii) el Cliente dispone del plazo de revisión estipulado para formular observaciones escritas o, " +
    "vencido dicho plazo sin observaciones, el entregable se entiende recibido conforme (aprobación tácita); " +
    "(iii) la recepción conforme —expresa o tácita— gatilla la exigibilidad del pago del saldo; " +
    "(iv) dentro de los 3 días hábiles siguientes al pago total de ese servicio, el Prestador entrega el " +
    "repositorio de código fuente, credenciales de administración y activa el paso a producción. " +
    "Tratándose de sitios web, sistemas o plataformas, el paso a producción, la activación de " +
    "herramientas de indexación y posicionamiento (incluyendo Google Search Console, datos estructurados " +
    "y SEO que requieran el sitio publicado) se producirán únicamente contra el pago total. " +
    "Hasta ese momento, los sistemas permanecerán en staging o acceso restringido, sin uso productivo ni indexación."
  );

  // ── Derechos morales ──
  drawClauseParagraph(ctx, "Derechos morales: ",
    "El Prestador conserva los derechos morales sobre las obras creadas, incluyendo el derecho " +
    "de paternidad e integridad de la obra, conforme al Artículo 14 de la Ley N° 17.336."
  );

  // ── Portafolio — carve-out expreso frente a confidencialidad ──
  drawClauseParagraph(ctx, "Portafolio (carve-out de confidencialidad): ",
    "El Prestador podrá utilizar los trabajos realizados en virtud del presente contrato en su " +
    "portafolio profesional, incluyendo la publicación en su sitio web, redes sociales y plataformas " +
    "de portafolio, salvo que las partes acuerden expresamente lo contrario por escrito. Esta " +
    "autorización prevalece sobre la obligación de confidencialidad de la cláusula DÉCIMA SEGUNDA " +
    "respecto de los aspectos visuales, públicos y descriptivos del trabajo, sin perjuicio de que " +
    "el Prestador no revelará información financiera, técnica reservada, credenciales ni datos " +
    "personales de clientes del Cliente. En caso de trabajos que contengan información del Cliente " +
    "no pública, el Prestador someterá la pieza de portafolio a revisión previa del Cliente, que no " +
    "podrá denegarla injustificadamente."
  );

  // ── Componentes de terceros ──
  drawClauseParagraph(ctx, "Componentes de terceros y open source: ",
    "La cesión y licencia de derechos patrimoniales recae exclusivamente sobre el código, diseños " +
    "y activos originales producidos por el Prestador. Los componentes de terceros, librerías y " +
    "frameworks de código abierto incorporados en los entregables se entregan bajo sus respectivas " +
    "licencias originales (MIT, Apache, GPL u otras), que el Prestador identificará en la " +
    "documentación técnica. El Cliente acepta quedar sujeto a dichas licencias en cuanto al uso " +
    "de esos componentes."
  );

  // ── IA generativa ──
  drawClauseParagraph(ctx,     "Uso de herramientas de IA generativa: ",
    "El Prestador podrá utilizar herramientas de inteligencia artificial generativa como apoyo en " +
    "la producción de entregables. El Prestador garantiza que los outputs generados por IA que " +
    "sean incorporados a las obras serán revisados, adaptados y validados por él, y que el " +
    "resultado final cuenta con contribución creativa humana suficiente para cumplir con los " +
    "entregables contratados. El Prestador asume la responsabilidad profesional por el resultado " +
    "final y declara que, a su leal saber y entender, las obras entregadas no infringen derechos " +
    "de propiedad intelectual de terceros. Esta declaración queda sujeta al límite de " +
    "responsabilidad de la cláusula DÉCIMA SEXTA. Queda expresamente prohibido al Prestador " +
    "enviar, procesar o transmitir datos personales del Cliente o de sus clientes a herramientas " +
    "de inteligencia artificial de terceros sin autorización escrita previa del Cliente, ni " +
    "utilizar dichos datos para entrenamiento de modelos."
  );

  // ── Titularidad de dominio y cuentas ──
  drawClauseParagraph(ctx, "Titularidad de dominio y cuentas digitales: ",
    "El nombre de dominio se registrará directamente a nombre y en la cuenta del Cliente, sin que el " +
    "Prestador adquiera ni retenga titularidad sobre él. Las cuentas de plataforma (Google Ads, Google " +
    "Analytics, Google Search Console, Google Business Profile, Meta Business Manager y similares) " +
    "serán titularidad del Cliente desde el momento de su creación o transferencia. El Prestador " +
    "operará dichas cuentas en calidad de gestor autorizado (administrador), sin adquirir titularidad. " +
    "Las credenciales de administración de los entornos, sistemas y código desarrollados por el " +
    "Prestador se entregarán conforme a la secuencia de la presente cláusula, que recae exclusivamente " +
    "sobre el código y los entornos propios del Prestador, no sobre el dominio ni las cuentas de " +
    "plataforma del Cliente. Al término del contrato, el Prestador transferirá los accesos de " +
    "administrador al Cliente y se removerá como usuario dentro de los 5 días hábiles siguientes, " +
    "salvo respecto de los accesos estrictamente necesarios para prestar el soporte y la garantía que " +
    "subsistan según la cláusula de supervivencia, cuya remoción operará al vencimiento de dichos plazos."
  );
}

function drawClause12_Confidentiality(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 11, "CONFIDENCIALIDAD");

  drawClauseText(ctx,
    "Se considera Información Confidencial toda aquella información comercial, técnica, financiera, " +
    "de cliente o de cualquier otra naturaleza que una de las partes (la \"Parte Revelante\") comunique " +
    "a la otra (la \"Parte Receptora\") en el marco del presente contrato."
  );

  const confItems = [
    "La Parte Receptora se obliga a mantener la más estricta reserva y confidencialidad sobre la Información Confidencial.",
    "La obligación de confidencialidad se mantendrá vigente durante el plazo del contrato y por 3 años adicionales después de su término.",
    "La Información Confidencial solo podrá ser utilizada para los fines del presente contrato.",
    "No constituye Información Confidencial: (a) la que sea o llegue a ser de dominio público sin infracción de la Parte Receptora; (b) la requerida por orden judicial o autoridad competente.",
    "Al término del contrato, la Parte Receptora deberá devolver o destruir toda la Información Confidencial recibida, salvo (i) aquella que deba conservar por obligación legal o tributaria; (ii) los accesos que subsistan conforme a la cláusula de supervivencia para prestar soporte y garantía; y (iii) la información que el Prestador requiera conservar para acreditar la ejecución del contrato ante terceros o autoridades, plazo durante el cual mantendrá la reserva.",
  ];
  const letters = "abcde".split("");
  for (let i = 0; i < confItems.length; i++) {
    drawClauseItem(ctx, letters[i], confItems[i]);
  }
}

function drawClause13_DataProtection(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 12, "PROTECCIÓN DE DATOS PERSONALES");

  drawClauseText(ctx,
    "Ambas partes se obligan al cumplimiento de la Ley N° 19.628 sobre Protección de la Vida Privada, " +
    "en su versión reformada por la Ley N° 21.719 (publicada el 13 de diciembre de 2024, plena vigencia " +
    "desde el 1 de diciembre de 2026). Las partes se adelantan voluntariamente al estándar que regirá " +
    "desde esa fecha y se obligan a suscribir un anexo de encargo de tratamiento (DPA) conforme a los " +
    "requisitos del Artículo 15 bis de la Ley N° 21.719 —que a la fecha del presente contrato aún no " +
    "está en plena vigencia— dentro de los 15 días hábiles siguientes a la entrada en vigor del " +
    "presente contrato. Esta anticipación voluntaria no crea obligaciones legales distintas de las que " +
    "corresponden bajo la Ley N° 19.628 vigente a la fecha de suscripción."
  );

  const dpItems = [
    "Los datos personales a los que tenga acceso el Prestador serán utilizados exclusivamente para la ejecución del objeto del contrato.",
    "El Prestador adoptará las medidas de seguridad técnicas y organizativas necesarias para proteger los datos personales contra acceso no autorizado, pérdida o destrucción.",
    "El Prestador notificará al Cliente cualquier incidente de seguridad que involucre datos personales en un plazo máximo de 72 horas desde que tome conocimiento del mismo. Las partes adoptan este plazo como obligación contractual entre ellas, independientemente del plazo que establezca la normativa de protección de datos vigente a la fecha de cada incidente.",
    "Cuando el Prestador acceda a bases de datos o contactos del Cliente (por ejemplo, en integraciones CRM), actuará como encargado de tratamiento: tratará los datos exclusivamente bajo instrucciones del Cliente, no los utilizará para fines propios ni los comunicará a terceros sin autorización, y al término del contrato los devolverá o eliminará, salvo obligación legal de conservación.",
    "El Prestador deberá informar al Cliente la identidad de sus subencargados de tratamiento (proveedores de hosting, CRM en la nube, servicios de OCR, plataformas de email y cualquier otro tercero que trate datos personales del Cliente o de sus clientes) y obtener autorización previa del Cliente antes de incorporar nuevos subencargados. El Prestador responde solidariamente por el cumplimiento de estos subencargados, sin poder eximirse alegando que delegó el tratamiento.",
    "Queda expresamente prohibido al Prestador enviar, procesar o transmitir datos personales del Cliente o de sus clientes a herramientas de inteligencia artificial de terceros sin autorización escrita previa del Cliente, ni utilizar dichos datos para entrenamiento de modelos de IA.",
  ];
  const letters = "abcdef".split("");
  for (let i = 0; i < dpItems.length; i++) {
    drawClauseItem(ctx, letters[i], dpItems[i]);
  }
}

function drawClause14_Modifications(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 13, "MODIFICACIONES");

  drawClauseText(ctx,
    "Cualquier cambio, adición o modificación al alcance de los servicios contratados deberá ser " +
    "solicitada por escrito por el Cliente (el correo electrónico será suficiente)."
  );

  drawClauseText(ctx,
    "El Prestador evaluará la solicitud y proporcionará una cotización adicional por los servicios " +
    "no contemplados en el alcance original. El Prestador no estará obligado a ejecutar modificación " +
    "alguna sin la aprobación previa y por escrito del Cliente respecto de la cotización adicional."
  );

  drawClauseParagraph(ctx, "Efecto: ",
    "Las modificaciones debidamente aprobadas modificarán el objeto del contrato en los términos acordados " +
    "por las partes, rigiéndose por el Artículo 1545 del Código Civil (fuerza obligatoria del contrato)."
  );
}

function drawClause15_Subcontracting(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 14, "SUBCONTRATACIÓN");

  const allowed = data.subcontractingAllowed !== false;

  if (allowed) {
    drawClauseText(ctx,
      "El Prestador podrá subcontratar parcialmente la ejecución de los servicios, previa autorización " +
      "por escrito del Cliente, la que no podrá denegarse injustificadamente."
    );
    drawClauseText(ctx,
      "El Prestador responderá íntegramente ante el Cliente por los actos u omisiones de sus subcontratistas, " +
      "y velará porque estos cumplan con las mismas obligaciones de confidencialidad, propiedad intelectual " +
      "y protección de datos establecidas en el presente contrato."
    );
  } else {
    drawClauseText(ctx,
      "El Prestador no podrá subcontratar total ni parcialmente la ejecución de los servicios " +
      "sin autorización expresa y por escrito del Cliente."
    );
  }
}

function drawClause16_Warranty(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 15, "GARANTÍA Y RESPONSABILIDAD");

  const warrantyDays = data.warrantyDays || 15;

  drawClauseParagraph(ctx, "Distinción garantía / soporte: ",
    "Para todos los efectos del presente contrato, soporte y garantía son obligaciones distintas: " +
    "el soporte comprende asistencia y ajustes menores durante el plazo indicado en el Anexo A, y " +
    "la garantía comprende la corrección sin costo de los defectos definidos en la presente cláusula. " +
    "A falta de plazo expresamente indicado en el Anexo A, tanto la garantía como el soporte se " +
    `entienden pactados por ${warrantyDays} días corridos, sin que expresión alguna del Anexo A ` +
    "relativa a soporte \"continuo\", \"durante toda la campaña\" o \"prioritario\" pueda interpretarse " +
    "como obligación de duración indefinida."
  );

  drawClauseParagraph(ctx, "Período de garantía: ",
    `El plazo de garantía para cada servicio es el indicado expresamente en el Anexo A bajo la etiqueta ` +
    `"Garantía:". A falta de mención expresa, el plazo es de ${warrantyDays} días corridos. Para los ` +
    `entregables que no requieran puesta en producción, el plazo se cuenta desde la recepción conforme. ` +
    `Para los servicios que requieran puesta en producción (sitios web, sistemas, plataformas y similares), ` +
    `el plazo se cuenta desde la fecha efectiva de puesta en producción. El período de garantía define ` +
    `el alcance de las correcciones sin costo y no altera los plazos de prescripción legal de las acciones ` +
    `de las partes.`
  );

  drawClauseParagraph(ctx, "Cobertura: ",
    "La garantía cubre defectos de implementación, errores de programación y no conformidad con las " +
    "especificaciones acordadas."
  );

  drawClauseParagraph(ctx, "Exclusiones: ",
    "No están cubiertos por la garantía: (a) modificaciones realizadas por el Cliente o terceros sin " +
    "autorización del Prestador; (b) cambios de requerimiento posteriores a la entrega; (c) problemas " +
    "derivados de la infraestructura tecnológica del Cliente o de terceros."
  );

  drawClauseParagraph(ctx, "Límite de responsabilidad: ",
    "La responsabilidad del Prestador respecto de cada servicio se limita a los honorarios " +
    "efectivamente pagados por ese servicio. La responsabilidad agregada por el contrato se limita " +
    "al total efectivamente pagado. Se excluyen expresamente los daños indirectos y el lucro cesante. " +
    "El daño emergente directo queda sujeto al tope anterior. En caso de dolo o culpa grave del " +
    "Prestador (Artículo 44 del Código Civil), no serán aplicables ni las exclusiones ni el límite " +
    "establecidos en esta cláusula, rigiéndose la responsabilidad por las reglas generales."
  );
}

function drawClause17_ForceMajeure(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 16, "FUERZA MAYOR");

  drawClauseText(ctx,
    "Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando dicho " +
    "incumplimiento se deba a caso fortuito o fuerza mayor, conforme al Artículo 45 del Código Civil."
  );

  const fmItems = [
    "Se considerarán causales de fuerza mayor: desastres naturales, guerra, pandemia, atentados terroristas, huelgas generales, corte generalizado y prolongado de servicios esenciales que afecte a la región y exceda las medidas de contingencia razonables del Prestador (respaldo de energía y conectividad alternativa), y cualquier otro evento imprevisible, irresistible e inevitable.",
    "La parte afectada deberá notificar a la otra dentro de los 5 días hábiles siguientes al momento en que tomó conocimiento del evento.",
    "Las obligaciones de las partes quedarán suspendidas durante la vigencia de la causal de fuerza mayor, reanudándose una vez que esta cese.",
  ];
  const letters = "abc".split("");
  for (let i = 0; i < fmItems.length; i++) {
    drawClauseItem(ctx, letters[i], fmItems[i]);
  }
}

function drawClause18_Jurisdiction(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 17, "NOTIFICACIONES, JURISDICCIÓN Y LEGISLACIÓN APLICABLE");

  const prestadorNotifEmail = data.prestadorNotifEmail || "contacto@mtsprz.org";
  const clientNotifEmail = data.clientNotifEmail || data.clientEmail;

  drawClauseParagraph(ctx, "Notificaciones: ",
    "Toda comunicación, notificación o requerimiento entre las partes que deba constar por escrito para " +
    "efectos del presente contrato se efectuará a los siguientes correos electrónicos, los que las partes " +
    "reconocen como válidos y suficientes para producir efectos legales entre ellas:"
  );
  drawClauseText(ctx,
    `Prestador: ${prestadorNotifEmail} | Cliente: ${clientNotifEmail}`
  );
  drawClauseText(ctx,
    "Se entenderá recibida la comunicación al día hábil siguiente al de su envío, salvo acuse de recibo " +
    "anterior. El cambio de correo electrónico válido deberá notificarse a la contraparte con al menos " +
    "5 días hábiles de anticipación mediante comunicación expresa. Los correos electrónicos indicados " +
    "en la presente cláusula son los únicos válidos para producir efectos legales y prevalecen sobre " +
    "cualquier otra dirección de correo que se indique en otras cláusulas del presente contrato o " +
    "en sus anexos."
  );

  drawClauseText(ctx,
    "El presente contrato se rige por las leyes de la República de Chile. Las partes fijan su domicilio " +
    "en la ciudad de " + (data.jurisdiction || "Puerto Varas") + ", Región de Los Lagos, Chile, y se someten " +
    "a la competencia de sus tribunales ordinarios de justicia. La presente prórroga de competencia " +
    "es válida conforme al Artículo 181 del Código Orgánico de Tribunales."
  );

  drawClauseParagraph(ctx, "Firma electrónica: ",
    "Las partes reconocen que la firma electrónica simple utilizada para suscribir el presente contrato " +
    "produce efectos jurídicos y es válida entre las partes conforme a la Ley N° 19.799 sobre Documentos " +
    "Electrónicos, Firma Electrónica y Servicios de Certificación. La firma electrónica simple no cuenta " +
    "con la presunción de integridad y autoría de la firma electrónica avanzada (certificada), por lo que " +
    "su valor probatorio será apreciado por el tribunal de acuerdo con las reglas generales."
  );

  drawClauseParagraph(ctx, "Integridad del contrato: ",
    "El presente instrumento, junto con el Anexo A y cualquier anexo adicional suscrito por las " +
    "partes, constituye el acuerdo completo entre ellas respecto del objeto contratado y sustituye " +
    "toda negociación, oferta o acuerdo previo, sea verbal o escrito. Si alguna cláusula fuese " +
    "declarada nula o ineficaz, las restantes conservarán plena validez (severabilidad)."
  );
}

function drawClause20_Survival(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 18, "OBLIGACIONES QUE SUBSISTEN AL TÉRMINO DEL CONTRATO");

  drawClauseText(ctx,
    "Las siguientes obligaciones subsistirán al término o resolución del contrato por cualquier " +
    "causa: (a) confidencialidad, por el plazo pactado en la cláusula DÉCIMA SEGUNDA; " +
    "(b) garantía y soporte post-entrega, por el plazo indicado en cada entregable del Anexo A; " +
    "(c) obligaciones de protección de datos personales de la cláusula DÉCIMA TERCERA, hasta la " +
    "devolución o eliminación de los datos; (d) licencia y cesión de derechos patrimoniales, una vez " +
    "pagados los honorarios del servicio respectivo conforme a la cláusula DÉCIMA PRIMERA; " +
    "(e) titularidad de dominio, cuentas publicitarias y credenciales de plataformas conforme a lo " +
    "pactado en la cláusula DÉCIMA PRIMERA; (f) los efectos de la liquidación por desistimiento " +
    "conforme a la cláusula OCTAVA; (g) obligaciones de pago de honorarios devengados y no pagados; " +
    "(h) las cláusulas de solución de controversias y jurisdicción; (i) las obligaciones tributarias " +
    "y de conservación de documentos que la ley imponga a las partes."
  );
}

function drawClause21_Assignment(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 19, "CESIÓN DEL CONTRATO");

  drawClauseText(ctx,
    "Ninguna de las partes podrá ceder su posición contractual, ni los derechos u obligaciones " +
    "que de ella emanan, sin el consentimiento previo y por escrito de la otra parte."
  );
  drawClauseText(ctx,
    "El Cliente podrá ceder su posición contractual a una sociedad continuadora, matriz, filial " +
    "o relacionada, bastando aviso escrito con 10 días hábiles de anticipación. En tal caso, " +
    "el Cliente cedente permanecerá solidariamente obligado al pago de los honorarios devengados " +
    "y no pagados a la fecha de la cesión."
  );
  drawClauseText(ctx,
    "El Prestador podrá ceder los créditos por honorarios devengados sin necesidad de " +
    "consentimiento del Cliente, bastando notificación escrita al correo de notificaciones del Cliente " +
    "indicado en la cláusula DÉCIMA OCTAVA, que las partes aceptan expresamente como suficiente " +
    "para los efectos del Artículo 1902 del Código Civil."
  );
  drawClauseText(ctx,
    "Cualquier cesión efectuada en contravención a lo dispuesto en la presente cláusula " +
    "será inoponible a la contraparte."
  );
}

async function drawClause19_Signatures(ctx: LayoutCtx, data: ContractData): Promise<void> {
  drawClauseTitle(ctx, 21, "FIRMAS");

  ensureSpace(ctx, 200);
  ctx.y -= 10;

  const sigBoxY = ctx.y - 50;
  const sigBoxWidth = (CONTENT_W - 40) / 2;

  // Prestador box
  ctx.page.drawRectangle({
    x: MARGIN,
    y: sigBoxY,
    width: sigBoxWidth,
    height: 100,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 1,
  });
  // Cliente box
  ctx.page.drawRectangle({
    x: MARGIN + sigBoxWidth + 40,
    y: sigBoxY,
    width: sigBoxWidth,
    height: 100,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 1,
  });

  ctx.page.drawText("PRESTADOR", {
    x: MARGIN + 8,
    y: sigBoxY + 82,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText("Mtsprz — Soluciones Digitales", {
    x: MARGIN + 8,
    y: sigBoxY + 68,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });

  ctx.page.drawText("CLIENTE", {
    x: MARGIN + sigBoxWidth + 48,
    y: sigBoxY + 82,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText(data.clientName, {
    x: MARGIN + sigBoxWidth + 48,
    y: sigBoxY + 68,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });

  // Admin signature image
  if (data.adminSignature) {
    const sigData = data.adminSignature.replace(/^data:image\/\w+;base64,/, "");
    try {
      const sigImage = await ctx.doc.embedPng(sigData);
      ctx.page.drawImage(sigImage, {
        x: MARGIN + 8,
        y: sigBoxY + 10,
        width: sigBoxWidth - 16,
        height: 40,
      });
    } catch {
      try {
        const sigImage = await ctx.doc.embedJpg(sigData);
        ctx.page.drawImage(sigImage, {
          x: MARGIN + 8,
          y: sigBoxY + 10,
          width: sigBoxWidth - 16,
          height: 40,
        });
      } catch { /* ignore */ }
    }
    ctx.page.drawText(`Firmado: ${data.adminSignedAt || ""}`, {
      x: MARGIN + 8,
      y: sigBoxY + 4,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
  } else {
    ctx.page.drawText("(Pendiente de firma)", {
      x: MARGIN + 8,
      y: sigBoxY + 30,
      size: 9,
      font: ctx.font,
      color: MUTED,
    });
  }

  // Client signature image
  if (data.clientSignature) {
    const sigData = data.clientSignature.replace(/^data:image\/\w+;base64,/, "");
    try {
      const sigImage = await ctx.doc.embedPng(sigData);
      ctx.page.drawImage(sigImage, {
        x: MARGIN + sigBoxWidth + 48,
        y: sigBoxY + 10,
        width: sigBoxWidth - 16,
        height: 40,
      });
    } catch {
      try {
        const sigImage = await ctx.doc.embedJpg(sigData);
        ctx.page.drawImage(sigImage, {
          x: MARGIN + sigBoxWidth + 48,
          y: sigBoxY + 10,
          width: sigBoxWidth - 16,
          height: 40,
        });
      } catch { /* ignore */ }
    }
    ctx.page.drawText(`Firmado: ${data.clientSignedAt || ""}`, {
      x: MARGIN + sigBoxWidth + 48,
      y: sigBoxY + 4,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
  }

  ctx.y = sigBoxY - 40;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 16;

  ctx.page.drawText(`"Las partes firman en señal de aprobación, aceptando todas y cada una de las cláusulas del presente contrato."`, {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 14;

  ctx.page.drawText(`Fecha de emisión: ${data.createdAt}`, {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  ctx.page.drawText(`Documento: ${data.contractNumber}`, {
    x: PAGE_W - MARGIN - 150,
    y: ctx.y,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

// ── Auto Special Clauses (injected by service type) ────────────────────────

function drawAutoSpecialClauses(ctx: LayoutCtx, data: ContractData): void {
  const serviceNames = (data.services || []).map(s => s.name.toLowerCase());
  const allDeliverables = (data.services || []).flatMap(s => (s.deliverables || []).map(d => d.toLowerCase()));

  const hasScaping = serviceNames.some(n =>
    n.includes("scrap") || n.includes("etl") || n.includes("datos") || n.includes("prospect")
  );
  const hasAds = serviceNames.some(n =>
    n.includes("ads") || n.includes("google") || n.includes("meta") || n.includes("pauta") || n.includes("campan")
  );
  const hasEcommerce = serviceNames.some(n =>
    n.includes("ecommerce") || n.includes("e-commerce") || n.includes("tienda") || n.includes("shop") || n.includes("woocommerce") || n.includes("shopify")
  ) || allDeliverables.some(d =>
    d.includes("webpay") || d.includes("flow") || d.includes("mercado pago") || d.includes("pasarela") || d.includes("carrito")
  );

  if (!hasScaping && !hasAds && !hasEcommerce) return;

  if (hasScaping) {
    ensureSpace(ctx, 160);
    ctx.page.drawText("A. RECOLECCIÓN AUTOMATIZADA DE DATOS (WEB SCRAPING / ETL)", {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.fontBold,
      color: TEXT,
    });
    ctx.y -= 16;

    drawClauseText(ctx,
      "El servicio de recolección automatizada se ejecutará sobre fuentes expresamente designadas o " +
      "aprobadas por el Cliente. El Prestador implementará buenas prácticas técnicas en la ejecución: " +
      "control de frecuencia de solicitudes (rate limiting), respeto de las directivas robots.txt de " +
      "los sitios fuente, uso preferente de APIs oficiales cuando existan, y manejo de reintentos ante " +
      "errores transitorios. En lo relativo a este servicio, el Cliente declara y garantiza: (i) que " +
      "ha designado o aprobado las fuentes de datos objeto del servicio y que tiene derecho o " +
      "autorización suficiente sobre ellas; (ii) que el uso que dará a los datos recolectados es lícito " +
      "y no infringe términos de servicio de los sitios fuente, derechos de autor, ni la normativa de " +
      "protección de datos aplicable; (iii) que, en la medida que los datos incluyan datos personales, " +
      "el Cliente actúa como responsable del tratamiento y cuenta con la base legal habilitante, " +
      "conforme a la Ley N° 19.628 y la Ley N° 21.719."
    );
    drawClauseText(ctx,
      "El Prestador declara expresamente que las técnicas de recolección que ejecutará se limitan " +
      "a aquellas que no implican la superación de barreras técnicas o medidas de seguridad de " +
      "los sitios fuente, y que en ningún caso ejecutará instrucciones del Cliente que requieran " +
      "acceder a sistemas sin autorización o eludir medidas tecnológicas de seguridad. La solicitud " +
      "del Cliente en tal sentido será considerada incumplimiento grave y facultará al Prestador " +
      "a resolver el contrato de pleno derecho, con derecho a cobrar la totalidad de los honorarios " +
      "devengados y no pagados a esa fecha."
    );
    drawClauseText(ctx,
      "El Cliente se obliga a indemnizar y mantener indemne al Prestador frente a cualquier reclamo, " +
      "demanda, multa o perjuicio proveniente de terceros —incluyendo titulares de sitios fuente, " +
      "personas cuyos datos sean recolectados, o autoridades— que deriven de: (a) la designación por " +
      "el Cliente de fuentes de datos que no contaban con autorización suficiente; (b) el uso que el " +
      "Cliente dé a los datos recolectados. La obligación de indemnidad subsistirá por 3 años desde " +
      "el término del contrato y es independiente de toda culpa del Prestador en la ejecución técnica."
    );
    drawClauseText(ctx,
      "Término del contrato y cese de ejecución: Al término o resolución del presente contrato por " +
      "cualquier causa, el Prestador cesará toda ejecución del sistema de scraping en su propia " +
      "infraestructura. La operación, alojamiento, mantenimiento y responsabilidad de ejecución " +
      "futura del sistema pasan íntegramente al Cliente a partir de esa fecha. El Prestador entregará " +
      "el código fuente y la documentación necesaria para que el Cliente pueda operar el sistema de " +
      "forma autónoma, contra el pago total de los honorarios."
    );
    ctx.y -= 4;
  }

  if (hasAds) {
    ensureSpace(ctx, 140);
    const letter = hasScaping ? "B" : "A";
    ctx.page.drawText(`${letter}. GESTIÓN DE CAMPAÑAS PUBLICITARIAS DIGITALES`, {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.fontBold,
      color: TEXT,
    });
    ctx.y -= 16;

    drawClauseText(ctx,
      "El servicio de gestión de campañas publicitarias es de naturaleza continua y se presta durante " +
      "todo el período del contrato. El valor de los honorarios cubre exclusivamente el servicio " +
      "profesional de configuración, optimización y reporte de campañas. No incluye, bajo ningún " +
      "concepto, la inversión publicitaria (ad spend) pagada a las plataformas (Google, Meta u otras), " +
      "la que es un gasto directo del Cliente a dichas plataformas, facturado por ellas de forma " +
      "independiente."
    );
    drawClauseText(ctx,
      "Facturación del servicio continuo: Los honorarios correspondientes exclusivamente al servicio " +
      "de gestión de campañas publicitarias se devengan por mensualidades vencidas. Cada mensualidad " +
      "es exigible al término del mes calendario de servicio prestado, contra la entrega del reporte " +
      "mensual de rendimiento. Este mecanismo de devengo aplica independientemente de la modalidad " +
      "de pago general pactada en la cláusula séptima para los demás servicios del contrato, y " +
      "prevalece sobre ella en lo relativo a la gestión de campañas. El reporte mensual que gatilla " +
      "el cobro es el reporte de resumen de período, distinto de los reportes semanales de seguimiento. " +
      "Cuando el presente contrato incluya también el desarrollo de la plataforma o tienda destinataria " +
      "de las campañas, la gestión de Ads comenzará a devengarse desde la fecha de puesta en producción " +
      "de dicha plataforma, no desde la firma del contrato, a fin de evitar inversión publicitaria sin " +
      "destino operativo."
    );
    drawClauseText(ctx,
      "No garantía de resultados: El Prestador no garantiza conversiones, CPA (costo por adquisición), " +
      "ROAS (retorno sobre inversión publicitaria), posiciones ni ninguna otra métrica de resultado " +
      "de las campañas, por depender de algoritmos, subastas y políticas de las plataformas que " +
      "escapan al control del Prestador. El servicio comprometido es la gestión profesional diligente, " +
      "no un resultado determinado."
    );
    drawClauseText(ctx,
      "El Cliente es responsable de mantener vigentes y con saldo suficiente las cuentas publicitarias. " +
      "El Prestador no responde por la interrupción de campañas derivada de falta de fondos, " +
      "suspensión de cuentas por la plataforma, ni por cambios en sus políticas publicitarias."
    );
    drawClauseText(ctx,
      "Cuando la cláusula CUARTA asigne el servicio de gestión de campañas a un bloque, la modalidad " +
      "de pago de dicho bloque prevalece sobre el devengo por mensualidades vencidas de la presente " +
      "cláusula, entendiéndose el honorario indicado como comprensivo de la totalidad del período de " +
      "vigencia del contrato. El reporte mensual subsiste como entregable, sin gatillar cobro autónomo."
    );
    ctx.y -= 4;
  }

  if (hasEcommerce) {
    ensureSpace(ctx, 180);
    const letter = [hasScaping, hasAds].filter(Boolean).length === 2 ? "C" :
                   [hasScaping, hasAds].some(Boolean) ? "B" : "A";
    ctx.page.drawText(`${letter}. COMERCIO ELECTRÓNICO Y PASARELAS DE PAGO`, {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.fontBold,
      color: TEXT,
    });
    ctx.y -= 16;

    drawClauseParagraph(ctx, "Pasarelas de pago — responsabilidad del Cliente: ",
      "La afiliación a las pasarelas de pago (Webpay/Transbank, Flow, Mercado Pago u otras) debe ser " +
      "gestionada directamente por el Cliente a su propio nombre, con su RUT y cuenta bancaria, " +
      "mediante contrato comercial directo con cada proveedor. El Prestador realiza exclusivamente la " +
      "integración técnica una vez que el Cliente provea las credenciales de la cuenta ya aprobada. " +
      "La demora del proveedor de pasarela en aprobar la afiliación del Cliente prorroga automáticamente " +
      "el plazo de entrega del Prestador en igual número de días hábiles, sin que ello constituya " +
      "incumplimiento."
    );

    drawClauseParagraph(ctx, "Exclusión de responsabilidad transaccional: ",
      "El Prestador no responde por: fallos de transacción, contracargos, fraudes, retenciones de " +
      "fondos, comisiones, suspensión de la cuenta de comercio por la pasarela, ni por cualquier " +
      "incidente derivado de la operación del medio de pago una vez entregado y puesto en producción. " +
      "El sistema que el Prestador construye no almacena datos de medios de pago (número de tarjeta, " +
      "CVV, fecha de expiración): toda transacción se procesa por redirección al servidor del proveedor " +
      "de pasarela, que es el único responsable del tratamiento de esos datos."
    );

    drawClauseParagraph(ctx, "Ley del Consumidor (Ley N° 19.496) y Reglamento de Comercio Electrónico: ",
      "La adecuación de la tienda a la normativa de protección al consumidor —incluyendo la " +
      "elaboración de términos y condiciones de venta, política de privacidad, política de devoluciones " +
      "y retracto (10 días, art. 3 bis), garantía legal (6 meses), exhibición de precios con impuestos " +
      "incluidos, e identificación legal del vendedor— es de exclusiva responsabilidad del Cliente, " +
      "que actúa como proveedor frente a los consumidores finales conforme al artículo 1° de la " +
      "Ley N° 19.496. El Prestador se limita a incorporar técnicamente los textos que el Cliente " +
      "provea; no redacta ni certifica su adecuación legal."
    );

    drawClauseParagraph(ctx, "Datos personales de compradores: ",
      "La tienda almacenará datos personales de consumidores finales (nombre, RUT, dirección, " +
      "historial de compras). El Cliente actúa como responsable del tratamiento de dichos datos. " +
      "El Prestador construirá el sistema con cifrado en reposo y control de accesos conforme a los " +
      "estándares de la Ley N° 21.719, cuya plena vigencia opera desde el 1 de diciembre de 2026."
    );
    ctx.y -= 4;
  }
}

// ── Special Clauses (if any) ────────────────────────────────────────────────

function drawSpecialClauses(ctx: LayoutCtx, data: ContractData): void {
  if (!data.specialClauses) return;

  ensureSpace(ctx, 120);

  ctx.y = drawWrappedText(ctx, data.specialClauses, MARGIN, ctx.y, CONTENT_W, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 16;
}

/** Filtra entregables problemáticos que no deben aparecer en un contrato firmado */
function sanitizeDeliverable(d: string): string | null {
  const lower = d.toLowerCase().trim();
  // Eliminar texto de marketing interno ("Sin compromiso de contratación", etc.)
  if (lower.includes("sin compromiso de contratación") || lower.includes("sin compromiso de")) return null;
  // Si dice "opcional" sin condición, forzar a que sea condicional
  if (lower.includes("opcional") && !lower.includes("sujeta a") && !lower.includes("cotización adicional")) {
    return d + " (sujeta a cotización adicional)";
  }
  // Si menciona "rotación de IPs" o "anti-bloqueo" — riesgos penales por scraping
  if (lower.includes("rotación de ip") || lower.includes("rotacion de ip") || lower.includes("anti-bloqueo") || lower.includes("antibloqueo")) {
    return null;
  }
  // Hosting/SSL/CDN: reemplazar SOLO en servicios con slug de hosting.
  // La Nota sobre hosting e infraestructura se imprime desde drawAnnexA_Deliverables
  // cuando el entregable contiene hosting/ssl/cdn — esa lógica es la fuente de verdad.
  // Aquí NO tocamos entregables legítimos como "Despliegue en servidor seguro".
  return d;
}

// ── Anexo A: Entregables y Plazos ────────────────────────────────────────────

function drawAnnexA_Deliverables(ctx: LayoutCtx, data: ContractData): void {
  if (!data.services || data.services.length === 0) return;

  // Salto de página para el anexo
  addNewPage(ctx);
  ctx.y -= 8;

  ctx.page.drawRectangle({
    x: 0,
    y: ctx.y + 4,
    width: ctx.width,
    height: 36,
    color: rgb(0.01, 0.01, 0.01),
  });
  ctx.page.drawText("ANEXO A — ENTREGABLES Y PLAZOS", {
    x: MARGIN,
    y: ctx.y + 12,
    size: 13,
    font: ctx.fontBold,
    color: WHITE,
  });
  ctx.y -= 16;

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 24;

  drawClauseText(ctx,
    "El presente anexo forma parte integrante del contrato y detalla los entregables, " +
    "plazos y criterios de aceptación de cada servicio contratado."
  );
  ctx.y -= 8;

  const startD = "la fecha de entrada en vigor conforme a la cláusula OCTAVA";
  const endD = `${data.durationMonths || 1} mes(es) contados desde la entrada en vigor conforme a la cláusula OCTAVA`;

  // ── Block grouping table ──
  // B3: misma fuente que drawClause4 — solo servicios con price > 0
  const billableServices = (data.services || []).filter(s => (s.price || 0) > 0);
  const activeServices = billableServices;
  const monthlyNames = activeServices.filter(s => s.is_monthly).map(s => s.name);
  const punctualNames = activeServices.filter(s => !s.is_monthly).map(s => s.name);
  ensureSpace(ctx, 100);
  ctx.page.drawText("AGRUPACIÓN EN BLOQUES", {
    x: MARGIN,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 18;

  const BORDER_THIN = rgb(0.85, 0.85, 0.87);
  const drawBlockRow = (block: string, services: string, value: string) => {
    const serviceLines = countLines(services, CONTENT_W - 180, 8, ctx.font);
    const rowH = Math.max(18, serviceLines * 11 + 8);
    ensureSpace(ctx, rowH + 4);
    const rY = ctx.y - 2;
    ctx.page.drawRectangle({ x: MARGIN, y: rY - (rowH - 18), width: CONTENT_W, height: rowH, color: WHITE, borderColor: BORDER_THIN, borderWidth: 0.5 });
    ctx.page.drawText(block, { x: MARGIN + 4, y: rY + 3, size: 8, font: ctx.fontBold, color: TEXT });
    drawWrappedText(ctx, services, MARGIN + 80, rY + 3, CONTENT_W - 180, 8, ctx.font, 11);
    ctx.page.drawText(value, { x: PAGE_W - MARGIN - 80, y: rY + 3, size: 8, font: ctx.fontBold, color: TEXT });
    ctx.y -= rowH + 2;
  };

  // Compute approximate block values based on actual services present
  const fundacionSlugs = ["diagnóstico", "diagnostico", "logo", "identidad", "auditoría", "auditoria", "seo", "marca"];
  const plataformaSlugs = ["sitio web", "landing", "tienda", "ecommerce", "aplicación", "aplicacion", "web app", "api", "backend", "dashboard", "panel"];
  const automatizacionSlugs = ["automatización", "automatizacion", "excel", "n8n", "make", "bot", "whatsapp", "email marketing", "crm", "ocr", "scrap", "etl"];

  let fundacionSvcs: string[] = [];
  let plataformaSvcs: string[] = [];
  let autoSvcs: string[] = [];

  // B5: mensuales fuera de bloques siempre
  const hitos_slugs = ["aplicacion", "aplicación", "app web", "tienda", "ecommerce", "e-commerce"];
  const hitosSvcs: string[] = [];

  for (const s of activeServices) {
    const sl = s.name.toLowerCase();
    if (s.is_monthly) continue; // handled via monthlyNames
    if (hitos_slugs.some(k => sl.includes(k)) && (s.price || 0) >= 500000) {
      hitosSvcs.push(s.name);
    } else {
      const n = s.name;
      const nl = n.toLowerCase();
      if (fundacionSlugs.some(k => nl.includes(k))) fundacionSvcs.push(n);
      else if (plataformaSlugs.some(k => nl.includes(k))) plataformaSvcs.push(n);
      else if (automatizacionSlugs.some(k => nl.includes(k))) autoSvcs.push(n);
      else fundacionSvcs.push(n); // fallback
    }
  }

  // Only print non-empty blocks
  if (fundacionSvcs.length > 0) drawBlockRow("1 — Fundación", fundacionSvcs.join(", "), "");
  if (plataformaSvcs.length > 0) drawBlockRow("2 — Plataforma", plataformaSvcs.join(", "), "");
  if (autoSvcs.length > 0) drawBlockRow("3 — Automatización", autoSvcs.join(", "), "");
  if (hitosSvcs.length > 0) drawBlockRow("Hitos propios", hitosSvcs.join(", "), "(pago 40/30/30)");
  if (monthlyNames.length > 0) drawBlockRow("Mensuales", monthlyNames.join(", "), "(devengo mensual)");
  ctx.y -= 4;

  const hasMultiBlock = [fundacionSvcs, plataformaSvcs, autoSvcs].filter(b => b.length > 0).length > 1;
  drawClauseText(ctx,
    hasMultiBlock
      ? "Los bloques se ejecutarán en el orden indicado, salvo acuerdo escrito en contrario. " +
        "El Bloque 2 no iniciará mientras no se haya enterado el pago inicial del Bloque 1, y el " +
        "Bloque 3 no iniciará mientras no se haya enterado el pago inicial del Bloque 2."
      : "Los servicios mensuales se devengan y pagan de forma independiente a los servicios puntuales."
  );
  ctx.y -= 8;

  // ── Individual service details ── (B3: solo billableServices, no $0)
  for (let idx = 0; idx < billableServices.length; idx++) {
    const svc = billableServices[idx];
    const priceStr = (svc.price || 0).toLocaleString("es-CL");
    const monthlyTag = svc.is_monthly ? " (mensual)" : "";
    const svcHeaderText = `${idx + 1}. ${svc.name} — $${priceStr}${monthlyTag}`;
    const svcHeaderLines = countLines(svcHeaderText, CONTENT_W - 16, NORMAL_SIZE, ctx.fontBold);
    const svcHeaderH = Math.max(24, svcHeaderLines * 14 + 10);
    ensureSpace(ctx, svcHeaderH + 20);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 2,
      width: CONTENT_W,
      height: svcHeaderH,
      color: SECTION_BG,
    });
    drawWrappedText(ctx, svcHeaderText, MARGIN + 8, ctx.y + 4, CONTENT_W - 16, NORMAL_SIZE, ctx.fontBold, 14);
    ctx.y -= svcHeaderH + 4;

    // Plazo de ejecución
    if (svc.is_monthly) {
      drawClauseParagraph(ctx, "Modalidad: ",
        `Servicio recurrente mensual. El valor de $${priceStr} corresponde a cada mes de servicio. ` +
        `Se factura y paga mensualmente por adelantado. El servicio se presta durante todo el ` +
        `período del contrato.`
      );
    } else {
      drawClauseParagraph(ctx, "Plazo de ejecución: ",
        `Plazo de ejecución: ${endD}. ` +
        `Las partes acuerdan definir los hitos específicos y sus fechas de entrega mediante ` +
        `comunicación escrita dentro de los 5 días hábiles siguientes a la entrada en vigor del contrato, ` +
        `los que se entenderán incorporados al presente Anexo A como parte integrante. ` +
        `La falta de definición de hitos en dicho plazo habilitará al Prestador para gestionar ` +
        `los entregables en el orden y tiempos que estime convenientes, dentro del plazo total.`
      );
    }

    // Hitos de pago 40/30/30 para servicios de alto valor
    const svcNameLow = (svc.name || "").toLowerCase();
    const isHighValue = svcNameLow.includes("aplicación") || svcNameLow.includes("aplicacion") ||
      svcNameLow.includes("app web") || svcNameLow.includes("tienda") ||
      svcNameLow.includes("ecommerce") || svcNameLow.includes("plataforma");
    if (!svc.is_monthly && isHighValue && (svc.price || 0) >= 500000) {
      drawClauseParagraph(ctx, "Hitos de pago de este servicio: ",
        "40% al inicio, 30% contra entrega del sistema funcional en entorno de pruebas (staging), " +
        "y 30% contra recepción conforme final. Cada hito se rige por las reglas de recepción y " +
        "mora de las cláusulas SÉPTIMA y NOVENA."
      );
    }

    // Deliverables list or fallback
    const sanitizedDeliverables = (svc.deliverables || [])
      .map(sanitizeDeliverable)
      .filter((d): d is string => d !== null);
    if (sanitizedDeliverables.length > 0) {
      ctx.page.drawText("Entregables:", {
        x: MARGIN,
        y: ctx.y,
        size: SMALL_SIZE,
        font: ctx.fontBold,
        color: TEXT,
      });
      ctx.y -= 14;
      for (let di = 0; di < sanitizedDeliverables.length; di++) {
        const bulletText = sanitizedDeliverables[di];
        const linesNeeded = countLines(bulletText, CONTENT_W - 24, SMALL_SIZE, ctx.font);
        ensureSpace(ctx, linesNeeded * 14 + 4);
        ctx.page.drawText("•", {
          x: MARGIN + 12,
          y: ctx.y,
          size: SMALL_SIZE,
          font: ctx.font,
          color: TEXT,
        });
        ctx.y = drawWrappedText(ctx, bulletText, MARGIN + 22, ctx.y, CONTENT_W - 22, SMALL_SIZE, ctx.font, 14);
      }
    } else {
      ctx.page.drawText(
        "Entregables y especificaciones por definir entre las partes. Se entenderán incorporados " +
        "al presente anexo una vez acordados por escrito.",
        {
          x: MARGIN + 4,
          y: ctx.y,
          size: SMALL_SIZE,
          font: ctx.font,
          color: MUTED,
        }
      );
      ctx.y -= 14;
    }

    ctx.y -= 4;
    // Acceptance criteria
    drawClauseParagraph(ctx, "Criterio de aceptación: ",
      "Cada entregable se considerará recibido conforme tras su revisión y aprobación por escrito " +
      "del Cliente, o transcurrido el plazo de revisión estipulado sin observaciones (aprobación tácita)."
    );

    // Hosting notice: whitelist de slugs + detección por entregable con texto de Nota.
    // El slug cubre los servicios por id; el check de entregable cubre casos donde
    // la DB ya tiene el texto correcto pero el slug no matchea.
    const HOSTING_SLUGS = [
      "aplicacion-web", "aplicación-web", "web-app", "web app",
      "landing-page", "landing",
      "sitio-web", "sitio web", "web-profesional",
      "tienda-online", "tienda online", "ecommerce", "e-commerce",
    ];
    const svcSlug = (svc.id || svc.name || "").toLowerCase();
    const hasHostingBySlug = HOSTING_SLUGS.some(slug => svcSlug.includes(slug));
    // También activar si algún entregable menciona hosting/ssl/cdn (incluye los que ya tienen el texto de Nota)
    const hasHostingByDeliverable = (svc.deliverables || []).some(d => {
      const dl = d.toLowerCase();
      return dl.includes("hosting") || dl.includes("ssl") || dl.includes("cdn");
    });
    const hasHosting = hasHostingBySlug || hasHostingByDeliverable;
    if (hasHosting) {
      ctx.y -= 2;
      drawClauseParagraph(ctx, "Nota sobre hosting e infraestructura: ",
        "El alojamiento web (hosting), SSL y CDN no constituyen servicio personal del Prestador, " +
        "sino infraestructura de terceros. Las partes acuerdan instrumentarlo bajo una de las " +
        "siguientes modalidades, que se determinará antes del inicio del servicio: (a) Contratación " +
        "directa: el Cliente contrata el servicio de hosting a su propio nombre ante el proveedor " +
        "elegido, y el Prestador realiza la configuración técnica —modalidad que elimina toda " +
        "complejidad tributaria—; o (b) Reembolso con mandato: el Prestador adelanta el pago al " +
        "proveedor en calidad de mandatario del Cliente, quien reembolsa el costo exacto contra " +
        "el documento tributario del proveedor emitido a nombre del Cliente. En ningún caso el costo " +
        "de infraestructura se incluye dentro del honorario de boleta del Prestador. El período de " +
        "alojamiento se contará desde la puesta en producción del sitio, una vez recibido el pago " +
        "total de los honorarios. Transcurrido el período acordado, la renovación es por cuenta del " +
        "Cliente. El Prestador no responde por caídas imputables al proveedor de infraestructura."
      );
    }
    ctx.y -= 4;
  }

  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 16;

  drawClauseText(ctx,
    "Las partes declaran conocer y aceptar el contenido del presente Anexo A, que forma parte " +
    "integrante del contrato para todos los efectos legales."
  );

  // Signature line for Annex A
  ensureSpace(ctx, 100);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 16;
  ctx.page.drawText(
    "Las partes suscriben el presente Anexo A en señal de aceptación, formando parte integrante " +
    "del contrato N° " + data.contractNumber + ".",
    {
      x: MARGIN,
      y: ctx.y,
      size: 8,
      font: ctx.font,
      color: MUTED,
    }
  );
  ctx.y -= 20;
  // Signature boxes (simplified)
  const annexSY = ctx.y - 40;
  const annexSW = (CONTENT_W - 40) / 2;
  ctx.page.drawRectangle({ x: MARGIN, y: annexSY, width: annexSW, height: 60, color: WHITE, borderColor: BORDER, borderWidth: 0.5 });
  ctx.page.drawText("PRESTADOR", { x: MARGIN + 6, y: annexSY + 44, size: 8, font: ctx.fontBold, color: PRIMARY });
  ctx.page.drawText("Mtsprz — Soluciones Digitales", { x: MARGIN + 6, y: annexSY + 34, size: 7, font: ctx.font, color: MUTED });
  ctx.page.drawRectangle({ x: MARGIN + annexSW + 40, y: annexSY, width: annexSW, height: 60, color: WHITE, borderColor: BORDER, borderWidth: 0.5 });
  ctx.page.drawText("CLIENTE", { x: MARGIN + annexSW + 46, y: annexSY + 44, size: 8, font: ctx.fontBold, color: PRIMARY });
  ctx.page.drawText(data.clientName, { x: MARGIN + annexSW + 46, y: annexSY + 34, size: 7, font: ctx.font, color: MUTED });
}

// ── Anexo B: Herramientas de IA y Subencargados ─────────────────────────────

function drawAnnexB_AITools(ctx: LayoutCtx, data: ContractData): void {
  // Solo imprimir si hay servicios que usan IA o hay datos personales (OCR, CRM, Bot, Ads)
  const serviceNames = (data.services || []).map(s => s.name.toLowerCase());
  const requiresAnnexB = serviceNames.some(n =>
    n.includes("bot") || n.includes("whatsapp") || n.includes("ocr") ||
    n.includes("crm") || n.includes("ads") || n.includes("email marketing") ||
    n.includes("n8n") || n.includes("make") || n.includes("automatiz")
  );
  if (!requiresAnnexB) return;

  addNewPage(ctx);
  ctx.y -= 8;

  // Header
  ctx.page.drawRectangle({ x: 0, y: ctx.y + 4, width: ctx.width, height: 36, color: rgb(0.01, 0.01, 0.01) });
  ctx.page.drawText("ANEXO B — HERRAMIENTAS DE IA Y SUBENCARGADOS DE TRATAMIENTO", {
    x: MARGIN, y: ctx.y + 12, size: 11, font: ctx.fontBold, color: WHITE,
  });
  ctx.y -= 16;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: ctx.width - MARGIN, y: ctx.y }, thickness: 1, color: BORDER });
  ctx.y -= 20;

  drawClauseText(ctx,
    "El presente Anexo B forma parte integrante del contrato N° " + data.contractNumber + " y " +
    "constituye la autorización específica y por escrito exigida por el Artículo 15 bis de la " +
    "Ley N° 19.628 respecto de los terceros identificados en las Tablas B.1 y B.2. La Tabla B.2 " +
    "individualiza aquellos subencargados que emplean inteligencia artificial y respecto de los " +
    "cuales el Cliente otorga además la autorización escrita a que se refieren las cláusulas " +
    "DÉCIMA PRIMERA y DÉCIMA TERCERA letra (f) del contrato."
  );
  ctx.y -= 6;

  // ─── TABLA B.1 — Subencargados de tratamiento ───
  ctx.page.drawText("TABLA B.1 — SUBENCARGADOS DE TRATAMIENTO (Art. 15 bis Ley 19.628)", {
    x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontBold, color: PRIMARY,
  });
  ctx.y -= 16;

  // Column headers
  const colW = CONTENT_W / 5;
  const cols = [MARGIN, MARGIN + colW, MARGIN + colW * 2, MARGIN + colW * 3, MARGIN + colW * 4];
  const headers = ["Proveedor", "Servicio contrato", "Categoría datos", "País alojamiento", "Instrumento garantía"];
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 4, width: CONTENT_W, height: 20, color: SECTION_BG });
  for (let i = 0; i < headers.length; i++) {
    ctx.page.drawText(headers[i], { x: cols[i] + 3, y: ctx.y + 2, size: 7, font: ctx.fontBold, color: TEXT });
  }
  ctx.y -= 24;

  const drawTableRow = (cells: string[], highlight = false) => {
    const maxLines = Math.max(...cells.map((c, i) => countLines(c, colW - 6, 7, ctx.font)));
    const rowH = Math.max(18, maxLines * 10 + 8);
    ensureSpace(ctx, rowH + 4);
    ctx.page.drawRectangle({
      x: MARGIN, y: ctx.y - 2, width: CONTENT_W, height: rowH,
      color: highlight ? rgb(0.97, 0.98, 1.0) : WHITE,
      borderColor: BORDER, borderWidth: 0.3,
    });
    for (let i = 0; i < cells.length; i++) {
      drawWrappedText(ctx, cells[i], cols[i] + 3, ctx.y + rowH - 10, colW - 6, 7, ctx.font, 10);
    }
    ctx.y -= rowH + 2;
  };

  // Vercel / Railway / Cloudflare (hosting/deploy)
  const hasWebService = serviceNames.some(n =>
    n.includes("sitio") || n.includes("landing") || n.includes("aplicaci") ||
    n.includes("tienda") || n.includes("dashboard") || n.includes("api")
  );
  if (hasWebService) {
    drawTableRow(["Vercel Inc.", "Hosting/despliegue plataformas web", "Logs de acceso, IPs y datos de sesión de usuarios", "EE.UU. (edge global)", "DPA Vercel: vercel.com/legal/dpa"]);
    drawTableRow(["Railway Corp. [POR CONFIRMAR — NO FIRMAR]", "Hosting/despliegue alternativo", "Logs de acceso e IPs", "EE.UU.", "railway.app/legal/privacy"]);
    drawTableRow(["Cloudflare Inc. [POR CONFIRMAR — NO FIRMAR]", "CDN y seguridad web", "Logs de tráfico, IPs", "EE.UU./global", "cloudflare.com/privacypolicy"]);
  }

  // NeonDB (base de datos)
  drawTableRow(["Neon Inc.", "Base de datos (NeonDB)", "Datos de usuarios y clientes", "EE.UU. (AWS us-east-1)", "DPA Neon: neon.tech/dpa"]);

  // Resend (email marketing / notificaciones)
  const hasEmail = serviceNames.some(n => n.includes("email") || n.includes("resend") || n.includes("marketing"));
  if (hasEmail) {
    drawTableRow(["Resend Inc.", "Envío de correos transaccionales y marketing", "Correos y nombres de contactos", "EE.UU.", "DPA Resend: resend.com/legal/dpa"]);
  }

  // Twilio / WhatsApp BSP
  const hasWhatsApp = serviceNames.some(n => n.includes("bot") || n.includes("whatsapp"));
  if (hasWhatsApp) {
    drawTableRow(["Meta Platforms Inc. [POR CONFIRMAR — NO FIRMAR]", "Bot WhatsApp — operador de API", "Conversaciones con clientes finales", "EE.UU.", "Meta Data Processing Terms: facebook.com/legal/terms/dataprocessing"], true);
    drawTableRow(["BSP intermediario (Twilio / 360dialog / Cloud API) [POR CONFIRMAR — NO FIRMAR]", "Bot WhatsApp — capa de mensajería", "Metadatos de mensajes", "Por confirmar según BSP elegido", "DPA del BSP contratado"], true);
  }

  // n8n/Make (automatización)
  const hasAutomation = serviceNames.some(n => n.includes("n8n") || n.includes("make") || n.includes("automatiz"));
  if (hasAutomation) {
    drawTableRow(["n8n GmbH o Make a.s. [POR CONFIRMAR — NO FIRMAR]", "Automatización de flujos con datos", "Datos de clientes según flujo configurado", "Alemania / Rep. Checa", "DPA del proveedor elegido"], true);
  }

  // CRM cloud
  const hasCRM = serviceNames.some(n => n.includes("crm"));
  if (hasCRM) {
    drawTableRow(["[PROVEEDOR CRM POR CONFIRMAR — NO FIRMAR]", "Integración CRM", "Datos de contactos y clientes", "Por confirmar", "DPA del proveedor CRM elegido"], true);
  }

  ctx.y -= 8;

  // ─── TABLA B.2 — Herramientas de IA ───
  ctx.page.drawText("TABLA B.2 — HERRAMIENTAS DE IA QUE PROCESAN DATOS PERSONALES", {
    x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontBold, color: PRIMARY,
  });
  ctx.y -= 16;

  const colW2 = CONTENT_W / 6;
  const cols2 = [MARGIN, MARGIN + colW2, MARGIN + colW2 * 2, MARGIN + colW2 * 3, MARGIN + colW2 * 4, MARGIN + colW2 * 5];
  const headers2 = ["Proveedor", "Servicio contrato", "Datos procesados", "País", "Plan/tier", "No-entrenamiento"];
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 4, width: CONTENT_W, height: 20, color: SECTION_BG });
  for (let i = 0; i < headers2.length; i++) {
    ctx.page.drawText(headers2[i], { x: cols2[i] + 2, y: ctx.y + 2, size: 6, font: ctx.fontBold, color: TEXT });
  }
  ctx.y -= 24;

  const drawTableRow2 = (cells: string[], highlight = false) => {
    const maxLines = Math.max(...cells.map((c, i) => countLines(c, colW2 - 4, 6, ctx.font)));
    const rowH = Math.max(18, maxLines * 9 + 8);
    ensureSpace(ctx, rowH + 4);
    ctx.page.drawRectangle({
      x: MARGIN, y: ctx.y - 2, width: CONTENT_W, height: rowH,
      color: highlight ? rgb(1, 0.97, 0.97) : WHITE,
      borderColor: BORDER, borderWidth: 0.3,
    });
    for (let i = 0; i < cells.length; i++) {
      drawWrappedText(ctx, cells[i], cols2[i] + 2, ctx.y + rowH - 9, colW2 - 4, 6, ctx.font, 9);
    }
    ctx.y -= rowH + 2;
  };

  // OCR
  const hasOCR = serviceNames.some(n => n.includes("ocr") || n.includes("document"));
  if (hasOCR) {
    drawTableRow2(["AWS Textract", "OCR Documentos", "Documentos tributarios (RUT, montos, fechas)", "sa-east-1 (São Paulo)", "API (no consumer)", "AWS Service Terms + AWS Data Processing Addendum: aws.amazon.com/agreement"], false);
  }

  // Bot/IA conversacional
  if (hasWhatsApp) {
    drawTableRow2(["OpenAI LLC [POR CONFIRMAR — NO FIRMAR]", "Bot WhatsApp inteligente", "Conversaciones con clientes finales", "EE.UU.", "API (Enterprise recomendado)", "OpenAI API Terms: openai.com/policies/api-usage"], true);
  }

  ctx.y -= 8;

  // ─── TABLA B.3 — Herramientas del Prestador sin datos del Cliente ───
  ctx.page.drawText("TABLA B.3 — HERRAMIENTAS DEL PRESTADOR QUE NO TRATAN DATOS DEL CLIENTE", {
    x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontBold, color: MUTED,
  });
  ctx.y -= 14;
  drawClauseText(ctx,
    "Las siguientes herramientas son de uso interno del Prestador para producción de código y diseño. " +
    "No tratan datos personales del Cliente ni de sus clientes. Se listan a título informativo; " +
    "no generan subencargo ni solidaridad bajo el Art. 15 bis."
  );

  const b3Tools = [
    "GitHub Copilot (GitHub Inc.) — asistente de código. Procesa solo código fuente del Prestador.",
    "Herramientas de apoyo del Prestador (Claude/Anthropic y otros asistentes de IA) — pueden procesar los datos de contacto de las partes contenidos en el propio documento contractual y en comunicaciones administrativas, sin acceder a bases de datos, sistemas ni datos personales de clientes finales del Cliente, y bajo compromiso de no uso para entrenamiento de modelos (plan API).",
    "Figma Inc. — diseño UI/UX. No procesa datos personales de clientes finales del Cliente.",
    "Google Ads / Analytics / Search Console / Business Profile: las cuentas son titularidad del Cliente conforme a la cláusula DÉCIMA PRIMERA. Google actúa como subencargado del Cliente (no del Prestador). El Prestador opera como administrador autorizado sin adquirir titularidad.",
  ];
  for (const tool of b3Tools) {
    ensureSpace(ctx, 14);
    ctx.page.drawText(`• ${tool}`, { x: MARGIN + 8, y: ctx.y, size: SMALL_SIZE, font: ctx.font, color: TEXT });
    ctx.y -= 14;
  }
  ctx.y -= 8;

  // ─── PROHIBICIONES ABSOLUTAS ───
  ensureSpace(ctx, 60);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 44, width: CONTENT_W, height: 54, color: rgb(1, 0.97, 0.97), borderColor: rgb(0.9, 0.2, 0.2), borderWidth: 0.5 });
  ctx.page.drawText("PROHIBICIONES ABSOLUTAS — INDEPENDIENTE DE AUTORIZACIÓN EN TABLA B.2", {
    x: MARGIN + 6, y: ctx.y - 4, size: SMALL_SIZE, font: ctx.fontBold, color: rgb(0.8, 0.1, 0.1),
  });
  ctx.y -= 16;
  const prohibitions = [
    "(i) Datos sensibles (Art. 2° Ley 19.628): origen racial, salud, religión, orientación sexual, etc.",
    "(ii) Documentos tributarios, contables o financieros de terceros no anonimizados/seudonimizados.",
    "(iii) Credenciales de acceso (contraseñas, tokens, claves API de terceros).",
    "El OCR de documentos tributarios de terceros solo se ejecutará en infraestructura bajo control del Prestador o del Cliente, salvo autorización escrita específica por tipo documental.",
  ];
  for (const p of prohibitions) {
    ensureSpace(ctx, 12);
    drawWrappedText(ctx, p, MARGIN + 8, ctx.y, CONTENT_W - 16, 7, ctx.font, 10);
    ctx.y -= 2;
  }
  ctx.y -= 12;

  // ─── MECANISMO DE ACTUALIZACIÓN ───
  drawClauseParagraph(ctx, "Mecanismo de actualización — dos velocidades: ",
    "La incorporación de herramientas a la Tabla B.3 requerirá solo aviso escrito al Cliente, sin " +
    "necesidad de modificar este Anexo. La incorporación a las Tablas B.1 y B.2 requerirá autorización " +
    "específica y por escrito del Cliente conforme al Artículo 15 bis de la Ley N° 19.628, la que el " +
    "Cliente no podrá denegar arbitrariamente y deberá otorgar o rechazar fundadamente dentro de 5 días " +
    "hábiles. El silencio del Cliente no constituye autorización para las Tablas B.1 y B.2."
  );

  // ─── TRANSFERENCIA INTERNACIONAL ───
  drawClauseParagraph(ctx, "Transferencia internacional de datos personales: ",
    "Las partes reconocen que los proveedores identificados en las Tablas B.1 y B.2 con país de " +
    "alojamiento fuera de Chile implican transferencia internacional de datos personales conforme a " +
    "los Artículos 27 al 29 de la Ley N° 19.628 (Ley N° 21.719). A la fecha del presente Anexo, " +
    "la Agencia de Protección de Datos Personales no ha dictado las cláusulas contractuales tipo " +
    "a que se refiere el Artículo 28. En consecuencia, las transferencias se amparan en las " +
    "garantías contractuales establecidas en los acuerdos de tratamiento de datos (DPA) de cada " +
    "proveedor, individualizados en las tablas. Las partes se obligan a adecuar el presente Anexo " +
    "a las cláusulas tipo dentro de los 90 días corridos siguientes a su dictación por la Agencia."
  );

  // ─── FIRMA ───
  ensureSpace(ctx, 100);
  ctx.y -= 12;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: ctx.width - MARGIN, y: ctx.y }, thickness: 1, color: BORDER });
  ctx.y -= 14;
  drawClauseText(ctx,
    "Las partes suscriben el presente Anexo B en señal de aceptación y como autorización específica " +
    "y por escrito conforme al Artículo 15 bis de la Ley N° 19.628, formando parte integrante del " +
    "contrato N° " + data.contractNumber + ". Cualquier herramienta de las Tablas B.1 y B.2 marcada " +
    "como [POR CONFIRMAR — NO FIRMAR] debe ser reemplazada por los datos reales del proveedor antes " +
    "de la suscripción del contrato."
  );
  ctx.y -= 12;

  const annexBY = ctx.y - 40;
  const annexBW = (CONTENT_W - 40) / 2;
  ctx.page.drawRectangle({ x: MARGIN, y: annexBY, width: annexBW, height: 60, color: WHITE, borderColor: BORDER, borderWidth: 0.5 });
  ctx.page.drawText("PRESTADOR — Mtsprz", { x: MARGIN + 6, y: annexBY + 44, size: 8, font: ctx.fontBold, color: PRIMARY });
  ctx.page.drawText("Firma y fecha:", { x: MARGIN + 6, y: annexBY + 30, size: 7, font: ctx.font, color: MUTED });
  ctx.page.drawRectangle({ x: MARGIN + annexBW + 40, y: annexBY, width: annexBW, height: 60, color: WHITE, borderColor: BORDER, borderWidth: 0.5 });
  ctx.page.drawText("CLIENTE — " + data.clientName, { x: MARGIN + annexBW + 46, y: annexBY + 44, size: 8, font: ctx.fontBold, color: PRIMARY });
  ctx.page.drawText("RUT: " + (data.clientRut || "—"), { x: MARGIN + annexBW + 46, y: annexBY + 32, size: 7, font: ctx.font, color: MUTED });
  ctx.page.drawText("Firma y fecha:", { x: MARGIN + annexBW + 46, y: annexBY + 20, size: 7, font: ctx.font, color: MUTED });
  ctx.y = annexBY - 12;
}

// ── Main PDF Generator ──────────────────────────────────────────────────────

/**
 * Valida el contrato antes de generar el PDF.
 * Lanza Error con lista de blockers si hay problemas que impiden emisión final.
 * Pasar `strict: false` para generar igualmente (útil en borrador/admin).
 */
export function validateContractData(data: ContractData, strict = true): string[] {
  const blockers: string[] = [];

  const allDeliverables = (data.services || []).flatMap(s => s.deliverables || []);

  // Marcadores [POR CONFIRMAR] en deliverables
  const hasMarkers = allDeliverables.some(d => d.includes("[POR CONFIRMAR"));
  if (hasMarkers) blockers.push("Entregables con marcadores [POR CONFIRMAR — NO FIRMAR]. Completar antes de emitir.");

  // Servicios que activan Anexo B pero cuyos proveedores de IA no están confirmados
  const serviceNames = (data.services || []).map(s => s.name.toLowerCase());
  const needsAnnexB = serviceNames.some(n =>
    n.includes("bot") || n.includes("whatsapp") || n.includes("ocr") ||
    n.includes("crm") || n.includes("n8n") || n.includes("make") || n.includes("automatiz")
  );
  if (needsAnnexB) {
    // Verificar que hay alguna indicación de que el Anexo B fue completado.
    // Como el Anexo B se genera automáticamente con [POR CONFIRMAR], detectamos si
    // el contrato tiene esos servicios sin que haya un campo explícito de confirmación.
    // En producción, agregar un campo data.annexBConfirmed para marcar esto.
    if (!(data as any).annexBConfirmed) {
      blockers.push(
        "Servicios que requieren Anexo B detectados (Bot/WhatsApp/OCR/CRM/Automatización). " +
        "Completar los 7 proveedores [POR CONFIRMAR] del Anexo B y marcar annexBConfirmed=true."
      );
    }
  }

  // Servicio sin precio > 0 con nombre en la lista (servicio fantasma)
  const zeroServices = (data.services || []).filter(s => (s.price || 0) <= 0 && s.name && !s.name.toLowerCase().includes("gratuito"));
  if (zeroServices.length > 0) blockers.push(`Servicios con precio $0 sin marcar como gratuitos: ${zeroServices.map(s => s.name).join(", ")}`);

  // Entregables con "incluido" junto a hosting/ssl/cdn
  const badHosting = allDeliverables.filter(d => {
    const l = d.toLowerCase();
    return (l.includes("hosting") || l.includes("ssl") || l.includes("cdn")) &&
           (l.includes("incluido") || l.includes("incluidos"));
  });
  if (badHosting.length > 0) blockers.push(`Entregables con "incluido" + hosting/ssl/cdn — reemplazar con texto de Nota: ${badHosting.slice(0, 2).join(" | ")}`);

  if (strict && blockers.length > 0) {
    throw new Error("Contrato no apto para emisión:\n" + blockers.map(b => `• ${b}`).join("\n"));
  }
  return blockers;
}

export async function generateContractPdf(data: ContractData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const { width, height } = page.getSize();

  const ctx: LayoutCtx = {
    page,
    doc,
    font,
    fontBold,
    y: height - MARGIN,
    width,
    height,
  };

  // ── HEADER ──────────────────────────────────────────────────────────────
  ctx.page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: rgb(0.01, 0.01, 0.01),
  });
  ctx.page.drawRectangle({
    x: 0,
    y: height - 4,
    width,
    height: 4,
    color: PRIMARY,
  });

  ctx.page.drawText("M T S P R Z", {
    x: MARGIN,
    y: height - 72,
    size: 22,
    font: ctx.fontBold,
    color: WHITE,
  });
  ctx.page.drawText("Soluciones Digitales", {
    x: MARGIN,
    y: height - 92,
    size: 9,
    font: ctx.font,
    color: rgb(0.6, 0.6, 0.6),
  });
  ctx.page.drawText("CONTRATO DE PRESTACIÓN DE SERVICIOS", {
    x: MARGIN,
    y: height - 140,
    size: TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText(`N° ${data.contractNumber}`, {
    x: MARGIN,
    y: height - 162,
    size: NORMAL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });

  const statusText = data.adminSignature ? "FIRMADO" : "PENDIENTE DE FIRMA";
  const statusColor = data.adminSignature ? GREEN : PRIMARY;
  ctx.page.drawRectangle({
    x: width - MARGIN - 120,
    y: height - 168,
    width: 120,
    height: 22,
    color: statusColor,
  });
  ctx.page.drawText(statusText, {
    x: width - MARGIN - 60,
    y: height - 163,
    size: 9,
    font: ctx.fontBold,
    color: WHITE,
  });

  ctx.y = height - 200;

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: width - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 24;

  // ── 19 CLAUSES ──────────────────────────────────────────────────────────
  drawClause1_Parties(ctx, data);
  drawClause2_Declarations(ctx, data);
  drawClause3_Object(ctx, data);
  drawClause4_Services(ctx, data);
  drawClause5_ObligationsPrestador(ctx, data);
  drawClause6_ObligationsClient(ctx, data);
  drawClause7_Payment(ctx, data);
  drawClause8_Term(ctx, data);
  drawClause9_Deliverables(ctx, data);
  drawClause10_Independence(ctx, data);
  drawClause11_IntellectualProperty(ctx, data);
  drawClause12_Confidentiality(ctx, data);
  drawClause13_DataProtection(ctx, data);
  drawClause14_Modifications(ctx, data);
  drawClause15_Subcontracting(ctx, data);
  drawClause16_Warranty(ctx, data);
  drawClause17_ForceMajeure(ctx, data);
  drawClause18_Jurisdiction(ctx, data);

  // DÉCIMA NOVENA — Obligaciones que subsisten al término
  drawClause20_Survival(ctx, data);

  // VIGÉSIMA — Cesión del contrato
  drawClause21_Assignment(ctx, data);

  // VIGÉSIMA PRIMERA — Cláusulas Especiales
  drawClauseTitle(ctx, 20, "CLÁUSULAS ESPECIALES");

  // Auto clauses (scraping indemnity, ads spend exclusion) — injected by service type
  drawAutoSpecialClauses(ctx, data);

  // Manual special clauses (free text from admin)
  drawSpecialClauses(ctx, data);

  // VIGÉSIMA SEGUNDA — Firmas
  await drawClause19_Signatures(ctx, data);

  // Anexo A: Entregables y Plazos (nueva página, después de las firmas)
  drawAnnexA_Deliverables(ctx, data);

  // Anexo B: Herramientas IA y subencargados (solo si aplica por servicios)
  drawAnnexB_AITools(ctx, data);

  return await doc.save();
}
