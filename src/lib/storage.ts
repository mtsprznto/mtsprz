interface StoredFile {
  data: string;
  mimeType: string;
}

export function storeBase64File(data: string, mimeType = "image/jpeg"): StoredFile {
  return { data, mimeType };
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

export function toDataUrl(base64: string, mimeType = "image/png"): string {
  return `data:${mimeType};base64,${base64}`;
}
