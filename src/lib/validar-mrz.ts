const MRZ_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function charValue(c: string): number {
  if (c === "<") return 0;
  const idx = MRZ_CHARS.indexOf(c);
  return idx >= 0 ? idx : 0;
}

const WEIGHTS = [7, 3, 9];

function checksum(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    sum += charValue(field[i]) * WEIGHTS[i % 3];
  }
  return sum % 10;
}

export function validarChecksum(field: string, checkDigit: string): boolean {
  const expected = checksum(field);
  return expected === parseInt(checkDigit, 10);
}

export interface MrzResult {
  valid: boolean;
  line1?: string;
  line2?: string;
  line3?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  sex?: string;
  expiryDate?: string;
  nationality?: string;
  names?: string;
  errors: string[];
}

export function parseMrz(mrz: string): MrzResult {
  const result: MrzResult = { valid: false, errors: [] };
  const lines = mrz.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);

  if (lines.length < 3) {
    result.errors.push("Debe tener 3 l\u00edneas");
    return result;
  }

  result.line1 = lines[0].padEnd(30, "<").slice(0, 30);
  result.line2 = lines[1].padEnd(30, "<").slice(0, 30);
  result.line3 = lines[2].padEnd(30, "<").slice(0, 30);

  const l1 = lines[0];
  const l2 = lines[1];
  const l3 = lines[2];

  // document type
  if (!l1.startsWith("ID")) {
    result.errors.push("Tipo de documento debe ser ID");
  }

  // issuing country
  const country = l1.substring(2, 5);
  if (country !== "CHL") {
    result.errors.push("Pa\u00eds debe ser CHL");
  }

  // document number (positions 5-13)
  const docNumber = l1.substring(5, 14).replace(/</g, "");
  result.documentNumber = docNumber;
  if (docNumber.length === 0) {
    result.errors.push("N\u00famero de documento vac\u00edo");
  }

  // check digit for document number (position 14)
  const docNumberField = l1.substring(5, 14);
  const docCheckDigit = l1[14];
  if (docCheckDigit !== "<" && !validarChecksum(docNumberField, docCheckDigit)) {
    result.errors.push("Checksum de n\u00famero de documento inv\u00e1lido");
  }

  // date of birth (positions 0-5)
  const dob = l2.substring(0, 6);
  const dobCheck = l2[6];
  result.dateOfBirth = dob;
  if (dobCheck !== "<" && !validarChecksum(dob, dobCheck)) {
    result.errors.push("Checksum de fecha de nacimiento inv\u00e1lido");
  }

  // sex (position 7)
  result.sex = l2[7];

  // expiry date (positions 8-13)
  const expiry = l2.substring(8, 14);
  const expiryCheck = l2[14];
  result.expiryDate = expiry;
  if (expiryCheck !== "<" && !validarChecksum(expiry, expiryCheck)) {
    result.errors.push("Checksum de fecha de vencimiento inv\u00e1lido");
  }

  // nationality (positions 15-17)
  result.nationality = l2.substring(15, 18);

  // composite check digit (position 29 of line 2)
  const compositeField = (l1 + l2.substring(0, 28)).replace(/.{14}|.{6}|.{14}|?/g, "");
  // Actually the composite checksum covers specific fields...
  // Simplified: if the composite check digit position has a digit, validate it
  const compositeCheck = l2[29];
  if (compositeCheck !== "<" && /^\d$/.test(compositeCheck)) {
    const compositeData = l1.substring(0, 14) + l1.substring(15, 29) + l2.substring(0, 6) + l2[7] + l2.substring(8, 14) + l2.substring(15, 28);
    if (!validarChecksum(compositeData, compositeCheck)) {
      result.errors.push("Checksum compuesto inv\u00e1lido");
    }
  }

  // names (line 3)
  result.names = l3.replace(/</g, " ").replace(/\s+/g, " ").trim();

  result.valid = result.errors.length === 0;
  return result;
}

export function formatMrzDate(yymmdd: string): string {
  if (!yymmdd || yymmdd.length < 6) return yymmdd;
  const prefix = parseInt(yymmdd.substring(0, 2), 10) > 50 ? "19" : "20";
  return `${prefix}${yymmdd.substring(0, 2)}-${yymmdd.substring(2, 4)}-${yymmdd.substring(4, 6)}`;
}
