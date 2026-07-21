import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

const seedServices = [
  // ════════════════════════════════════════════
  // DESARROLLO WEB
  // ════════════════════════════════════════════
  {
    slug: "landing",
    name: "Landing Page Profesional",
    category: "Desarrollo Web",
    description: "P\u00e1gina web de alto impacto dise\u00f1ada para convertir visitantes en clientes. Ideal para campa\u00f1as, lanzamientos o tu primera presencia digital profesional. Incluye sesi\u00f3n de discovery, dise\u00f1o UI/UX personalizado con 1 propuesta visual + 1 ronda de revisi\u00f3n, desarrollo con stack moderno y optimizaci\u00f3n Lighthouse 90+.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "Sesi\u00f3n de discovery y levantamiento de objetivos",
      "Dise\u00f1o UI/UX personalizado (1 propuesta + 1 revisi\u00f3n)",
      "Landing page responsive (desktop + mobile)",
      "Formulario de contacto con validaci\u00f3n + notificaciones",
      "SEO on-page b\u00e1sico (meta tags, estructura, sitemap)",
      "Bot\u00f3n WhatsApp flotante",
      "Hosting 3 meses con SSL + CDN incluido",
      "Google Analytics 4 configurado"
    ],
    includes_maintenance: true,
    maintenance_price: 45000,
    maintenance_description: "Hosting, SSL, monitoreo 24/7, backups semanales, actualizaciones de seguridad y soporte t\u00e9cnico prioritario.",
    is_popular: true
  },
  {
    slug: "web-profesional",
    name: "Sitio Web Profesional",
    category: "Desarrollo Web",
    description: "Tu centro digital completo. Un sitio moderno y veloz que posiciona tu marca, muestra tus servicios y convence a tus clientes de contratarte. Incluye levantamiento detallado con arquitectura de informaci\u00f3n, mapa del sitio y user flows. Dise\u00f1o UI/UX con 2 propuestas visuales + 2 rondas de revisi\u00f3n. Blog integrado y panel administrador.",
    price: 800000,
    promo_price: 690000,
    deliverables: [
      "Levantamiento de requerimientos y arquitectura de informaci\u00f3n",
      "2 propuestas de dise\u00f1o UI/UX + 2 rondas de revisi\u00f3n",
      "Sitio web completo responsive (5-10 p\u00e1ginas)",
      "Blog integrado con CMS editable",
      "Panel administrador para gesti\u00f3n de contenido",
      "SEO avanzado on-page + datos estructurados (Schema.org)",
      "Galer\u00eda de im\u00e1genes optimizada para velocidad",
      "Formularios inteligentes con validaci\u00f3n",
      "Hosting 3 meses con SSL + CDN incluido",
      "Google Analytics 4 + Search Console",
      "Capacitaci\u00f3n del equipo para gesti\u00f3n aut\u00f3noma"
    ],
    includes_maintenance: true,
    maintenance_price: 75000,
    maintenance_description: "Hosting, SSL, monitoreo 24/7, backups semanales, actualizaciones de seguridad, soporte t\u00e9cnico prioritario y mantenimiento de contenido.",
    is_popular: true
  },
  {
    slug: "ecommerce",
    name: "Tienda Online (E-commerce)",
    category: "Desarrollo Web",
    description: "Tu tienda lista para vender. Cat\u00e1logo ilimitado, carrito inteligente, pagos integrados (Webpay/Flow) y panel de control de ventas en tiempo real. Incluye levantamiento de requerimientos y casos de uso del negocio. SEO avanzado para e-commerce.",
    price: 1800000,
    promo_price: 1500000,
    deliverables: [
      "Levantamiento de requerimientos y casos de uso",
      "Arquitectura de producto y cat\u00e1logo",
      "Dise\u00f1o UI/UX completo orientado a conversi\u00f3n",
      "Cat\u00e1logo de productos ilimitado con variantes",
      "Carrito de compras funcional",
      "Webpay / Flow / Mercado Pago integrados",
      "Dashboard de ventas en tiempo real",
      "Gesti\u00f3n de inventario y \u00f3rdenes",
      "Panel administrador completo",
      "SEO avanzado para e-commerce",
      "Hosting premium con SSL + CDN (3 meses)",
      "Capacitaci\u00f3n del equipo"
    ],
    includes_maintenance: true,
    maintenance_price: 120000,
    maintenance_description: "Hosting premium, SSL, monitoreo 24/7, backups diarios, actualizaciones de seguridad, soporte prioritario, mantenimiento de cat\u00e1logo y productos."
  },
  {
    slug: "web-app",
    name: "Aplicaci\u00f3n Web a Medida",
    category: "Desarrollo Web",
    description: "Sistemas web hechos a tu medida: paneles de administraci\u00f3n, portales de clientes, apps internas, gestores de contenido. Si necesitas algo que no existe, lo creamos. Incluye levantamiento detallado, arquitectura escalable y despliegue en producci\u00f3n.",
    price: 1500000,
    promo_price: 1200000,
    deliverables: [
      "Levantamiento detallado de requerimientos t\u00e9cnicos",
      "Arquitectura escalable (Astro / Next.js / FastAPI)",
      "Autenticaci\u00f3n de usuarios y sistema de roles",
      "Panel de administraci\u00f3n personalizado",
      "API REST o GraphQL seg\u00fan necesidad",
      "Base de datos PostgreSQL optimizada",
      "Despliegue en Vercel / Railway / Cloudflare",
      "SSL + CDN incluidos",
      "Documentaci\u00f3n t\u00e9cnica del sistema",
      "Capacitaci\u00f3n del equipo"
    ],
    includes_maintenance: true,
    maintenance_price: 120000,
    maintenance_description: "Hosting premium, monitoreo 24/7, backups, actualizaciones de seguridad, soporte t\u00e9cnico prioritario y mantenimiento de la aplicaci\u00f3n."
  },

  // ════════════════════════════════════════════
  // AUTOMATIZACIÓN DE PROCESOS
  // ════════════════════════════════════════════
  {
    slug: "bot-whatsapp",
    name: "Bot WhatsApp Inteligente",
    category: "Automatizaci\u00f3n de Procesos",
    description: "Atenci\u00f3n al cliente 24/7 automatizada en WhatsApp. Flujos conversacionales, integraci\u00f3n con IA y CRM. No incluye costos de API/mensajer\u00eda ni licencias (a cargo del Cliente).",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "Plataforma/API: WhatsApp Business API v\u00eda Twilio / 360dialog / Meta Cloud API (a designar)",
      "Flujos conversacionales y respuestas automatizadas (cantidad a acordar)",
      "Men\u00fa interactivo y derivaci\u00f3n a humano",
      "Integraci\u00f3n con IA/LLM, CRM o base de datos seg\u00fan aplique",
      "Documentaci\u00f3n y capacitaci\u00f3n",
      "No incluye costos de API/mensajer\u00eda ni licencias (a cargo del Cliente)"
    ],
    includes_maintenance: true,
    maintenance_price: 60000,
    maintenance_description: "Mantenimiento del bot, actualizaci\u00f3n de respuestas, monitoreo de conversaciones, reportes mensuales y soporte prioritario.",
    is_popular: true
  },
  {
    slug: "email-flow",
    name: "Flujo de Email Marketing",
    category: "Automatizaci\u00f3n de Procesos",
    description: "Correos que trabajan por ti mientras duermes. Secuencias de bienvenida, recuperaci\u00f3n de clientes, newsletters autom\u00e1ticas que nutren y venden. Incluye configuraci\u00f3n de entregabilidad y m\u00e9tricas.",
    price: 250000,
    promo_price: 200000,
    deliverables: [
      "Levantamiento de flujos de comunicaci\u00f3n",
      "Secuencia de bienvenida automatizada multi-paso",
      "Recuperaci\u00f3n de carritos abandonados (e-commerce)",
      "Newsletter peri\u00f3dico autom\u00e1tico",
      "Dise\u00f1o de plantillas profesionales responsive",
      "Integraci\u00f3n API con CRM",
      "Reportes de apertura, clics y conversi\u00f3n",
      "Configuraci\u00f3n de entregabilidad (SPF, DKIM, DMARC)"
    ],
    includes_maintenance: true,
    maintenance_price: 50000,
    maintenance_description: "Mantenimiento de flujos, actualizaci\u00f3n de plantillas, monitoreo de entregabilidad y reportes mensuales."
  },
  {
    slug: "crm-integration",
    name: "Integraci\u00f3n y Automatizaci\u00f3n CRM",
    category: "Automatizaci\u00f3n de Procesos",
    description: "Conecta tu CRM con el resto de tus herramientas para que los datos fluyan sin copiar ni pegar. Incluye configuraci\u00f3n de pipelines, migraci\u00f3n de contactos, automatizaciones e integraciones. No incluye el costo de licencias del CRM (a cargo del Cliente).",
    price: 500000,
    promo_price: 400000,
    deliverables: [
      "CRM objetivo: HubSpot / Pipedrive / Zoho / otro a designar",
      "Configuraci\u00f3n de pipelines y etapas del proceso comercial",
      "Importaci\u00f3n y migraci\u00f3n de contactos desde fuente actual",
      "Automatizaciones: asignaci\u00f3n de leads, correos de seguimiento, tareas (cantidad a acordar)",
      "Integraciones con correo, formularios web, WhatsApp y otras herramientas a definir",
      "Documentaci\u00f3n de la configuraci\u00f3n",
      "Capacitaci\u00f3n al equipo",
      "No incluye el costo de licencias del CRM (a cargo del Cliente)"
    ],
    includes_maintenance: true,
    maintenance_price: 90000,
    maintenance_description: "Mantenimiento de integraciones, monitoreo de sincronizaci\u00f3n, actualizaciones de API, soporte prioritario y reportes mensuales."
  },
  {
    slug: "excel-automation",
    name: "Automatizaci\u00f3n Excel y Reportes",
    category: "Automatizaci\u00f3n de Procesos",
    description: "Deja de perder horas copiando y pegando datos. Automatizamos tus planillas, reportes y procesos manuales en Excel para que tu equipo se enfoque en lo importante. Ideal para corredoras, contadores, constructoras e inmobiliarias.",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "Diagn\u00f3stico de procesos manuales actuales",
      "Automatizaci\u00f3n de reportes recurrentes",
      "Limpieza y transformaci\u00f3n autom\u00e1tica de datos",
      "Generaci\u00f3n de informes PDF/Excel automatizada",
      "Conexi\u00f3n de Excel con bases de datos o APIs",
      "Dashboard en Excel actualizado autom\u00e1ticamente",
      "Documentaci\u00f3n del proceso automatizado",
      "Capacitaci\u00f3n al equipo"
    ],
    includes_maintenance: true,
    maintenance_price: 50000,
    maintenance_description: "Mantenimiento de automatizaciones, actualizaciones de procesos, soporte t\u00e9cnico y reportes mensuales."
  },
  {
    slug: "workflow-automation",
    name: "Automatizaci\u00f3n de Procesos (n8n / Make)",
    category: "Automatizaci\u00f3n de Procesos",
    description: "Conecta tus aplicaciones sin programar. Automatizaciones entre CRM, email, WhatsApp, Google Sheets y m\u00e1s. Incluye configuraci\u00f3n de flujos, triggers y documentaci\u00f3n. No incluye costos de suscripci\u00f3n de las plataformas (a cargo del Cliente).",
    price: 400000,
    promo_price: 350000,
    deliverables: [
      "Plataforma: n8n o Make (a designar; aclarar qui\u00e9n paga la licencia/instancia)",
      "Workflows automatizados entre aplicaciones (cantidad y apps a integrar a acordar)",
      "Configuraci\u00f3n de triggers, mapeos y manejo de errores",
      "Documentaci\u00f3n de cada flujo",
      "Capacitaci\u00f3n al equipo",
      "No incluye costos de suscripci\u00f3n de las plataformas conectadas ni de n8n/Make (a cargo del Cliente)"
    ],
    includes_maintenance: true,
    maintenance_price: 70000,
    maintenance_description: "Mantenimiento de flujos, monitoreo de ejecuciones, actualizaciones, soporte t\u00e9cnico y reportes mensuales."
  },

  // ════════════════════════════════════════════
  // DATOS E INTELIGENCIA
  // ════════════════════════════════════════════
  {
    slug: "dashboard-viz",
    name: "Dashboard y Visualizaci\u00f3n de Datos",
    category: "Datos e Inteligencia",
    description: "Tus datos contando una historia clara. Dashboards interactivos conectados a tus fuentes de datos, con las m\u00e9tricas que realmente importan para tu negocio. No incluye licencias de la herramienta si aplican (a cargo del Cliente).",
    price: 500000,
    promo_price: 400000,
    deliverables: [
      "Herramienta: Power BI / Looker Studio / Tableau / otra a designar",
      "Definici\u00f3n de KPIs y m\u00e9tricas clave con el Cliente",
      "Conexi\u00f3n a fuentes de datos (Excel, DB, APIs, Google Sheets)",
      "Dashboards con visualizaciones interactivas (cantidad y tipo de gr\u00e1ficos a acordar)",
      "Actualizaci\u00f3n: autom\u00e1tica o manual seg\u00fan fuente de datos",
      "Documentaci\u00f3n de uso",
      "Capacitaci\u00f3n al equipo",
      "No incluye licencias de la herramienta si aplican (a cargo del Cliente)"
    ],
    includes_maintenance: true,
    maintenance_price: 70000,
    maintenance_description: "Mantenimiento del dashboard, actualizaci\u00f3n de fuentes de datos, soporte t\u00e9cnico y mejoras continuas."
  },
  {
    slug: "scraping-etl",
    name: "Scraping Web y Extracci\u00f3n de Datos (ETL)",
    category: "Datos e Inteligencia",
    description: "Extrae datos de cualquier sitio web o sistema que no tenga API. Automatizamos la recolecci\u00f3n de informaci\u00f3n de tu competencia, directorios, portales y m\u00e1s. Datos limpios y listos para usar.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "An\u00e1lisis de fuentes de datos objetivo",
      "Scraper web a medida (Python + Playwright/Selenium)",
      "Extracci\u00f3n, limpieza y transformaci\u00f3n autom\u00e1tica (ETL)",
      "Exportaci\u00f3n a Excel, CSV, JSON o base de datos",
      "Programaci\u00f3n de ejecuciones peri\u00f3dicas",
      "Manejo de rotaci\u00f3n de IPs y anti-bloqueo",
      "Documentaci\u00f3n t\u00e9cnica",
      "Soporte 15 d\u00edas post-entrega"
    ],
    includes_maintenance: true,
    maintenance_price: 50000,
    maintenance_description: "Mantenimiento del scraper, monitoreo de ejecuciones, actualizaciones ante cambios del sitio origen y soporte t\u00e9cnico."
  },
  {
    slug: "api-development",
    name: "API y Backend a Medida",
    category: "Datos e Inteligencia",
    description: "APIs y backend robustos para que tus sistemas conversen entre s\u00ed. Entrega v\u00eda repositorio privado con documentaci\u00f3n interactiva. No incluye hosting ni infraestructura (a cargo del Cliente).",
    price: 400000,
    promo_price: 350000,
    deliverables: [
      "Lenguaje/stack: a designar. Entrega v\u00eda repositorio privado (GitHub/GitLab)",
      "Endpoints REST o GraphQL seg\u00fan necesidad (cantidad a acordar)",
      "Documentaci\u00f3n interactiva (Swagger / OpenAPI)",
      "Autenticaci\u00f3n segura (JWT / API Keys / OAuth)",
      "Modelo de datos y pruebas b\u00e1sicas",
      "Ambiente de despliegue: a definir (Cliente o Prestador provee servidor)",
      "No incluye hosting ni infraestructura (a cargo del Cliente)"
    ],
    includes_maintenance: true,
    maintenance_price: 70000,
    maintenance_description: "Mantenimiento de API, monitoreo de rendimiento, actualizaciones de seguridad, soporte t\u00e9cnico prioritario."
  },
  {
    slug: "ocr-docs",
    name: "OCR y Procesamiento de Documentos",
    category: "Datos e Inteligencia",
    description: "Digitaliza documentos, facturas, boletas y formularios escaneados. Convierte pilas de papeles en datos estructurados que puedes buscar, filtrar y analizar. Ideal para contadores y estudios jur\u00eddicos.",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "An\u00e1lisis de tipos de documentos a procesar",
      "Configuraci\u00f3n de OCR con reconocimiento de texto",
      "Extracci\u00f3n autom\u00e1tica de campos clave (RUT, fechas, montos)",
      "Exportaci\u00f3n a Excel / JSON / base de datos",
      "Validaci\u00f3n y limpieza autom\u00e1tica de datos extra\u00eddos",
      "Programaci\u00f3n de procesamiento peri\u00f3dico",
      "Documentaci\u00f3n del sistema",
      "Soporte 15 d\u00edas post-entrega"
    ],
    includes_maintenance: true,
    maintenance_price: 50000,
    maintenance_description: "Mantenimiento del sistema OCR, actualizaciones de formatos, soporte t\u00e9cnico y mejoras continuas."
  },

  // ════════════════════════════════════════════
  // SEO
  // ════════════════════════════════════════════
  {
    slug: "seo-audit",
    name: "Auditor\u00eda SEO Completa",
    category: "SEO",
    description: "Radiograf\u00eda completa de tu sitio web. Descubrimos exactamente qu\u00e9 est\u00e1 frenando tu posicionamiento en Google y te entregamos un plan de acci\u00f3n priorizado para subir posiciones. Incluye an\u00e1lisis t\u00e9cnico, contenido y competencia local.",
    price: 200000,
    promo_price: 150000,
    deliverables: [
      "Auditor\u00eda t\u00e9cnica completa (rastreo, indexaci\u00f3n, Core Web Vitals)",
      "An\u00e1lisis de contenido y estructura del sitio",
      "Estudio de competencia local",
      "Evaluaci\u00f3n del perfil de backlinks",
      "Ranking actual de palabras clave objetivo",
      "Reporte ejecutivo con plan de acci\u00f3n priorizado",
      "Recomendaciones concretas paso a paso"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },
  {
    slug: "seo-local",
    name: "SEO Local \u2014 Google Maps",
    category: "SEO",
    description: "Aparece cuando tus clientes te buscan en tu misma ciudad. Posicionamiento en Google Maps y b\u00fasquedas locales. Setup \u00fanico: optimizaci\u00f3n de perfil, citas en directorios y estrategia de rese\u00f1as. No incluye monitoreo continuo (contratar Mantenimiento SEO por separado).",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "Optimizaci\u00f3n completa de Google Business Profile",
      "Gesti\u00f3n de citas locales en directorios chilenos",
      "Estrategia de rese\u00f1as y reputaci\u00f3n online",
      "Contenido local optimizado (ciudades + servicios)",
      "Configuraci\u00f3n inicial de palabras clave locales",
      "Capacitaci\u00f3n al equipo para gesti\u00f3n de rese\u00f1as"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: "",
    is_popular: true
  },
  {
    slug: "seo-mensual",
    name: "Mantenimiento SEO",
    category: "SEO",
    description: "Pack \u00fanico de mantenimiento y optimizaci\u00f3n SEO para tu sitio. Incluye correcci\u00f3n de errores t\u00e9cnicos, monitoreo de posiciones y reporte ejecutivo. Ideal como complemento posterior al SEO Local. No incluye redacci\u00f3n de art\u00edculos salvo que se indique.",
    price: 150000,
    promo_price: 120000,
    deliverables: [
      "Optimizaci\u00f3n on-page integral del sitio",
      "Correcci\u00f3n de errores t\u00e9cnicos SEO detectados",
      "Monitoreo de posiciones de palabras clave objetivo",
      "Reporte ejecutivo con resultados y recomendaciones",
      "Sesi\u00f3n de capacitaci\u00f3n al equipo sobre buenas pr\u00e1cticas SEO",
      "No incluye redacci\u00f3n de art\u00edculos salvo que se indique"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: "",
    is_monthly: false
  },

  // ════════════════════════════════════════════
  // MARKETING DIGITAL
  // ════════════════════════════════════════════
  {
    slug: "social-media",
    name: "Gesti\u00f3n de Redes Sociales",
    category: "Marketing Digital",
    description: "Contenido profesional para tus redes, con estrategia mensual, dise\u00f1o y copywriting. Ideal para negocios que quieren presencia constante sin depender de agendas internas. Servicio recurrente mensual.",
    price: 350000,
    promo_price: 350000,
    deliverables: [
      "Plataformas: Instagram / Facebook / LinkedIn / TikTok — a designar",
      "Publicaciones mensuales + historias (cantidad a acordar)",
      "Calendario de contenidos mensual",
      "Dise\u00f1o de piezas gr\u00e1ficas y copywriting incluido",
      "Reporte mensual de m\u00e9tricas y alcance",
      "No incluye pauta pagada (presupuesto de ads a cargo del Cliente)"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: "",
    is_monthly: true
  },
  {
    slug: "google-ads",
    name: "Google Ads",
    category: "Marketing Digital",
    description: "Configuraci\u00f3n y puesta en marcha de campa\u00f1as pagadas en Google. Incluye investigaci\u00f3n de palabras clave, redacci\u00f3n de anuncios, configuraci\u00f3n de conversiones y optimizaci\u00f3n inicial. No incluye el presupuesto de pauta (lo paga el Cliente directo a Google). Servicio \u00fanico de setup.",
    price: 250000,
    promo_price: 200000,
    deliverables: [
      "Configuraci\u00f3n de campa\u00f1as (Search/Display/Performance Max) en la cuenta del Cliente",
      "Investigaci\u00f3n de keywords, redacci\u00f3n de anuncios y grupos de anuncios",
      "Configuraci\u00f3n de conversiones y seguimiento",
      "Gesti\u00f3n y optimizaci\u00f3n por per\u00edodo inicial + reporte de resultados",
      "No incluye el presupuesto de pauta (lo paga el Cliente directo a Google)"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: "",
    is_monthly: false
  },

  // ════════════════════════════════════════════
  // DISEÑO GRÁFICO
  // ════════════════════════════════════════════
  {
    slug: "logo-brand",
    name: "Logo + Identidad Visual",
    category: "Dise\u00f1o Gr\u00e1fico",
    description: "Tu marca profesional lista para el mercado. No solo un logo: una identidad visual coherente que comunica qui\u00e9n eres y por qu\u00e9 confiar en ti. Incluye briefing, investigaci\u00f3n, logo principal con variantes, manual de marca y archivos vectoriales.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "2 a 3 propuestas iniciales de logotipo; 1 seleccionada con hasta 2 rondas de ajuste",
      "Entrega en formatos vectoriales (.ai/.svg) y mapa de bits (.png/.jpg) en versiones color, monocromo y negativo",
      "Paleta de colores (HEX/RGB/CMYK) y tipograf\u00edas corporativas seleccionadas",
      "Manual b\u00e1sico de marca: usos correctos e incorrectos, tama\u00f1os m\u00ednimos, \u00e1rea de resguardo"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },
  {
    slug: "email-marketing",
    name: "Email Marketing Automatizado",
    category: "Marketing Digital",
    description: "Configuraci\u00f3n de flujos automatizados de correo para nutrir leads, recuperar carritos abandonados y fidelizar clientes. Incluye plantillas responsivas, segmentaci\u00f3n y documentaci\u00f3n. No incluye el costo de la licencia de la plataforma (a cargo del Cliente).",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "Configuraci\u00f3n de 3 flujos automatizados (bienvenida, carrito abandonado, post-compra) en la plataforma a designar (Mailchimp / Klaviyo / otra)",
      "5 plantillas de correo responsivas y editables",
      "Segmentaci\u00f3n b\u00e1sica de contactos y documentaci\u00f3n de configuraci\u00f3n",
      "No incluye el costo de la licencia de la plataforma (a cargo del Cliente)"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },

  // ════════════════════════════════════════════
  // CONSULTORÍA
  // ════════════════════════════════════════════
  {
    slug: "consulting",
    name: "Diagn\u00f3stico Digital",
    category: "Consultor\u00eda",
    description: "Sin compromiso. Analizamos tu situaci\u00f3n actual, identificamos las oportunidades digitales reales para tu negocio y te entregamos una hoja de ruta clara con prioridades, presupuestos y plazos. La primera consulta es gratuita.",
    price: 150000,
    promo_price: 0,
    deliverables: [
      "Revisi\u00f3n de tu presencia digital actual (web, redes, SEO)",
      "An\u00e1lisis de competencia local",
      "Identificaci\u00f3n de procesos automatizables",
      "Hoja de ruta digital priorizada (30/60/90 d\u00edas)",
      "Recomendaciones con presupuestos estimados",
      "Sin compromiso de contrataci\u00f3n"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: "",
    is_popular: true
  }
];

export const POST: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  try {
    await initDb();
    let created = 0;
    let updated = 0;

    for (const svc of seedServices) {
      const existing = await query("SELECT id FROM services WHERE slug = $1", [svc.slug]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO services (slug, name, description, price, promo_price, category, deliverables, includes_maintenance, maintenance_price, maintenance_description, is_popular, is_monthly)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            svc.slug, svc.name, svc.description, svc.price,
            svc.promo_price, svc.category, JSON.stringify(svc.deliverables),
            svc.includes_maintenance, svc.maintenance_price, svc.maintenance_description,
            svc.is_popular || false, svc.is_monthly || false,
          ]
        );
        created++;
      } else {
        await query(
          `UPDATE services SET name=$1, description=$2, price=$3, promo_price=$4, category=$5, deliverables=$6,
           includes_maintenance=$7, maintenance_price=$8, maintenance_description=$9,
           is_popular=$10, is_monthly=$11, updated_at=NOW()
           WHERE slug=$12`,
          [
            svc.name, svc.description, svc.price,
            svc.promo_price, svc.category, JSON.stringify(svc.deliverables),
            svc.includes_maintenance, svc.maintenance_price, svc.maintenance_description,
            svc.is_popular || false, svc.is_monthly || false,
            svc.slug,
          ]
        );
        updated++;
      }
    }

    return new Response(JSON.stringify({ success: true, created, updated }), { status: 200 });
  } catch (err) {
    console.error("[Services] Seed error:", err);
    return new Response(JSON.stringify({ error: "Error al sembrar servicios" }), { status: 500 });
  }
};
