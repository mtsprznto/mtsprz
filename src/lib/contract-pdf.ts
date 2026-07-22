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

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && line) {
      ctx.page.drawText(line, { x, y: currentY, size: fontSize, font });
      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.page.drawText(line, { x, y: currentY, size: fontSize, font });
    currentY -= lineHeight;
  }
  return currentY;
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

  const prestadorRows = [
    { label: "PRESTADOR", value: prestadorNombre },
    { label: "RUT PRESTADOR", value: prestadorRut },
    { label: "DOMICILIO PRESTADOR", value: "Puerto Varas, Región de Los Lagos, Chile" },
    { label: "CORREO PRESTADOR", value: data.prestadorNotifEmail || "contacto@mtsprz.org" },
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
    { label: "CORREO CLIENTE", value: data.clientEmail },
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
    "reconociendo expresamente la independencia del Prestador."
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

  // Header row
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: CONTENT_W,
    height: 24,
    color: SECTION_BG,
  });
  ctx.page.drawText("Servicio", {
    x: MARGIN + 8,
    y: ctx.y + 4,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.page.drawText("Valor", {
    x: PAGE_W - MARGIN - 80,
    y: ctx.y + 4,
    size: SMALL_SIZE,
    font: ctx.fontBold,
    color: TEXT,
  });
  ctx.y -= 28;

  // Service rows
  let totalCalc = 0;
  for (const svc of data.services) {
    ensureSpace(ctx, 26);
    const rectY = ctx.y - 2;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: rectY,
      width: CONTENT_W,
      height: 20,
      color: ctx.y % 40 === ctx.y ? WHITE : rgb(0.98, 0.98, 0.99),
    });
    ctx.page.drawText(svc.name, {
      x: MARGIN + 8,
      y: ctx.y + 2,
      size: SMALL_SIZE,
      font: ctx.font,
      color: TEXT,
    });
    ctx.page.drawText(`$${(svc.price || 0).toLocaleString("es-CL")}`, {
      x: PAGE_W - MARGIN - 80,
      y: ctx.y + 2,
      size: SMALL_SIZE,
      font: ctx.font,
      color: TEXT,
    });
    totalCalc += svc.price || 0;
    ctx.y -= 22;
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

  const totalAmount = data.totalAmount || totalCalc;
  ctx.page.drawText("TOTAL", {
    x: PAGE_W - MARGIN - 160,
    y: ctx.y,
    size: NORMAL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.page.drawText(`$${totalAmount.toLocaleString("es-CL")}`, {
    x: PAGE_W - MARGIN - 80,
    y: ctx.y,
    size: NORMAL_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 24;
}

function drawClause5_ObligationsPrestador(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 4, "OBLIGACIONES DEL PRESTADOR");

  const items = [
    "Ejecutar los servicios con estándar profesional y la diligencia exigible conforme al Artículo 1547 del Código Civil (culpa leve).",
    "Cumplir los plazos y condiciones pactadas en el presente contrato, de conformidad con el Artículo 2009 del Código Civil.",
    "Mantener informado al Cliente del estado de avance de los servicios y cualquier eventualidad que pudiera afectar su ejecución.",
    "Entregar los códigos fuentes, archivos editables y activos digitales producidos. Los avances parciales " +
    "se pondrán a disposición del Cliente en un entorno de pruebas (staging) o vista previa durante la " +
    "ejecución del proyecto para su revisión y aprobación progresiva. La entrega definitiva del código " +
    "fuente, archivos editables y activos finales se realizará al momento del pago total de los honorarios, " +
    "mediante repositorio privado (GitHub/GitLab) y/o descarga directa, en formatos estándar de la industria " +
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
  ];
  const letters = "abcde".split("");
  for (let i = 0; i < items.length; i++) {
    drawClauseItem(ctx, letters[i], items[i]);
  }
}

function drawClause7_Payment(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 6, "HONORARIOS Y FORMA DE PAGO");

  const total = data.totalAmount.toLocaleString("es-CL");
  const retentionRate = "15,25%";

  drawClauseParagraph(ctx, "Monto: ",
    `El valor total de los servicios asciende a $${total} CLP (${total} pesos chilenos). El Prestador es persona natural que emite boleta de honorarios, por lo que estos servicios no están afectos a IVA. El valor corresponde al monto bruto de las boletas de honorarios; la retención legal se descuenta de dicho monto.`
  );

  let paymentDetail: string;
  switch (data.paymentMethod) {
    case "contado":
      paymentDetail = "Pago único al contado contra la aceptación del presente contrato.";
      break;
    case "50_50":
      paymentDetail = "50% del valor total al inicio de los servicios y 50% a la entrega y recepción conforme de los trabajos.";
      break;
    case "hitos":
      paymentDetail = data.paymentTerms || "Según los hitos detallados y acordados entre las partes.";
      break;
    default:
      paymentDetail = data.paymentTerms || "Según lo acordado entre las partes.";
  }
  drawClauseParagraph(ctx, "Modalidad de pago: ", paymentDetail);

  // Monthly services note
  const hasMonthly = data.services?.some(s => s.is_monthly);
  if (hasMonthly) {
    drawClauseParagraph(ctx, "Servicios recurrentes: ",
      "Los servicios marcados como \"(mensual)\" en el Anexo A se facturan y pagan por mes adelantado, " +
      "de forma independiente al pago de los servicios puntuales. El valor indicado en el Anexo A " +
      "corresponde al valor mensual de cada servicio recurrente."
    );
  }

  drawClauseParagraph(ctx, "Medio de pago: ",
    "Transferencia electrónica a la cuenta bancaria del Prestador que se indicará en la boleta de honorarios respectiva."
  );

  drawClauseText(ctx,
    `Boleta de honorarios: El Prestador emitirá boleta electrónica de honorarios por cada pago recibido, ` +
    `conforme al Artículo 88 del Código Tributario. El Cliente, en su calidad de contribuyente con contabilidad ` +
    `completa, deberá enterar la retención del ${retentionRate} en el Servicio de Impuestos Internos (SII), ` +
    `de acuerdo con la tasa vigente a la fecha del presente contrato en virtud del calendario progresivo ` +
    `de la Ley N° 21.133.`
  );

  drawClauseParagraph(ctx, "Cláusula penal por mora del Cliente (Art. 1535 CC): ",
    "En caso de mora en el pago de cualquier cuota u hito acordado, el Cliente pagará al Prestador, " +
    "a título de pena convencional, una suma equivalente al 5% del monto adeudado por cada semana de " +
    "atraso, con un máximo del 20% del total del contrato. La pena convencional reemplaza toda otra " +
    "indemnización moratoria, salvo el reajuste conforme al Artículo 1559 del Código Civil. " +
    "El Prestador podrá exigir simultáneamente el cumplimiento de la obligación principal y la pena, " +
    "conforme al inciso 2° del Artículo 1537 del Código Civil."
  );

  drawClauseParagraph(ctx, "Cláusula penal por retraso en entrega de insumos: ",
    "Si el Cliente incurre en mora en la entrega de información, accesos o insumos necesarios para la " +
    "ejecución de los servicios, el plazo de entrega del Prestador se prorrogará automáticamente en igual " +
    "número de días hábiles al retraso del Cliente, sin que ello constituya incumplimiento del Prestador."
  );
}

function drawClause8_Term(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 7, "PLAZO, VIGENCIA Y TÉRMINO");

  const startDate = data.startDate || "—";
  const endDate = data.endDate || "—";

  drawClauseParagraph(ctx, "Duración: ",
    `El presente contrato tendrá una vigencia de ${data.durationMonths || 1} mes(es), contados desde el ${startDate}, ` +
    `con fecha estimada de término el ${endDate}.`
  );

  drawClauseParagraph(ctx, "Término anticipado: ",
    "El contrato podrá terminar anticipadamente por: (a) mutuo acuerdo por escrito entre las partes; " +
    "(b) incumplimiento grave de cualquiera de las partes, aplicándose la condición resolutoria tácita del " +
    "Artículo 1489 del Código Civil; (c) caso fortuito o fuerza mayor; (d) aviso escrito de cualquiera de las partes " +
    "con al menos 30 días de anticipación."
  );

  drawClauseParagraph(ctx, "Efectos del término: ",
    "Al término del contrato, el Cliente pagará los servicios efectivamente ejecutados y recibidos " +
    "conforme a la fecha, y el Prestador devolverá toda la información confidencial del Cliente en su poder. " +
    "Respecto de los servicios no concluidos a la fecha de término, el Prestador entregará los avances " +
    "y activos parciales producidos, y el Cliente pagará una proporción del valor del servicio según " +
    "el avance acreditado. En caso de desacuerdo sobre el avance, las partes se someterán a mediación."
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
    "Correcciones menores (una ronda) están incluidas dentro del valor contratado. Modificaciones sustanciales " +
    "al alcance original se regirán por la cláusula DÉCIMA CUARTA (Modificaciones)."
  );

  drawClauseParagraph(ctx, "Aprobación tácita: ",
    "Si el Cliente no formula observaciones dentro del plazo de " + revisionDays + " días hábiles, " +
    "se entenderá que el entregable ha sido recibido conforme y aprobado en todas sus partes."
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

  drawClauseText(ctx,
    "El Prestador cede y transfiere al Cliente todos los derechos patrimoniales sobre los códigos fuentes, " +
    "diseños, activos digitales y obras creadas en virtud del presente contrato, de conformidad con la " +
    "Ley N° 17.336 sobre Propiedad Intelectual."
  );

  drawClauseParagraph(ctx, "Transferencia efectiva: ",
    "La cesión de derechos patrimoniales se hará efectiva contra el pago total de los honorarios " +
    "estipulados en el presente contrato. En consecuencia, mientras no se complete el pago total, " +
    "el Cliente no adquiere los derechos patrimoniales sobre las obras y su uso de los entregables " +
    "se considerará una licencia precaria y revocable, limitada a los fines de revisión y prueba, " +
    "sin derecho a explotación comercial, publicación ni modificación de las obras. " +
    "Tratándose de sitios web, sistemas, automatizaciones o plataformas desarrolladas: el paso a " +
    "producción, la activación de herramientas de indexación y posicionamiento (incluyendo Google " +
    "Search Console, datos estructurados y servicios SEO que requieran el sitio publicado), la " +
    "entrega de credenciales de administración y el acceso a los entornos productivos se producirán " +
    "únicamente contra el pago total de los honorarios. Hasta ese momento, los sistemas permanecerán " +
    "en un entorno de pruebas (staging) o acceso restringido, sin uso productivo ni indexación."
  );

  drawClauseParagraph(ctx, "Derechos morales: ",
    "El Prestador conserva los derechos morales sobre las obras creadas, incluyendo el derecho " +
    "de paternidad e integridad de la obra, conforme al Artículo 14 de la Ley N° 17.336."
  );

  drawClauseParagraph(ctx, "Portafolio: ",
    "El Prestador podrá utilizar los trabajos realizados en su portafolio profesional, salvo que las partes " +
    "acuerden expresamente lo contrario por escrito."
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
    "Al término del contrato, la Parte Receptora deberá devolver o destruir toda la Información Confidencial recibida.",
  ];
  const letters = "abcde".split("");
  for (let i = 0; i < confItems.length; i++) {
    drawClauseItem(ctx, letters[i], confItems[i]);
  }
}

function drawClause13_DataProtection(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 12, "PROTECCIÓN DE DATOS PERSONALES");

  drawClauseText(ctx,
    "Ambas partes se obligan al cumplimiento de la Ley N° 19.628 sobre Protección de la Vida Privada. " +
    "Asimismo, tendrán presente lo dispuesto en la Ley N° 21.719 (publicada el 13 de diciembre de 2024), " +
    "que crea la Agencia de Protección de Datos Personales, cuya entrada en vigencia está prevista para " +
    "el 1 de diciembre de 2026, y que resultará aplicable si el presente contrato se extiende más allá de dicha fecha."
  );

  const dpItems = [
    "Los datos personales a los que tenga acceso el Prestador serán utilizados exclusivamente para la ejecución del objeto del contrato.",
    "El Prestador adoptará las medidas de seguridad técnicas y organizativas necesarias para proteger los datos personales contra acceso no autorizado, pérdida o destrucción.",
    "El Prestador notificará al Cliente cualquier incidente de seguridad que involucre datos personales en un plazo máximo de 72 horas desde que tome conocimiento del mismo, conforme al estándar establecido en la Ley N° 21.719.",
    "Cuando el Prestador acceda a bases de datos o contactos del Cliente (por ejemplo, en integraciones CRM), actuará como encargado de tratamiento: tratará los datos exclusivamente bajo instrucciones del Cliente, no los utilizará para fines propios ni los comunicará a terceros, y al término del contrato los devolverá o eliminará, salvo obligación legal de conservación.",
  ];
  const letters = "abcd".split("");
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
    "Las modificaciones debidamente aprobadas modificarán el objeto del contrato en los términos acordados, " +
    "rigiéndose por el Artículo 1545 del Código Civil (efecto relativo de los contratos)."
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

  drawClauseParagraph(ctx, "Período de garantía: ",
    `El Prestador garantiza los servicios prestados por un plazo de ${warrantyDays} días corridos ` +
    `contados desde la fecha de entrega y recepción conforme de cada entregable.`
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
    "La responsabilidad total del Prestador por cualquier causa derivada del presente contrato se limita " +
    "al monto total de los honorarios efectivamente pagados por el Cliente. Quedan excluidos los daños " +
    "indirectos, pérdida de ingresos, lucro cesante y daños emergentes no cubiertos por el límite anterior. " +
    "La exclusión anterior no aplica en caso de dolo o culpa grave del Prestador (Artículo 44 del Código Civil)."
  );
}

function drawClause17_ForceMajeure(ctx: LayoutCtx, data: ContractData): void {
  drawClauseTitle(ctx, 16, "FUERZA MAYOR");

  drawClauseText(ctx,
    "Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando dicho " +
    "incumplimiento se deba a caso fortuito o fuerza mayor, conforme a los Artículos 45 y 1545 " +
    "del Código Civil."
  );

  const fmItems = [
    "Se considerarán causales de fuerza mayor: desastres naturales, guerra, pandemia, atentados terroristas, huelgas generales, corte de servicios esenciales (electricidad, internet), y cualquier otro evento imprevisible, irresistible o inevitable.",
    "La parte afectada deberá notificar a la otra dentro de las 24 horas siguientes de ocurrido el evento.",
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
    "5 días hábiles de anticipación mediante comunicación expresa."
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
}

async function drawClause19_Signatures(ctx: LayoutCtx, data: ContractData): Promise<void> {
  drawClauseTitle(ctx, 18, "FIRMAS");

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
  const hasScaping = serviceNames.some(n =>
    n.includes("scrap") || n.includes("etl") || n.includes("datos") || n.includes("prospect")
  );
  const hasAds = serviceNames.some(n =>
    n.includes("ads") || n.includes("google") || n.includes("meta") || n.includes("pauta") || n.includes("campan")
  );

  if (!hasScaping && !hasAds) return;

  ensureSpace(ctx, 60);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: BORDER,
  });
  ctx.y -= 20;
  ctx.page.drawText("CLÁUSULAS ESPECIALES APLICABLES AL OBJETO DEL CONTRATO", {
    x: MARGIN,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 20;

  if (hasScaping) {
    ensureSpace(ctx, 120);
    ctx.page.drawText("A. RECOLECCIÓN AUTOMATIZADA DE DATOS (WEB SCRAPING / ETL)", {
      x: MARGIN,
      y: ctx.y,
      size: SMALL_SIZE,
      font: ctx.fontBold,
      color: TEXT,
    });
    ctx.y -= 16;

    drawClauseText(ctx,
      "En lo relativo a los servicios de recolección y procesamiento automatizado de datos, el Cliente " +
      "declara y garantiza: (i) que tiene derecho o autorización suficiente sobre las fuentes de datos " +
      "objeto del servicio; (ii) que el uso que dará a los datos recolectados es lícito y no infringe " +
      "los términos de servicio de los sitios fuente, derechos de autor, ni la normativa de protección " +
      "de datos personales aplicable; (iii) que, en la medida que los datos recolectados incluyan datos " +
      "de carácter personal, el Cliente actúa como responsable del tratamiento y cuenta con la base " +
      "legal habilitante para su recolección y uso, conforme a la Ley N° 19.628."
    );
    drawClauseText(ctx,
      "El Cliente se obliga a indemnizar y mantener indemne al Prestador frente a cualquier reclamo, " +
      "demanda, multa o perjuicio proveniente de terceros — incluyendo los titulares de los sitios " +
      "fuente, personas cuyos datos sean recolectados, o autoridades — que deriven de la ilicitud del " +
      "uso de los datos o de la infracción de términos de servicio de terceros, cuando dicha ilicitud " +
      "sea atribuible a instrucciones o al uso que el Cliente dé al servicio. La obligación de " +
      "indemnidad subsistirá por 3 años desde el término del contrato."
    );
    ctx.y -= 4;
  }

  if (hasAds) {
    ensureSpace(ctx, 100);
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
      "El valor de los honorarios por gestión de campañas publicitarias digitales cubre exclusivamente " +
      "el servicio profesional de configuración, optimización y reporte de campañas. No incluye, bajo " +
      "ningún concepto, la inversión publicitaria (ad spend) que se pague a las plataformas (Google, " +
      "Meta u otras), la que es un gasto directo del Cliente a dichas plataformas, facturado y cobrado " +
      "por ellas de forma independiente."
    );
    drawClauseText(ctx,
      "El Cliente es responsable de mantener vigentes y con saldo suficiente las cuentas publicitarias " +
      "en las plataformas respectivas. El Prestador no responde por la interrupción de campañas " +
      "derivada de falta de fondos, suspensión de cuentas por parte de la plataforma, ni por cambios " +
      "en las políticas publicitarias de dichas plataformas que afecten el rendimiento de las campañas."
    );
    ctx.y -= 4;
  }
}

// ── Special Clauses (if any) ────────────────────────────────────────────────

function drawSpecialClauses(ctx: LayoutCtx, data: ContractData): void {
  if (!data.specialClauses) return;

  ensureSpace(ctx, 120);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 20;

  ctx.page.drawText("CLÁUSULAS ESPECIALES ADICIONALES", {
    x: MARGIN,
    y: ctx.y,
    size: CLAUSE_TITLE_SIZE,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 20;

  ctx.y = drawWrappedText(ctx, data.specialClauses, MARGIN, ctx.y, CONTENT_W, SMALL_SIZE, ctx.font, 14);
  ctx.y -= 16;
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

  const startD = data.startDate || "la fecha de inicio";
  const endD = data.endDate || "la fecha de término";

  for (let idx = 0; idx < data.services.length; idx++) {
    const svc = data.services[idx];
    ensureSpace(ctx, 60);

    // Service header with number and price
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 2,
      width: CONTENT_W,
      height: 24,
      color: SECTION_BG,
    });
    const priceStr = (svc.price || 0).toLocaleString("es-CL");
    const monthlyTag = svc.is_monthly ? " (mensual)" : "";
    ctx.page.drawText(`${idx + 1}. ${svc.name} — $${priceStr}${monthlyTag}`, {
      x: MARGIN + 8,
      y: ctx.y + 4,
      size: NORMAL_SIZE,
      font: ctx.fontBold,
      color: PRIMARY,
    });
    ctx.y -= 28;

    // Plazo de ejecución
    if (svc.is_monthly) {
      drawClauseParagraph(ctx, "Modalidad: ",
        `Servicio recurrente mensual. El valor de $${priceStr} corresponde a cada mes de servicio. ` +
        `Se factura y paga mensualmente por adelantado. El servicio se presta durante todo el ` +
        `período del contrato.`
      );
    } else {
      drawClauseParagraph(ctx, "Plazo de ejecución: ",
        `Fecha de inicio: ${startD} — Fecha de término estimada: ${endD}. ` +
        `Las partes acuerdan definir los hitos específicos y sus fechas de entrega mediante ` +
        `comunicación escrita dentro de los 5 días hábiles siguientes a la firma del contrato, ` +
        `los que se entenderán incorporados al presente Anexo A como parte integrante. ` +
        `La falta de definición de hitos en dicho plazo habilitará al Prestador para gestionar ` +
        `los entregables en el orden y tiempos que estime convenientes, dentro del plazo total.`
      );
    }

    // Deliverables list or fallback
    if (svc.deliverables && svc.deliverables.length > 0) {
      ctx.page.drawText("Entregables:", {
        x: MARGIN,
        y: ctx.y,
        size: SMALL_SIZE,
        font: ctx.fontBold,
        color: TEXT,
      });
      ctx.y -= 14;
      for (let di = 0; di < svc.deliverables.length; di++) {
        ensureSpace(ctx, 16);
        ctx.page.drawText(`• ${svc.deliverables[di]}`, {
          x: MARGIN + 12,
          y: ctx.y,
          size: SMALL_SIZE,
          font: ctx.font,
          color: TEXT,
        });
        ctx.y -= 16;
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

    // Hosting notice if service includes hosting as deliverable
    const hasHosting = svc.deliverables?.some(d =>
      d.toLowerCase().includes("hosting") || d.toLowerCase().includes("cdn")
    );
    if (hasHosting) {
      ctx.y -= 2;
      drawClauseParagraph(ctx, "Nota sobre hosting e infraestructura: ",
        "El costo de alojamiento web (hosting), SSL y CDN incluido en este servicio corresponde al " +
        "traspaso al costo de infraestructura contratada a terceros proveedores, y no constituye " +
        "servicio personal del Prestador. El Prestador actúa como intermediario de dicho gasto y lo " +
        "facturará separadamente o lo desglosa como item dentro del presente servicio a fin de " +
        "mantener la claridad tributaria. El período de hosting se contará desde la puesta en " +
        "producción del sitio, la que ocurrirá una vez recibido el pago total de los honorarios. " +
        "Transcurrido el período incluido, la renovación será por cuenta del Cliente. El Prestador " +
        "no será responsable por caídas imputables al proveedor de infraestructura. Al término, " +
        "el Cliente podrá solicitar migración a un proveedor de su elección."
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
}

// ── Main PDF Generator ──────────────────────────────────────────────────────

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

  // Auto clauses (scraping indemnity, ads spend exclusion) — injected by service type
  drawAutoSpecialClauses(ctx, data);

  // Manual special clauses (free text from admin)
  drawSpecialClauses(ctx, data);

  // Anexo A: Entregables y Plazos (nueva página)
  drawAnnexA_Deliverables(ctx, data);

  // Signatures
  await drawClause19_Signatures(ctx, data);

  return await doc.save();
}
