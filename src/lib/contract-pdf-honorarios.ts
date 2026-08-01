import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFPage } from "pdf-lib";
import type { ContractData } from "./contract-pdf";

// ── Layout Constants ───────────────────────────────────────────────────────
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
  "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA", "DÉCIMA TERCERA", "DÉCIMA CUARTA",
];

// ── Layout Context ─────────────────────────────────────────────────────────
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
  ctx.y = ctx.height - MARGIN;
}

function ensureSpace(ctx: LayoutCtx, needed: number) {
  if (ctx.y - needed < MARGIN) addNewPage(ctx);
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
  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    const tw = font.widthOfTextAtSize(testLine, fontSize);
    if (tw > maxWidth && line) {
      ctx.page.drawText(line, { x, y, size: fontSize, font, color: TEXT });
      y -= lineHeight;
      ensureSpace(ctx, lineHeight);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.page.drawText(line, { x, y, size: fontSize, font, color: TEXT });
    y -= lineHeight;
  }
  return y;
}

function drawClauseTitle(ctx: LayoutCtx, idx: number, title: string) {
  ensureSpace(ctx, 28);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: BORDER,
  });
  ctx.y -= 14;
  ctx.page.drawText(`${ORDINALS[idx]}`, {
    x: MARGIN,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText(title, {
    x: MARGIN + 90,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 18;
}

function drawClauseText(ctx: LayoutCtx, text: string, fontSize = SMALL_SIZE) {
  ensureSpace(ctx, 14);
  ctx.y = drawWrappedText(ctx, text, MARGIN, ctx.y, CONTENT_W, fontSize, ctx.font, 14);
  ctx.y -= 4;
}

function drawClauseParagraph(ctx: LayoutCtx, label: string, text: string) {
  ensureSpace(ctx, 16);
  const labelW = ctx.fontBold.widthOfTextAtSize(label, SMALL_SIZE);
  ctx.page.drawText(label, {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y = drawWrappedText(ctx, text, MARGIN + labelW, ctx.y, CONTENT_W - labelW, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 2;
}

function drawClauseItem(ctx: LayoutCtx, letter: string, text: string) {
  ensureSpace(ctx, 14);
  const prefix = `(${letter}) `;
  const preW = ctx.fontBold.widthOfTextAtSize(prefix, SMALL_SIZE);
  ctx.page.drawText(prefix, {
    x: MARGIN + 10,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y = drawWrappedText(ctx, text, MARGIN + 10 + preW, ctx.y, CONTENT_W - 10 - preW, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 1;
}

// ── Clause 1: Objeto de los servicios ──────────────────────────────────────
function drawClause1_Objeto(ctx: LayoutCtx, data: ContractData) {
  drawClauseTitle(ctx, 0, "OBJETO DE LOS SERVICIOS");

  const svcs = data.services || [];
  const svcNames = svcs.map((s) => s.name || "").filter(Boolean);

  let descripcion = `Por el presente instrumento, el Prestador se obliga a prestar al Cliente, en forma independiente y a honorarios, servicios profesionales de desarrollo y mantención de software y presencia digital, consistentes en continuar desarrollando e implementando, por avances, los requerimientos que el Cliente vaya definiendo y cargando en la plataforma de gestión Notion, comprendiendo especialmente los siguientes servicios:`;

  if (svcNames.length > 0) {
    const items = svcNames.map((n, i) => `(${String.fromCharCode(97 + i + 1)}) ${n}`);
    descripcion += " " + items.join("; ") + ".";
  }

  drawClauseText(ctx, descripcion);

  drawClauseText(ctx,
    "Las Partes dejan expresa constancia de que, a la fecha de este contrato, gran parte del proyecto web " +
    "se encuentra en desarrollo, por lo que los servicios se prestan bajo una modalidad de trabajo continuo " +
    "y por avances, y no como la entrega de un producto o resultado final y terminado. En consecuencia, la " +
    "obligación del Prestador es de medios y no de resultado, y su cumplimiento se satisface con la dedicación " +
    "diligente durante la vigencia del contrato al desarrollo de los requerimientos indicados."
  );
}

// ── Clause 2: Naturaleza de la relación ────────────────────────────────────
function drawClause2_Naturaleza(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 1, "NATURALEZA DE LA RELACIÓN. AUSENCIA DE VÍNCULO LABORAL");

  drawClauseText(ctx,
    "Las Partes declaran que la presente es una relación civil de prestación de servicios a honorarios, " +
    "regida por las normas del Código Civil y demás normativa aplicable, y que en ningún caso existe entre " +
    "ellas subordinación ni dependencia, ni vínculo de naturaleza laboral alguno regido por el Código del " +
    "Trabajo. El Prestador organiza su trabajo con plena autonomía técnica y profesional, no está sujeto a " +
    "jornada de trabajo, ni a supervisión directa, ni a exclusividad, ni a obligación de asistencia, y no " +
    "percibe remuneración ni beneficio de carácter laboral o previsional de cargo del Cliente."
  );
}

// ── Clause 3: Coordinación y disponibilidad ─────────────────────────────────
function drawClause3_Coordinacion(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 2, "COORDINACIÓN Y DISPONIBILIDAD");

  drawClauseText(ctx,
    "Sin que ello importe subordinación ni dependencia, y con el solo objeto de facilitar la coordinación, " +
    "reuniones y revisión de avances entre las Partes, el Prestador procurará mantener disponibilidad de " +
    "contacto en la franja horaria comprendida entre las 09:00 y las 13:00 horas, de lunes a viernes. " +
    "Esta disponibilidad tiene carácter meramente organizativo y no constituye jornada de trabajo ni " +
    "obligación de permanencia."
  );
}

// ── Clause 4: Honorarios ────────────────────────────────────────────────────
function drawClause4_Honorarios(ctx: LayoutCtx, data: ContractData) {
  drawClauseTitle(ctx, 3, "HONORARIOS");

  const netAmount = data.netAmount || data.totalAmount || 450000;
  const retentionRate = data.retentionRate ?? 15.25;
  const retentionDecimal = retentionRate / 100;
  const grossAmount = data.grossAmount || Math.round(netAmount / (1 - retentionDecimal));
  const retentionAmount = grossAmount - netAmount;

  const netFmt = netAmount.toLocaleString("es-CL");
  const grossFmt = grossAmount.toLocaleString("es-CL");
  const retentionFmt = retentionAmount.toLocaleString("es-CL");

  drawClauseText(ctx,
    `Por los servicios prestados durante la vigencia del presente contrato, las Partes acuerdan un honorario ` +
    `único, total y a todo evento de $${netFmt} (${netFmt} pesos chilenos), líquidos, esto es, la suma que ` +
    `el Prestador debe recibir efectivamente una vez aplicada la retención legal. Dicho honorario comprende ` +
    `la totalidad de los servicios señalados en la cláusula PRIMERA, sin desglose ni valorización individual ` +
    `por servicio, entendiéndose todos ellos incluidos en el mismo precio.`
  );

  drawClauseText(ctx,
    `Para su pago, el Prestador emitirá la correspondiente boleta de honorarios electrónica por el monto ` +
    `bruto que, aplicada la retención de segunda categoría vigente a la fecha de emisión (equivalente a un ` +
    `${retentionRate}% durante el año 2026, conforme a la Ley N° 21.133 y al artículo 74 N° 2 de la Ley sobre ` +
    `Impuesto a la Renta), arroje el líquido antes indicado; esto es, una boleta por un monto bruto aproximado ` +
    `de $${grossFmt}, con una retención aproximada de $${retentionFmt} que el Cliente enterará en arcas ` +
    `fiscales. Si la tasa legal de retención variare, el monto bruto de la boleta se ajustará de modo que ` +
    `el líquido recibido por el Prestador se mantenga en $${netFmt}.`
  );
}

// ── Clause 5: Forma y oportunidad del pago ─────────────────────────────────
function drawClause5_Pago(ctx: LayoutCtx, data: ContractData) {
  drawClauseTitle(ctx, 4, "FORMA Y OPORTUNIDAD DEL PAGO");

  const endDate = data.endDate || "2026-08-31";

  drawClauseText(ctx,
    `El honorario se pagará contra emisión de la respectiva boleta de honorarios electrónica, mediante ` +
    `transferencia bancaria a la cuenta que indique el Prestador, con fecha ${endDate} y, a más tardar, ` +
    `3 días hábiles después de la emisión de la boleta. El Cliente será responsable de practicar y enterar ` +
    `la retención legal correspondiente.`
  );
}

// ── Clause 6: Gastos e insumos del proyecto ─────────────────────────────────
function drawClause6_Gastos(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 5, "GASTOS E INSUMOS DEL PROYECTO");

  drawClauseText(ctx,
    "Serán de cargo exclusivo del Cliente todos los costos, gastos e insumos asociados a la operación " +
    "del proyecto, incluyendo, entre otros, hosting, dominio, licencias y servicios de terceros (APIs), " +
    "los que se encuentran contratados y pagados directamente por el Cliente. El honorario pactado no " +
    "comprende ni reembolsa dichos gastos."
  );
}

// ── Clause 7: Propiedad intelectual ─────────────────────────────────────────
function drawClause7_IP(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 6, "PROPIEDAD INTELECTUAL. RESERVA DE TITULARIDAD Y LICENCIA DE USO");

  drawClauseText(ctx,
    "El Prestador conserva la titularidad plena y exclusiva del código fuente, así como de todos los " +
    "derechos de autor y de propiedad intelectual sobre el software, desarrollos, componentes y demás " +
    "creaciones que ejecute en virtud de este contrato. El presente contrato no importa cesión ni " +
    "transferencia alguna de dichos derechos a favor del Cliente."
  );

  drawClauseText(ctx,
    "Sin perjuicio de lo anterior, el Prestador otorga al Cliente una licencia de uso limitada, no " +
    "exclusiva, intransferible y esencialmente revocable, para utilizar y mantener operativos los " +
    "desarrollos entregados, la que tendrá vigencia únicamente mientras se mantenga vigente una " +
    "relación contractual entre las Partes. Dicha licencia no comprende la entrega del código fuente " +
    "editable, ni faculta al Cliente para modificarlo, copiarlo, sublicenciarlo, cederlo o entregarlo " +
    "a terceros."
  );

  drawClauseText(ctx,
    "En consecuencia, terminada la relación contractual sin que se haya celebrado un contrato posterior " +
    "o sin que medie la adquisición del código fuente conforme al párrafo siguiente, la licencia caducará " +
    "de pleno derecho y el Cliente no adquirirá derecho alguno sobre el código fuente ni sobre los " +
    "desarrollos. El Prestador no estará obligado a hacer entrega del código fuente ni de credenciales " +
    "al término del presente contrato."
  );

  drawClauseText(ctx,
    "La transferencia de la propiedad del código fuente y/o de los derechos de autor sobre los desarrollos " +
    "requerirá, en todo caso, acuerdo escrito y separado entre las Partes y el pago del precio que para " +
    "tal efecto se convenga. Los derechos morales del autor se entienden en todo caso reservados al " +
    "Prestador, conforme a la Ley N° 17.336."
  );
}

// ── Clause 8: Confidencialidad ──────────────────────────────────────────────
function drawClause8_Confidencialidad(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 7, "CONFIDENCIALIDAD");

  drawClauseText(ctx,
    "Cada Parte se obliga a mantener estricta reserva y confidencialidad respecto de toda información " +
    "técnica, comercial, financiera o de negocio de la otra Parte a la que acceda con ocasión de este " +
    "contrato, incluyendo requerimientos, documentación, credenciales, código y datos, obligándose a no " +
    "divulgarla ni utilizarla para fines distintos de la ejecución del presente contrato. Esta obligación " +
    "subsistirá aun después de terminada la relación contractual."
  );
}

// ── Clause 9: Vigencia y plazo ──────────────────────────────────────────────
function drawClause9_Vigencia(ctx: LayoutCtx, data: ContractData) {
  drawClauseTitle(ctx, 8, "VIGENCIA Y PLAZO");

  const startDate = data.startDate || "1";
  const endDate = data.endDate || "31 de agosto de 2026";

  drawClauseText(ctx,
    `El presente contrato regirá desde ${startDate} y hasta ${endDate}, ambas fechas inclusive, y no ` +
    `contempla renovación automática alguna. Las Partes dejan constancia de su intención de celebrar un ` +
    `nuevo contrato para el período siguiente, con honorarios distintos a los aquí pactados, lo que en ` +
    `todo caso quedará sujeto a un acuerdo escrito posterior, sin que el presente contrato genere ` +
    `obligación de continuidad para ninguna de ellas.`
  );
}

// ── Clause 10: Término anticipado ───────────────────────────────────────────
function drawClause10_Termino(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 9, "TÉRMINO ANTICIPADO");

  drawClauseText(ctx,
    "Cualquiera de las Partes podrá poner término anticipado al presente contrato en caso de " +
    "incumplimiento grave de las obligaciones de la otra, mediante aviso por escrito. Los servicios " +
    "efectivamente prestados hasta la fecha de término deberán pagarse a prorrata, previa emisión de " +
    "la correspondiente boleta de honorarios."
  );
}

// ── Clause 11: Obligaciones tributarias ─────────────────────────────────────
function drawClause11_Tributarias(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 10, "OBLIGACIONES TRIBUTARIAS");

  drawClauseText(ctx,
    "El Prestador declara encontrarse con inicio de actividades vigente ante el Servicio de Impuestos " +
    "Internos y habilitado para emitir boletas de honorarios electrónicas. Cada Parte asumirá los tributos " +
    "que legalmente le correspondan. Las Partes reconocen que la retención practicada tiene el carácter " +
    "de pago provisional y se revisa en la respectiva Operación Renta, pudiendo destinarse al " +
    "financiamiento de las cotizaciones obligatorias del trabajador independiente."
  );
}

// ── Clause 12: Modificaciones ───────────────────────────────────────────────
function drawClause12_Modificaciones(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 11, "MODIFICACIONES");

  drawClauseText(ctx,
    "Toda modificación al presente contrato deberá constar por escrito y ser firmada por ambas Partes."
  );
}

// ── Clause 13: Domicilio y competencia ──────────────────────────────────────
function drawClause13_Domicilio(ctx: LayoutCtx, data: ContractData) {
  drawClauseTitle(ctx, 12, "DOMICILIO Y COMPETENCIA");

  const jurisdiction = data.jurisdiction || "Puerto Varas";

  drawClauseText(ctx,
    `Para todos los efectos legales derivados del presente contrato, las Partes fijan su domicilio en ` +
    `la comuna y ciudad de ${jurisdiction}, y se someten a la jurisdicción de sus tribunales ordinarios ` +
    `de justicia.`
  );
}

// ── Clause 14: Ejemplares ────────────────────────────────────────────────────
function drawClause14_Ejemplares(ctx: LayoutCtx) {
  drawClauseTitle(ctx, 13, "EJEMPLARES");

  drawClauseText(ctx,
    "El presente contrato se firma en dos ejemplares de idéntico tenor y fecha, quedando uno en poder " +
    "de cada Parte."
  );
}

// ── Signatures ──────────────────────────────────────────────────────────────
async function drawSignatures(ctx: LayoutCtx, data: ContractData) {
  // Salto antes de firmas
  ensureSpace(ctx, 120);
  ctx.y -= 10;

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: BORDER,
  });
  ctx.y -= 16;

  const prestadorNombre = data.prestadorNombreCivil
    ? `${data.prestadorNombreCivil}, RUT ${data.prestadorRut || ""}`
    : `Matías Ignacio Pérez Nauto, RUT 20.070.072-4`;

  const clientName = data.clientName || "Cliente";

  // Firma del prestador (admin)
  const hasAdminSig = !!data.adminSignature;
  const hasClientSig = !!data.clientSignature;

  // Si tenemos firma del prestador, la dibujamos
  if (hasAdminSig) {
    try {
      const sigData = data.adminSignature!.replace(/^data:image\/\w+;base64,/, "");
      const sigBytes = Uint8Array.from(atob(sigData), (c) => c.charCodeAt(0));
      let sigImage;
      try {
        sigImage = await ctx.doc.embedPng(sigBytes);
      } catch {
        sigImage = await ctx.doc.embedJpg(sigBytes);
      }
      const aspect = sigImage.width / sigImage.height;
      const sigW = 120;
      const sigH = sigW / aspect;
      ctx.page.drawImage(sigImage, {
        x: MARGIN,
        y: ctx.y - sigH + 10,
        width: sigW,
        height: sigH,
      });
      ctx.y -= sigH + 8;
    } catch {
      ctx.y -= 30;
    }
  } else {
    // Línea para firma en blanco
    ctx.y -= 8;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: MARGIN + 160, y: ctx.y },
      thickness: 1,
      color: TEXT,
    });
    ctx.y -= 22;
  }

  ctx.page.drawText("MATÍAS IGNACIO PÉREZ NAUTO", {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 12;
  ctx.page.drawText("RUT 20.070.072-4", {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 12;
  ctx.page.drawText("El Prestador — \"Mtsprz\"", {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.font,
    color: MUTED,
  });

  // Fecha firma prestador
  if (data.adminSignedAt) {
    ctx.y -= 14;
    ctx.page.drawText(`Firmado: ${data.adminSignedAt}`, {
      x: MARGIN,
      y: ctx.y,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
  }

  // ── Firma del Cliente ──
  ctx.y -= 40;
  ensureSpace(ctx, 100);

  if (hasClientSig) {
    try {
      const sigData = data.clientSignature!.replace(/^data:image\/\w+;base64,/, "");
      const sigBytes = Uint8Array.from(atob(sigData), (c) => c.charCodeAt(0));
      let sigImage;
      try {
        sigImage = await ctx.doc.embedPng(sigBytes);
      } catch {
        sigImage = await ctx.doc.embedJpg(sigBytes);
      }
      const aspect = sigImage.width / sigImage.height;
      const sigW = 120;
      const sigH = sigW / aspect;
      ctx.page.drawImage(sigImage, {
        x: MARGIN,
        y: ctx.y - sigH + 10,
        width: sigW,
        height: sigH,
      });
      ctx.y -= sigH + 8;
    } catch {
      ctx.y -= 30;
    }
  } else {
    ctx.y -= 8;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: MARGIN + 160, y: ctx.y },
      thickness: 1,
      color: TEXT,
    });
    ctx.y -= 22;
  }

  ctx.page.drawText(clientName, {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 12;
  ctx.page.drawText(data.clientRut ? `RUT ${data.clientRut}` : "", {
    x: MARGIN,
    y: ctx.y,
    size: SMALL_SIZE,
    font: ctx.font,
    color: MUTED,
  });

  if (data.clientRepresentante) {
    ctx.y -= 14;
    ctx.page.drawText(`p.p. ${data.clientRepresentante}`, {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.font,
      color: MUTED,
    });
  }

  // Fecha firma cliente
  if (data.clientSignedAt) {
    ctx.y -= 14;
    ctx.page.drawText(`Firmado: ${data.clientSignedAt}`, {
      x: MARGIN,
      y: ctx.y,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
  }

  // ── Datos del contrato al pie ──
  ctx.y -= 30;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: ctx.width - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: BORDER,
  });
  ctx.y -= 16;

  ctx.page.drawText(`Contrato N° ${data.contractNumber}`, {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  ctx.page.drawText(`Fecha: ${data.createdAt || new Date().toLocaleDateString("es-CL")}`, {
    x: ctx.width - MARGIN - 120,
    y: ctx.y,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

// ── Header ─────────────────────────────────────────────────────────────────
function drawHeader(ctx: LayoutCtx, data: ContractData) {
  const { height, width } = ctx;

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

  ctx.page.drawText("CONTRATO DE PRESTACIÓN DE SERVICIOS A HONORARIOS", {
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
}

// ── Preámbulo: identificación de partes ─────────────────────────────────────
function drawPreamble_Parties(ctx: LayoutCtx, data: ContractData) {
  const prestadorRut = data.prestadorRut || "20.070.072-4";
  const prestadorNombre = data.prestadorNombreCivil
    ? `${data.prestadorNombreCivil}`
    : "don MATÍAS IGNACIO PÉREZ NAUTO";

  const clientNotifEmail = data.clientNotifEmail || data.clientEmail;

  const dateStr = data.createdAt || new Date().toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const preamble =
    `En [ciudad], a ${dateStr}, entre las partes que a continuación se individualizan, se ha convenido ` +
    `el siguiente contrato de prestación de servicios a honorarios:`;

  drawClauseText(ctx, preamble);
  ctx.y -= 4;

  // Prestador
  drawClauseParagraph(ctx, "Parte Prestadora: ",
    `${prestadorNombre}, cédula nacional de identidad N° ${prestadorRut}, de profesión Desarrollador ` +
    `Full Stack, quien presta sus servicios bajo el nombre comercial o de fantasía "Mtsprz", con ` +
    `domicilio en calle San Carlos, comuna de Puerto Varas, Región de Los Lagos, correo electrónico ` +
    `${data.prestadorNotifEmail || "contacto@mtsprz.org"}, en adelante e indistintamente el "Prestador".`
  );

  // Cliente
  const isCompanyRut = /^[5-9]\d{7,}/.test((data.clientRut || "").replace(/[.\-]/g, ""));
  const clientLabel = isCompanyRut
    ? `${data.clientName}, ${data.clientRut || ""}, representada legalmente por ${data.clientRepresentante || "[representante legal]"}, todos con domicilio en ${data.clientAddress || "[dirección]"}, correo electrónico ${clientNotifEmail}, en adelante e indistintamente el "Cliente"`
    : `${data.clientName}, cédula nacional de identidad N° ${data.clientRut || ""}, con domicilio en ${data.clientAddress || "[dirección]"}, correo electrónico ${clientNotifEmail}, en adelante e indistintamente el "Cliente"`;

  drawClauseParagraph(ctx, "Parte Cliente: ", clientLabel);

  drawClauseText(ctx,
    "quienes en su conjunto se denominarán \"las Partes\", se conviene lo siguiente:"
  );
}

// ── Main Entry ──────────────────────────────────────────────────────────────
export async function generateHonorariosPdf(data: ContractData): Promise<Uint8Array> {
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

  // ── HEADER ──
  drawHeader(ctx, data);

  // ── PREÁMBULO: Partes ──
  drawPreamble_Parties(ctx, data);
  ctx.y -= 6;

  // ── 14 CLAUSES ──
  drawClause1_Objeto(ctx, data);
  drawClause2_Naturaleza(ctx);
  drawClause3_Coordinacion(ctx);
  drawClause4_Honorarios(ctx, data);
  drawClause5_Pago(ctx, data);
  drawClause6_Gastos(ctx);
  drawClause7_IP(ctx);
  drawClause8_Confidencialidad(ctx);
  drawClause9_Vigencia(ctx, data);
  drawClause10_Termino(ctx);
  drawClause11_Tributarias(ctx);
  drawClause12_Modificaciones(ctx);
  drawClause13_Domicilio(ctx, data);
  drawClause14_Ejemplares(ctx);

  // ── FIRMAS ──
  await drawSignatures(ctx, data);

  return await doc.save();
}
