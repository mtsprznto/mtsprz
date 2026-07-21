import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFPage } from "pdf-lib";

interface ContractData {
  contractNumber: string;
  clientName: string;
  clientRut: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  companyName: string;
  services: { id: string; name: string; description: string; price: number }[];
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
}

function drawWrappedText(page: PDFPage, text: string, x: number, y: number, maxWidth: number, fontSize: number, font: any, lineHeight: number): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font });
      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font });
    currentY -= lineHeight;
  }

  return currentY;
}

export async function generateContractPdf(data: ContractData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 56;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const primaryColor = rgb(0.39, 0.4, 0.95);
  const textColor = rgb(0.15, 0.15, 0.15);
  const mutedColor = rgb(0.5, 0.5, 0.5);
  const sectionBg = rgb(0.96, 0.97, 0.98);
  const borderColor = rgb(0.88, 0.88, 0.9);
  const white = rgb(1, 1, 1);
  const black = rgb(0, 0, 0);
  const green = rgb(0.06, 0.73, 0.51);

  const lineHeight = 16;
  const smallSize = 9;
  const normalSize = 10;
  const titleSize = 16;

  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: rgb(0.01, 0.01, 0.01),
  });

  page.drawRectangle({
    x: 0,
    y: height - 4,
    width,
    height: 4,
    color: primaryColor,
  });

  page.drawText("M T S P R Z", {
    x: margin,
    y: height - 72,
    size: 22,
    font: fontBold,
    color: white,
  });

  page.drawText("Soluciones Digitales", {
    x: margin,
    y: height - 92,
    size: 9,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  page.drawText("CONTRATO DE PRESTACIÓN DE SERVICIOS", {
    x: margin,
    y: height - 140,
    size: titleSize,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText(`N° ${data.contractNumber}`, {
    x: margin,
    y: height - 162,
    size: normalSize,
    font: fontBold,
    color: textColor,
  });

  const statusText = data.adminSignature ? "FIRMADO" : "PENDIENTE DE FIRMA";
  const statusColor = data.adminSignature ? green : primaryColor;

  page.drawRectangle({
    x: width - margin - 120,
    y: height - 168,
    width: 120,
    height: 22,
    color: statusColor,
  });

  page.drawText(statusText, {
    x: width - margin - 60,
    y: height - 163,
    size: 9,
    font: fontBold,
    color: white,
  });

  y = height - 200;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });

  y -= 24;

  page.drawText("IDENTIFICACIÓN DE LAS PARTES", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 20;

  const parties = [
    { label: "PRESTADOR", value: `Mtsprz - Soluciones Digitales` },
    { label: "RUT PRESTADOR", value: import.meta.env.MTSPRZ_RUT || "Pendiente" },
    { label: "CLIENTE", value: data.clientName },
    { label: "RUT CLIENTE", value: data.clientRut || "—" },
    { label: "DOMICILIO", value: data.clientAddress || "—" },
    { label: "CORREO", value: data.clientEmail },
    { label: "TELÉFONO", value: data.clientPhone || "—" },
  ];

  for (const p of parties) {
    page.drawText(p.label, { x: margin, y, size: smallSize, font: fontBold, color: mutedColor });
    page.drawText(p.value, {
      x: margin + 130,
      y,
      size: smallSize,
      font,
      color: textColor,
    });
    y -= 14;
  }

  y -= 12;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });

  y -= 24;

  page.drawText("OBJETO DEL CONTRATO", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 20;

  const objectText =
    data.templateType === "jornada_dedicada"
      ? `El Prestador se obliga a prestar al Cliente los servicios profesionales de diseño web, mantenimiento de sitios web, y programación de sistemas de gestión de datos, bajo la modalidad de jornada dedicada remota, de conformidad con las cláusulas del presente contrato.`
      : `El Prestador se obliga a prestar al Cliente los servicios digitales detallados en la cláusula de servicios, de conformidad con las cláusulas del presente contrato.`;

  y = drawWrappedText(page, objectText, margin, y, contentWidth, smallSize, font, 14);
  y -= 16;

  page.drawText("SERVICIOS CONTRATADOS", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 20;

  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: contentWidth,
    height: 24,
    color: sectionBg,
  });

  page.drawText("Servicio", {
    x: margin + 8,
    y: y + 4,
    size: smallSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText("Valor", {
    x: width - margin - 80,
    y: y + 4,
    size: smallSize,
    font: fontBold,
    color: textColor,
  });
  y -= 28;

  let totalCalc = 0;
  for (const svc of data.services) {
    const rectY = y - 2;
    page.drawRectangle({
      x: margin,
      y: rectY,
      width: contentWidth,
      height: 20,
      color: y % 40 === y ? white : rgb(0.98, 0.98, 0.99),
    });

    page.drawText(svc.name, {
      x: margin + 8,
      y: y + 2,
      size: smallSize,
      font,
      color: textColor,
    });
    page.drawText(`$${(svc.price || 0).toLocaleString("es-CL")}`, {
      x: width - margin - 80,
      y: y + 2,
      size: smallSize,
      font,
      color: textColor,
    });
    totalCalc += svc.price || 0;
    y -= 22;
  }

  y -= 8;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 20;

  const totalAmount = data.totalAmount || totalCalc;
  page.drawText("TOTAL", {
    x: width - margin - 160,
    y,
    size: normalSize,
    font: fontBold,
    color: primaryColor,
  });
  page.drawText(`$${totalAmount.toLocaleString("es-CL")}`, {
    x: width - margin - 80,
    y,
    size: normalSize,
    font: fontBold,
    color: primaryColor,
  });
  y -= 24;

  if (data.schedule) {
    y -= 8;
    page.drawText("JORNADA DE TRABAJO", {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });
    y -= 20;
    y = drawWrappedText(page, data.schedule, margin, y, contentWidth, smallSize, font, 14);
    y -= 16;
  }

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 24;

  page.drawText("CONDICIONES GENERALES", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 20;

  const clauses = [
    `PLAZO: El presente contrato tendrá una duración de ${data.durationMonths || 1} mes(es), contado desde la fecha de inicio (${data.startDate || "—"}).`,
    data.endDate ? `FECHA DE TÉRMINO: ${data.endDate}` : null,
    `FORMA DE PAGO: ${data.paymentTerms || "Según lo acordado entre las partes."}`,
    `PROPIEDAD INTELECTUAL: Los códigos fuentes, diseños y activos digitales creados serán de propiedad del Cliente una vez cancelado el total del servicio.` ,
    `CONFIDENCIALIDAD: El Prestador se obliga a mantener la más estricta confidencialidad sobre toda la información del Cliente, incluso después del término del contrato.`,
    `TRATAMIENTO DE DATOS: Ambas partes se obligan al cumplimiento de la Ley N° 21.719 de Protección de Datos Personales.`,
    `JURISDICCIÓN: Las partes fijan su domicilio en la ciudad de Osorno, Región de Los Lagos, Chile, y se someten a la competencia de sus tribunales.`,
  ].filter(Boolean) as string[];

  for (const clause of clauses) {
    const parts = clause.split(":");
    const label = parts[0] + ":";
    const rest = parts.slice(1).join(":");

    page.drawText(`• ${label}`, {
      x: margin,
      y,
      size: smallSize,
      font: fontBold,
      color: textColor,
    });
    y -= 14;

    y = drawWrappedText(page, rest, margin + 8, y, contentWidth - 8, smallSize, font, 14);
    y -= 10;
  }

  if (data.specialClauses) {
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: borderColor,
    });
    y -= 20;

    page.drawText("CLÁUSULAS ESPECIALES", {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });
    y -= 20;

    y = drawWrappedText(page, data.specialClauses, margin, y, contentWidth, smallSize, font, 14);
    y -= 16;
  }

  if (y < 280) {
    const newPage = doc.addPage([612, 792]);
    return (await generateContractPdf(data)).slice(); // start new page
  }

  y -= 16;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 30;

  page.drawText("FIRMAS", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 40;

  const sigBoxY = y - 50;
  const sigBoxWidth = (contentWidth - 40) / 2;

  page.drawRectangle({
    x: margin,
    y: sigBoxY,
    width: sigBoxWidth,
    height: 100,
    color: white,
    borderColor,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + sigBoxWidth + 40,
    y: sigBoxY,
    width: sigBoxWidth,
    height: 100,
    color: white,
    borderColor,
    borderWidth: 1,
  });

  page.drawText("PRESTADOR", {
    x: margin + 8,
    y: sigBoxY + 82,
    size: smallSize,
    font: fontBold,
    color: primaryColor,
  });
  page.drawText("Mtsprz - Soluciones Digitales", {
    x: margin + 8,
    y: sigBoxY + 68,
    size: 8,
    font,
    color: mutedColor,
  });

  page.drawText("CLIENTE / EMPRESA", {
    x: margin + sigBoxWidth + 48,
    y: sigBoxY + 82,
    size: smallSize,
    font: fontBold,
    color: primaryColor,
  });
  page.drawText(data.clientName, {
    x: margin + sigBoxWidth + 48,
    y: sigBoxY + 68,
    size: 8,
    font,
    color: mutedColor,
  });

  if (data.adminSignature) {
    const sigData = data.adminSignature.replace(/^data:image\/\w+;base64,/, "");
    try {
      const sigImage = await doc.embedPng(sigData);
      page.drawImage(sigImage, {
        x: margin + 8,
        y: sigBoxY + 10,
        width: sigBoxWidth - 16,
        height: 40,
      });
    } catch {
      try {
        const sigImage = await doc.embedJpg(sigData);
        page.drawImage(sigImage, {
          x: margin + 8,
          y: sigBoxY + 10,
          width: sigBoxWidth - 16,
          height: 40,
        });
      } catch {}
    }
    page.drawText(`Firmado: ${data.adminSignedAt || ""}`, {
      x: margin + 8,
      y: sigBoxY + 4,
      size: 7,
      font,
      color: mutedColor,
    });
  } else {
    page.drawText("(Pendiente de firma)", {
      x: margin + 8,
      y: sigBoxY + 30,
      size: 9,
      font,
      color: mutedColor,
    });
  }

  if (data.clientSignature) {
    const sigData = data.clientSignature.replace(/^data:image\/\w+;base64,/, "");
    try {
      const sigImage = await doc.embedPng(sigData);
      page.drawImage(sigImage, {
        x: margin + sigBoxWidth + 48,
        y: sigBoxY + 10,
        width: sigBoxWidth - 16,
        height: 40,
      });
    } catch {
      try {
        const sigImage = await doc.embedJpg(sigData);
        page.drawImage(sigImage, {
          x: margin + sigBoxWidth + 48,
          y: sigBoxY + 10,
          width: sigBoxWidth - 16,
          height: 40,
        });
      } catch {}
    }
    page.drawText(`Firmado: ${data.clientSignedAt || ""}`, {
      x: margin + sigBoxWidth + 48,
      y: sigBoxY + 4,
      size: 7,
      font,
      color: mutedColor,
    });
  }

  y = sigBoxY - 40;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 16;

  page.drawText(`Fecha de emisión: ${data.createdAt}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: mutedColor,
  });
  page.drawText(`Documento: ${data.contractNumber}`, {
    x: width - margin - 150,
    y,
    size: 8,
    font,
    color: mutedColor,
  });

  return await doc.save();
}
