/**
 * Contenido SEO/GEO de los lead magnets · data-driven.
 * Cada slug tiene: meta SEO, secciones editables y FAQ (para schema).
 * Editar aquí; NO tocar las páginas .astro.
 */

export interface RecursoSeccion {
  h2: string;
  parrafos?: string[];
  lista?: string[];
}

export interface RecursoContenido {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  secciones: RecursoSeccion[];
  faq: { pregunta: string; respuesta: string }[];
  /** Fuentes primarias de las cifras citadas · se renderizan como lista al final. */
  fuentes?: { label: string; url: string }[];
}

export const RECURSOS_CONTENIDO: Record<string, RecursoContenido> = {
  "checklist-web-2026": {
    slug: "checklist-web-2026",
    metaTitle: "Checklist Web 2026: 8 puntos para que tu web no te robe clientes",
    metaDescription:
      "Checklist práctico para pymes del sur de Chile: velocidad, WhatsApp visible, precios, reseñas, SEO local y Ley 21.719. Revisa tu web en 15 minutos.",
    intro:
      "Tu web no tiene que ser perfecta: tiene que vender. En Puerto Varas, Osorno, Puerto Montt y Valdivia, el 53% de las visitas móviles se pierde si la carga tarda más de 3 segundos. Este checklist te muestra, en orden de impacto, los 8 puntos que más clientes te están robando hoy.",
    secciones: [
      {
        h2: "1. Velocidad: carga en menos de 1.5 segundos",
        parrafos: [
          "La velocidad es el filtro número uno. Un retraso de 1 segundo en la carga reduce la conversión alrededor de 7%, y más de la mitad de los visitantes móviles abandonan si la página tarda más de 3 segundos.",
          "Revisa tu página con PageSpeed Insights (gratis, de Google). Busca el puntaje de 'Core Web Vitals' en móvil: LCP bajo 2.5s, CLS bajo 0.1, INP bajo 200ms.",
          "Las causas típicas en pymes del sur: fotos sin comprimir (pesan 5-10 MB), hosting lento, demasiados plugins. Un sitio con Astro u otro generador estático carga en menos de 1 segundo.",
        ],
      },
      {
        h2: "2. WhatsApp visible en el primer scroll",
        parrafos: [
          "El cliente chileno decide en segundos: si no ve cómo contactarte, cierra. El botón de WhatsApp debe estar arriba, en el hero, no escondido en el footer.",
          "Enlaza directo al número: wa.me/56XXXXXXXXX con un mensaje pre-escrito. Es gratis y funciona en cualquier web.",
          "Dato de mercado: en la Región de Los Lagos, la mayoría de las webs de restaurantes y servicios NO tiene WhatsApp visible sin hacer scroll. Es tu ventaja más fácil.",
        ],
      },
      {
        h2: "3. Precios visibles",
        parrafos: [
          "Publicar precios no es perder negociación: es filtrar y generar confianza. El cliente que sabe cuánto cuesta, llega decidido. El que no sabe, compara (y probablemente no vuelve).",
          "Si tus precios varían, publica rangos ('desde $150.000') y qué incluye. La transparencia es una de las razones más citadas para elegir un proveedor local.",
        ],
      },
      {
        h2: "4. Reseñas de Google conectadas",
        parrafos: [
          "El 47% de los clientes descarta negocios con menos de 20 reseñas. Tu web debe enlazar directo a tu ficha de Google Maps y a un formulario de reseña.",
          "Si estás bajo 20 reseñas, haz del pedido de reseñas una rutina: envío de email o WhatsApp 3 días después de cada entrega. Es la jugada de mayor retorno gratis.",
        ],
      },
      {
        h2: "5. SEO local: nombre, dirección y teléfono idénticos (NAP)",
        parrafos: [
          "Google compara tu web con tu ficha de Maps. Si el nombre, la dirección o el teléfono difieren aunque sea en un carácter, tu posicionamiento local se penaliza.",
          "Unifica: 'Mtsprz', 'Puerto Varas, Región de Los Lagos, Chile', '+56 9 6692 9818'. Mismo NAP en web, Maps, Instagram y directorios.",
        ],
      },
      {
        h2: "6. Una página por servicio (no todo en el inicio)",
        parrafos: [
          "Google (y ChatGPT) premian páginas específicas: 'servicio-de-web-en-puerto-varas' posiciona mejor que una sección escondida en la home.",
          "Cada servicio con: problema que resuelve, cómo se trabaja, precios desde, casos y CTA. Es la estructura que también te hace citable por la IA.",
        ],
      },
      {
        h2: "7. Consentimiento y privacidad (Ley 21.719)",
        parrafos: [
          "La Ley 21.719 de protección de datos personales está vigente desde el 1 de diciembre de 2026 en Chile. Toda web con formularios, WhatsApp o analytics debe: informar qué datos trata, para qué, y obtener consentimiento.",
          "Mínimo requerido: banner de cookies con aceptar/rechazar, política de privacidad accesible, y registro del consentimiento. No cumplir puede significar multas.",
        ],
      },
      {
        h2: "8. Contenido que responde preguntas reales",
        parrafos: [
          "Escribe lo que tu cliente pregunta, no lo que tú quieres decir. '¿Cuánto cuesta una web en Osorno?' '¿Cuánto tarda?' · respondidas con precios y plazos directos.",
          "Este contenido es lo que las IA citan: los sitios con datos propios y respuestas directas tienen hasta 40% más visibilidad en ChatGPT y Perplexity (estudio GEO de Princeton, KDD 2024).",
        ],
      },
    ],
    faq: [
      {
        pregunta: "¿Cuánto tiempo toma revisar mi web con este checklist?",
        respuesta: "Entre 15 y 30 minutos si sigues el orden: velocidad, WhatsApp, precios, reseñas, NAP, páginas por servicio, privacidad y contenido.",
      },
      {
        pregunta: "¿Qué hago primero si mi web es muy lenta?",
        respuesta: "Comprime las imágenes (las fotos de celular pesan 5-10 MB), revisa el hosting y quita plugins innecesarios. El objetivo es cargar en menos de 1.5 segundos en móvil.",
      },
      {
        pregunta: "¿Necesito una agencia para cumplir todo esto?",
        respuesta: "Los puntos 2, 3, 4, 5 y 8 los puedes hacer tú mismo en un día. Los puntos 1, 6 y 7 suelen requerir soporte técnico; pide una cotización con alcance claro.",
      },
      {
        pregunta: "¿La Ley 21.719 aplica a mi web de pyme?",
        respuesta: "Sí, desde el 1 de diciembre de 2026. Si tu web tiene formularios, analytics o WhatsApp, debes informar el tratamiento de datos y pedir consentimiento.",
      },
    ],
    fuentes: [
      {
        label: "Google · Mobile Site Speed Playbook (2016): 53% abandona si la carga tarda más de 3 segundos",
        url: "https://www.thinkwithgoogle.com/_qs/documents/3975/c676a_Google_MobileSiteSpeed_Playbook_v2.1_digital_RD1XArd.pdf",
      },
      {
        label: "Princeton · GEO: Generative Engine Optimization (KDD 2024): hasta +40% de visibilidad en IA",
        url: "https://collaborate.princeton.edu/en/publications/geo-generative-engine-optimization",
      },
      {
        label: "BrightLocal · Local Consumer Review Survey 2026: 47% descarta negocios con menos de 20 reseñas",
        url: "https://www.brightlocal.com/insights/local-consumer-review-survey/",
      },
      {
        label: "Biblioteca del Congreso Nacional de Chile · Ley 21.719 (protección de datos personales)",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1209272",
      },
    ],
  },

  "10-automatizaciones-pyme": {
    slug: "10-automatizaciones-pyme",
    metaTitle: "10 automatizaciones que toda pyme debería tener (2026)",
    metaDescription:
      "Automatización para pymes del sur: WhatsApp que responde, reservas automáticas, boletas, recordatorios, email y más. Con qué herramientas gratis empezar hoy.",
    intro:
      "En una pyme, el tiempo es el recurso más caro. Estas 10 automatizaciones (ordenadas de mayor a menor impacto) eliminan tareas repetitivas sin contratar a nadie. La mayoría se monta con herramientas gratis o de bajo costo, y en menos de una semana.",
    secciones: [
      {
        h2: "1. WhatsApp que responde solo (el mayor retorno)",
        parrafos: [
          "El cliente del sur vive en WhatsApp. Si tardas 2 horas en responder, ya hablaste con tu competencia.",
          "WhatsApp Business tiene respuestas rápidas y mensaje de ausencia gratis. Para respuestas inteligentes que entiendan preguntas (precios, horarios, servicios), se usa la API de WhatsApp con un bot: responde 24/7 y agenda la conversación cuando el humano esté libre.",
          "Desde $120.000/mes en agencias locales; para empezar, el mensaje de bienvenida de WhatsApp Business ya captura el 30% del beneficio.",
        ],
      },
      {
        h2: "2. Reservas y agenda automática",
        parrafos: [
          "Si tomas reservas (restaurante, peluquería, clínica, servicio técnico), una agenda online elimina el ida y vuelta de '¿tienes hora? · ¿a qué hora?'.",
          "Opciones gratis: Calendly, Google Calendar con slots. Opciones pagas con cobro: Calendly Pro, Reserva, Focus. El cliente agenda solo, tú solo recibes la confirmación.",
        ],
      },
      {
        h2: "3. Facturación y boletas sin fricción",
        parrafos: [
          "Emitir boleta después de cada venta toma minutos y se olvida. Con SII API directa o herramientas como Boletahoy / Suena, la boleta se emite y envía por email o WhatsApp automáticamente al cerrar la venta.",
          "Menos atrasos de facturación = mejor flujo de caja y menos multas del SII.",
        ],
      },
      {
        h2: "4. Recordatorios de citas (reduce no-shows)",
        parrafos: [
          "Un recordatorio por WhatsApp 24 horas antes corta los no-shows a la mitad. WhatsApp Business API o incluso un mensaje manual programado: 'Hola, te esperamos mañana a las 11:00'.",
          "Las citas perdidas son dinero perdido: cada no-show cuesta el ingreso completo de esa hora.",
        ],
      },
      {
        h2: "5. Captura de leads desde tu web (formulario → WhatsApp)",
        parrafos: [
          "Cada formulario de tu web puede encender un botón de WhatsApp al instante: un mensaje al dueño ('Nuevo lead de la web: nombre, teléfono, interés') y un mensaje automático al cliente ('Gracias, te respondemos hoy').",
          "Es la automatización más subestimada: convierte tu web en una máquina de avisos, no en un buzón que revisas cuando te acuerdas.",
        ],
      },
      {
        h2: "6. Email de bienvenida y seguimiento (nurturing)",
        parrafos: [
          "Quien deja su correo (descarga, presupuesto, newsletter) recibe 3-4 emails automáticos: valor en el 1º, caso en el 2º, oferta en el 3º. Herramientas gratis: MailerLite, Brevo, Resend (hasta 3.000 envíos gratis).",
          "El 80% de las ventas ocurre después del 5º contacto; la mayoría de las pymes se detiene en el 1º.",
        ],
      },
      {
        h2: "7. Cotizaciones que se generan solas",
        parrafos: [
          "Si vendes servicios por proyecto, un formulario (servicio + tamaño + plazo) puede generar una cotización armada en PDF en segundos con un documento de plantilla.",
          "Menos tiempo escribiendo presupuestos = más presupuestos enviados = más ventas.",
        ],
      },
      {
        h2: "8. Seguimiento de clientes post-entrega (reseñas)",
        parrafos: [
          "3 días después de entregar, pide la reseña de Google con un mensaje automático. 10 días después, un recordatorio suave. Es la única forma sostenible de llegar a 20+ reseñas.",
          "Recuerda: 47% de los clientes descarta negocios con menos de 20 reseñas.",
        ],
      },
      {
        h2: "9. Conciliación de inventario y stock",
        parrafos: [
          "Un inventario en tabla (Google Sheets + script o Airtable) que descuente stock al vender evita el 'se me acabó sin avisar'.",
          "Para retail con e-commerce, el stock debe estar conectado a la tienda: productos agotados se ocultan solos.",
        ],
      },
      {
        h2: "10. Reporte semanal de tu negocio (1 página)",
        parrafos: [
          "Cada lunes, un correo automático con tus números de la semana: ventas, leads, citas, reseñas nuevas. Herramientas: Looker Studio (gratis) conectado a tu fuente de ventas.",
          "No puedes mejorar lo que no mides. Un reporte semanal de 1 página es más útil que 10 dashboards que nunca abres.",
        ],
      },
    ],
    faq: [
      {
        pregunta: "¿Cuánto cuesta automatizar una pyme?",
        respuesta: "Con herramientas gratis puedes montar las #4, #6, #8 y #10 el primer día. Las #1, #2, #3 y #5 suelen costar entre $50.000 y $200.000 CLP de implementación, más un costo mensual de la herramienta.",
      },
      {
        pregunta: "¿Necesito saber programar?",
        respuesta: "No para las #2, #4, #6 y #10. Las #1, #3, #5 y #7 requieren integración técnica: se delegan a una agencia o a una herramienta no-code (Make, Zapier).",
      },
      {
        pregunta: "¿Qué automatización debo hacer primero?",
        respuesta: "La #5 (formulario → WhatsApp) es la de mayor retorno inmediato si tienes web. La #8 (reseñas) si tienes clientes recurrentes. Las dos son baratas y visibles en menos de una semana.",
      },
      {
        pregunta: "¿Es seguro automatizar el WhatsApp?",
        respuesta: "Con WhatsApp Business API oficial (no cuentas clonadas) sí. La API oficial no arriesga tu número y soporta respuestas inteligentes, etiquetas y agenda. Exige proveedor oficial y API key, no un bot en tu teléfono.",
      },
    ],
    fuentes: [
      {
        label: "BrightLocal · Local Consumer Review Survey 2026: 47% descarta negocios con menos de 20 reseñas",
        url: "https://www.brightlocal.com/insights/local-consumer-review-survey/",
      },
    ],
  },

  "guia-google-maps-2026": {
    slug: "guia-google-maps-2026",
    metaTitle: "Guía Google Maps 2026: cómo aparecer cuando buscan tu negocio",
    metaDescription:
      "Optimización de Google Business Profile paso a paso para negocios de Los Lagos y Los Ríos: categorías, fotos, reseñas, publicaciones y el 76% que visita el mismo día.",
    intro:
      "Cuando alguien en Puerto Varas, Osorno o Puerto Montt busca 'restaurante cerca de mí' o 'servicio técnico en Osorno', Google Maps decide quién aparece en el top 3. Esas 3 fichas se llevan casi todos los clics: el 76% de quienes buscan un negocio local lo visita dentro de 24 horas (Google). Esta guía te muestra cómo ser uno de esos 3.",
    secciones: [
      {
        h2: "1. Reclama y verifica tu ficha",
        parrafos: [
          "Sin ficha verificada, no existes. Entra a business.google.com, busca tu negocio y pide la verificación (por video, código postal o llamada). Si ya tienes ficha pero nadie la administra, solicita acceso.",
          "Mantén la misma categoría principal que tu competencia exitosa usa: no inventes categorías raras.",
        ],
      },
      {
        h2: "2. NAP consistente: nombre, dirección, teléfono",
        parrafos: [
          "Google cruza tu ficha con tu web. Si tu web dice 'Puerto Varas' y tu ficha dice 'Puerto Varas, Los Lagos', hay inconsistencia mínima pero penaliza igual.",
          "Regla de oro: mismo nombre, misma dirección, mismo teléfono (+56 9 6692 9818) en TODOS lados: web, Maps, Instagram, Facebook, directorios. Es la causa #1 de fichas que no rankean.",
        ],
      },
      {
        h2: "3. Fotos: 10+ con calidad real (no stock)",
        parrafos: [
          "Las fichas con 10 o más fotos reciben más clics y llamadas. Fotos reales de tu local, tu equipo, tus platos/productos y del proceso de trabajo.",
          "Fotos de stock se notan y generan desconfianza. Un celular moderno con luz natural supera al banco de imágenes.",
        ],
      },
      {
        h2: "4. Reseñas: el algoritmo local es un círculo virtuoso",
        parrafos: [
          "Cantidad, ritmo y respuesta: 20+ reseñas con una nueva cada semana y respuesta del dueño a cada una. El 47% de clientes descarta negocios con menos de 20 reseñas.",
          "Pide reseñas 3 días después de cada servicio (email o WhatsApp automático) con el enlace directo. Responde SIEMPRE: Google lo lee como actividad real.",
        ],
      },
      {
        h2: "5. Preguntas y respuestas (la función más desaprovechada)",
        parrafos: [
          "Google permite que cualquiera pregunte en tu ficha. Responde todas: horarios, precios, estacionamiento, accesibilidad. También puedes hacerte tú mismo las 5 preguntas que más te hacen, y responderlas.",
          "Estas respuestas aparecen en búsquedas de voz y son contenido que la IA también lee.",
        ],
      },
      {
        h2: "6. Publicaciones semanales (Google Posts)",
        parrafos: [
          "Publica una vez por semana: oferta, producto nuevo, evento, foto del antes/después. Las fichas activas tienen ventaja y la publicación aparece al lado de tu negocio en búsqueda.",
          "Incluye siempre una llamada a la acción (Reservar, Llamar, WhatsApp) y un enlace.",
        ],
      },
      {
        h2: "7. Productos y servicios en la ficha",
        parrafos: [
          "En la sección 'Productos' y 'Servicios' puedes listar ítems con precio. Es gratis, es contenido estructurado y responde antes de que pregunten.",
          "Los precios en la ficha aumentan la confianza y filtran consultas. Publica rangos si te acomoda: 'desde $150.000'.",
        ],
      },
      {
        h2: "8. Zona de servicio y horarios precisos",
        parrafos: [
          "Si atiendes a domicilio, define tu zona de servicio en km (no la dejes vacía). Horarios reales, incluido si atiendes sábado: Google castiga fichas que dicen abierto y están cerradas.",
          "Para temporada turística (diciembre-febrero), actualiza horarios extendidos: es cuando la demanda explota en Los Lagos.",
        ],
      },
    ],
    faq: [
      {
        pregunta: "¿Cuánto se demora en aparecer mi negocio en Google Maps?",
        respuesta: "La ficha verificada puede aparecer en horas, pero rankear en el top 3 local toma 4-12 semanas con NAP consistente, 10+ fotos, reseñas nuevas semanales y publicaciones activas.",
      },
      {
        pregunta: "¿Necesito una web para aparecer en Maps?",
        respuesta: "No, pero ayuda muchísimo. Google cruza la ficha con tu web para validar consistencia. Una landing de 1 página con tu NAP y servicios acelera el ranking.",
      },
      {
        pregunta: "¿Puedo tener dos fichas para la misma empresa?",
        respuesta: "No: duplicados penalizan. Una sola ficha por ubicación física. Si atiendes en varias comunas, usa la zona de servicio.",
      },
      {
        pregunta: "¿Cuánto cobra una agencia por el SEO de Google Maps?",
        respuesta: "En el sur de Chile, una optimización de Google Business Profile parte en $50.000 CLP y la gestión mensual (fotos, publicaciones, reseñas) entre $80.000 y $150.000 CLP.",
      },
    ],
    fuentes: [
      {
        label: "Google/Think with Google · How Mobile Search Connects Consumers to Stores (2016): 76% visita en un día",
        url: "https://www.thinkwithgoogle.com/_qs/documents/620/mobile-search-trends-consumers-to-stores.pdf",
      },
      {
        label: "BrightLocal · Local Consumer Review Survey 2026: 47% descarta negocios con menos de 20 reseñas",
        url: "https://www.brightlocal.com/insights/local-consumer-review-survey/",
      },
    ],
  },
};
