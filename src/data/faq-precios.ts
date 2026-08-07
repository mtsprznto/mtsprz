/**
 * FAQ con precios directos (J3 GEO + transparencia) · data-driven.
 * Respuestas directas con precio = lo que ChatGPT/Perplexity citan
 * cuando alguien pregunta "¿cuánto cuesta una web en Osorno/Puerto Varas?".
 */

export interface FaqPrecio {
  pregunta: string;
  respuesta: string;
}

export const FAQ_PRECIOS: FaqPrecio[] = [
  {
    pregunta: "¿Cuánto cuesta una página web en Puerto Varas u Osorno?",
    respuesta:
      "Una landing page desde $150.000 CLP y un sitio web institucional desde $350.000 CLP. Incluye SEO técnico, hosting y dominio el primer año. Plazo típico: 2-3 semanas. Si necesitas tienda online, desde $500.000 CLP.",
  },
  {
    pregunta: "¿Cuánto cuesta el SEO local (Google Maps) en el sur de Chile?",
    respuesta:
      "Una auditoría SEO técnica desde $80.000 CLP. SEO local (optimización de Google Maps + reseñas) desde $50.000 CLP. Estrategia de contenido + GEO para aparecer en ChatGPT/Perplexity se cotiza aparte según volumen.",
  },
  {
    pregunta: "¿Cuánto cuesta un bot de WhatsApp para mi negocio?",
    respuesta:
      "Un bot de WhatsApp Business desde $590.000 pago único (configuración, catálogo digital, integración con tu sitio web y respuestas inteligentes 24/7). Mantenimiento mensual opcional desde $69.000/mes. Es la forma más rápida de capturar leads en el sur de Chile.",
  },
  {
    pregunta: "¿En cuánto tiempo entregan una web?",
    respuesta:
      "Landing pages en 1-2 semanas; sitios institucionales en 2-3 semanas; tiendas online en 3-5 semanas. El tiempo depende de los contenidos (textos y fotos) que el cliente entregue a tiempo.",
  },
  {
    pregunta: "¿Trabajan con pymes de Osorno, Puerto Montt y Chiloé?",
    respuesta:
      "Sí. Somos una agencia de Puerto Varas y trabajamos con clientes de toda la Región de Los Lagos y Los Ríos: Puerto Varas, Puerto Montt, Osorno, Frutillar, Chiloé y Valdivia. Atención por video-llamada y WhatsApp.",
  },
  {
    pregunta: "¿Qué es la Ley 21.719 y cómo afecta a mi web?",
    respuesta:
      "Es la ley chilena de protección de datos (vigente el 1 de diciembre de 2026). Las pymes con web, formularios o WhatsApp deben informar sobre el tratamiento de datos, tener política de privacidad y habilitar consentimiento. Ofrecemos una auditoría de cumplimiento desde $200.000 CLP.",
  },
];
