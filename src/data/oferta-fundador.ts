/**
 * Oferta Fundador · fuente única de datos para la sección #oferta.
 * Centraliza el copy de la oferta (fuente: marketing/12-oferta-fundador.md,
 * precios ancla verificado en 14-casos-estudio.md).
 * Editar aquí; las páginas y componentes leen de este módulo.
 */

export const CUPOS_FUNDADOR = 10;

/** Regla de exclusividad: un solo cupo por rubro (anti-canibalización) */
export const CUPO_RUBRO = 1;

/** Contrapartidas que el cliente fundador entrega (ordinal 01/02/03) */
export const CONTRAPARTIDAS: { titulo: string; detalle: string }[] = [
  {
    titulo: "Un caso publicado",
    detalle: "con tus números (reservas, leads, llamadas antes/después).",
  },
  {
    titulo: "Un testimonio en video",
    detalle: "de 30–60 segundos.",
  },
  {
    titulo: "Una reseña en Google",
    detalle: "",
  },
];

/** Precios ancla: pack de entrada vs precio fundador (verificado en 14) */
export const PRECIOS_FUNDADOR: {
  pack: string;
  regular: string;
  fundador: string;
  nota: string;
}[] = [
  { pack: "Landing", regular: "$290K", fundador: "$203K", nota: "−30%" },
  { pack: "Web", regular: "$690K", fundador: "$483K", nota: "−30%" },
  {
    pack: "Landing + WhatsApp API",
    regular: "$290K + $590K",
    fundador: "$616K",
    nota: "−30%",
  },
  { pack: "Pack Digital Completo", regular: "$1.34M", fundador: "$938K", nota: "−$402K" },
];
