import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

const seedServices = [
  {
    slug: "landing",
    name: "Landing Page Profesional",
    category: "Desarrollo Web",
    description: "Landing page moderna, optimizada y responsive. Incluye levantamiento de requerimientos con sesi\u00f3n de discovery para definir objetivo, p\u00fablico objetivo, mensaje clave y CTA. Dise\u00f1o UI/UX con 1 propuesta visual + 1 ronda de revisi\u00f3n. Desarrollo con stack moderno. Optimizaci\u00f3n Lighthouse 90+ en todas las m\u00e9tricas. SEO b\u00e1sico. Formulario de contacto con validaci\u00f3n y notificaciones. Hosting 3 meses incluido con SSL y CDN. Analytics b\u00e1sico.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "Sesi\u00f3n de discovery y levantamiento de requerimientos",
      "1 propuesta de dise\u00f1o UI/UX",
      "Landing page responsive (desktop + mobile)",
      "Formulario de contacto funcional",
      "SEO on-page b\u00e1sico",
      "Hosting 3 meses incluido",
      "Certificado SSL + CDN",
      "Google Analytics 4 configurado"
    ],
    includes_maintenance: true,
    maintenance_price: 45000,
    maintenance_description: "Hosting, SSL, monitoreo 24/7, backups semanales, actualizaciones de seguridad y soporte t\u00e9cnico prioritario."
  },
  {
    slug: "web-profesional",
    name: "Sitio Web Profesional",
    category: "Desarrollo Web",
    description: "Sitio web completo de 5 a 10 p\u00e1ginas. Incluye levantamiento detallado de requerimientos con arquitectura de la informaci\u00f3n, mapa del sitio y user flows. Dise\u00f1o UI/UX con 2 propuestas visuales + 2 rondas de revisi\u00f3n. Blog integrado con CMS. Panel administrador. Optimizaci\u00f3n SEO avanzada. Hosting 3 meses incluido.",
    price: 800000,
    promo_price: 690000,
    deliverables: [
      "Levantamiento de requerimientos y arquitectura de informaci\u00f3n",
      "2 propuestas de dise\u00f1o UI/UX",
      "Sitio web completo responsive (5-10 p\u00e1ginas)",
      "Blog integrado con CMS",
      "Panel administrador",
      "SEO avanzado on-page",
      "Hosting 3 meses incluido",
      "Certificado SSL + CDN",
      "Google Analytics 4",
      "Capacitaci\u00f3n de uso"
    ],
    includes_maintenance: true,
    maintenance_price: 75000,
    maintenance_description: "Hosting, SSL, monitoreo 24/7, backups semanales, actualizaciones de seguridad, soporte t\u00e9cnico prioritario y mantenimiento de contenido."
  },
  {
    slug: "ecommerce",
    name: "Tienda Online (E-commerce)",
    category: "Desarrollo Web",
    description: "E-commerce completo con cat\u00e1logo ilimitado, carrito de compras, integraci\u00f3n de pagos Webpay/Flow, dashboard de ventas, gesti\u00f3n de inventario y panel administrador. Incluye levantamiento de requerimientos y casos de uso del negocio. SEO avanzado para tiendas online. Hosting 3 meses incluido.",
    price: 1800000,
    promo_price: 1500000,
    deliverables: [
      "Levantamiento de requerimientos y casos de uso",
      "Arquitectura de producto y cat\u00e1logo",
      "Dise\u00f1o UI/UX completo",
      "Cat\u00e1logo de productos ilimitado",
      "Carrito de compras funcional",
      "Webpay/Flow/Transbank integrado",
      "Dashboard de ventas y gesti\u00f3n",
      "Gesti\u00f3n de inventario",
      "Panel administrador",
      "SEO avanzado e-commerce",
      "Hosting 3 meses incluido",
      "Certificado SSL + CDN"
    ],
    includes_maintenance: true,
    maintenance_price: 120000,
    maintenance_description: "Hosting premium, SSL, monitoreo 24/7, backups diarios, actualizaciones de seguridad, soporte prioritario, mantenimiento de cat\u00e1logo y productos."
  },
  {
    slug: "seo-audit",
    name: "Auditor\u00eda SEO",
    category: "SEO",
    description: "An\u00e1lisis completo y profundo de tu sitio web: auditor\u00eda t\u00e9cnica, an\u00e1lisis de contenido, estudio de competencia local, evaluaci\u00f3n de backlinks y ranking de palabras clave. Incluye reporte ejecutivo con plan de acci\u00f3n priorizado y recomendaciones concretas para mejorar el posicionamiento.",
    price: 200000,
    promo_price: 150000,
    deliverables: [
      "Auditor\u00eda t\u00e9cnica completa",
      "An\u00e1lisis de contenido y estructura",
      "Estudio de competencia local",
      "Evaluaci\u00f3n de perfil de backlinks",
      "Ranking de palabras clave objetivo",
      "Reporte ejecutivo con plan de acci\u00f3n",
      "Recomendaciones priorizadas"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },
  {
    slug: "seo-local",
    name: "SEO Local",
    category: "SEO",
    description: "Posiciona tu negocio en Google Maps y b\u00fasquedas locales. Incluye optimizaci\u00f3n completa de Google My Business (Google Business Profile), gesti\u00f3n de citas locales, optimizaci\u00f3n de rese\u00f1as, estrategia de contenido local y reporte mensual de resultados.",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "Optimizaci\u00f3n completa de Google Business Profile",
      "Gesti\u00f3n de citas locales (directorios)",
      "Optimizaci\u00f3n de rese\u00f1as y reputaci\u00f3n",
      "Estrategia de contenido local",
      "Monitoreo de posiciones locales",
      "Reporte mensual de resultados",
      "Soporte 3 meses"
    ],
    includes_maintenance: true,
    maintenance_price: 80000,
    maintenance_description: "Monitoreo continuo de posiciones, gesti\u00f3n de rese\u00f1as, actualizaci\u00f3n de perfil, reportes mensuales y soporte prioritario."
  },
  {
    slug: "seo-mensual",
    name: "Mantenimiento SEO Mensual",
    category: "SEO",
    description: "SEO continuo para mantener y mejorar el posicionamiento mes a mes. Incluye monitoreo de posiciones, optimizaci\u00f3n de contenido, an\u00e1lisis de competencia, generaci\u00f3n de reportes y soporte prioritario. Ideal para negocios que ya tienen SEO b\u00e1sico y quieren mantener su ventaja competitiva.",
    price: 150000,
    promo_price: 120000,
    deliverables: [
      "Monitoreo semanal de posiciones",
      "Optimizaci\u00f3n continua de contenido",
      "An\u00e1lisis de competencia mensual",
      "Detecci\u00f3n y correcci\u00f3n de errores",
      "Reporte mensual detallado",
      "Soporte prioritario"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },
  {
    slug: "bot-whatsapp",
    name: "Bot WhatsApp",
    category: "Automatizaciones",
    description: "Chatbot automatizado para atenci\u00f3n al cliente 24/7 v\u00eda WhatsApp. Incluye levantamiento de casos de uso, respuestas autom\u00e1ticas inteligentes, cat\u00e1logo interactivo de productos/servicios, integraci\u00f3n con WhatsApp Business API, dashboard de gesti\u00f3n y an\u00e1lisis de conversaciones.",
    price: 300000,
    promo_price: 250000,
    deliverables: [
      "Levantamiento de casos de uso y flujos de conversaci\u00f3n",
      "Configuraci\u00f3n de WhatsApp Business API",
      "Respuestas autom\u00e1ticas inteligentes",
      "Cat\u00e1logo interactivo de productos",
      "Dashboard de gesti\u00f3n",
      "An\u00e1lisis de conversaciones",
      "Soporte 1 mes post-lanzamiento"
    ],
    includes_maintenance: true,
    maintenance_price: 60000,
    maintenance_description: "Mantenimiento del bot, actualizaci\u00f3n de respuestas, monitoreo de conversaciones, reportes mensuales y soporte prioritario."
  },
  {
    slug: "email-flow",
    name: "Flujo Email Marketing",
    category: "Automatizaciones",
    description: "Automatizaci\u00f3n de correos electr\u00f3nicos para nurturing de clientes. Incluye secuencia de bienvenida, recuperaci\u00f3n de carritos abandonados, newsletter autom\u00e1tico, integraci\u00f3n API con tu CRM, dise\u00f1o de plantillas profesionales y reportes de rendimiento.",
    price: 250000,
    promo_price: 200000,
    deliverables: [
      "Levantamiento de flujos de comunicaci\u00f3n",
      "Secuencia de bienvenida automatizada",
      "Recuperaci\u00f3n de carritos abandonados",
      "Newsletter peri\u00f3dico autom\u00e1tico",
      "Dise\u00f1o de plantillas profesionales",
      "Integraci\u00f3n API con CRM",
      "Reportes de rendimiento"
    ],
    includes_maintenance: true,
    maintenance_price: 50000,
    maintenance_description: "Mantenimiento de flujos, actualizaci\u00f3n de plantillas, monitoreo de entregabilidad y reportes mensuales."
  },
  {
    slug: "crm-integration",
    name: "Integraci\u00f3n CRM",
    category: "Automatizaciones",
    description: "Conecta tus herramientas y centraliza la gesti\u00f3n de clientes. Incluye levantamiento de procesos, conexi\u00f3n API entre sistemas, sincronizaci\u00f3n bidireccional de datos, automatizaci\u00f3n de tareas, reportes de ventas y capacitaci\u00f3n del equipo.",
    price: 500000,
    promo_price: 400000,
    deliverables: [
      "Levantamiento de procesos y requerimientos",
      "Conexi\u00f3n API entre sistemas",
      "Sincronizaci\u00f3n bidireccional de datos",
      "Automatizaci\u00f3n de tareas repetitivas",
      "Reportes de ventas personalizados",
      "Dashboard de gesti\u00f3n",
      "Capacitaci\u00f3n del equipo",
      "Soporte 1 mes post-implementaci\u00f3n"
    ],
    includes_maintenance: true,
    maintenance_price: 90000,
    maintenance_description: "Mantenimiento de integraciones, monitoreo de sincronizaci\u00f3n, actualizaciones de API, soporte prioritario y reportes mensuales."
  },
  {
    slug: "logo-brand",
    name: "Logo + Identidad Visual",
    category: "Dise\u00f1o Gr\u00e1fico",
    description: "Marca profesional que conecta con tu audiencia. Incluye sesi\u00f3n de briefing, investigaci\u00f3n de mercado, logo principal con variantes crom\u00e1ticas, tipograf\u00eda corporativa, paleta de colores, papeler\u00eda b\u00e1sica y manual de marca.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "Sesi\u00f3n de briefing e investigaci\u00f3n",
      "Logo principal + variantes",
      "Tipograf\u00eda corporativa",
      "Paleta de colores",
      "Papeler\u00eda b\u00e1sica (tarjeta, firma)",
      "Manual de marca"
    ],
    includes_maintenance: false,
    maintenance_price: 0,
    maintenance_description: ""
  },
  {
    slug: "social-media",
    name: "Gesti\u00f3n Redes Sociales",
    category: "Marketing Digital",
    description: "Contenido y gesti\u00f3n profesional de tus redes sociales. Incluye estrategia de contenido, 8 publicaciones mensuales con dise\u00f1o gr\u00e1fico, copywriting profesional, gesti\u00f3n de comunidad, interacci\u00f3n con seguidores y reporte mensual de resultados.",
    price: 350000,
    promo_price: 290000,
    deliverables: [
      "Estrategia de contenido mensual",
      "8 publicaciones dise\u00f1adas profesionalmente",
      "Copywriting para cada publicaci\u00f3n",
      "Gesti\u00f3n de comunidad",
      "Interacci\u00f3n y respuestas",
      "Reporte mensual de rendimiento",
      "Optimizaci\u00f3n continua"
    ],
    includes_maintenance: true,
    maintenance_price: 290000,
    maintenance_description: "Servicio continuo mes a mes: mismas prestaciones renovadas autom\u00e1ticamente con reportes y optimizaci\u00f3n continua."
  },
  {
    slug: "google-ads",
    name: "Google Ads",
    category: "Marketing Digital",
    description: "Campa\u00f1as publicitarias efectivas en Google. Incluye configuraci\u00f3n de campa\u00f1a, investigaci\u00f3n de palabras clave, segmentaci\u00f3n local, creaci\u00f3n de anuncios, A/B testing, optimizaci\u00f3n continua y reporte semanal de rendimiento.",
    price: 250000,
    promo_price: 200000,
    deliverables: [
      "Configuraci\u00f3n completa de campa\u00f1a",
      "Investigaci\u00f3n de palabras clave",
      "Segmentaci\u00f3n local avanzada",
      "Creaci\u00f3n de anuncios",
      "A/B testing continuo",
      "Optimizaci\u00f3n de puja",
      "Reporte semanal de rendimiento"
    ],
    includes_maintenance: true,
    maintenance_price: 200000,
    maintenance_description: "Servicio continuo mes a mes: gesti\u00f3n de campa\u00f1a, optimizaci\u00f3n de puja, A/B testing, reportes semanales y soporte prioritario."
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
          `INSERT INTO services (slug, name, description, price, promo_price, category, deliverables, includes_maintenance, maintenance_price, maintenance_description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            svc.slug, svc.name, svc.description, svc.price,
            svc.promo_price, svc.category, JSON.stringify(svc.deliverables),
            svc.includes_maintenance, svc.maintenance_price, svc.maintenance_description,
          ]
        );
        created++;
      } else {
        await query(
          `UPDATE services SET name=$1, description=$2, price=$3, promo_price=$4, category=$5, deliverables=$6,
           includes_maintenance=$7, maintenance_price=$8, maintenance_description=$9, updated_at=NOW()
           WHERE slug=$10`,
          [
            svc.name, svc.description, svc.price,
            svc.promo_price, svc.category, JSON.stringify(svc.deliverables),
            svc.includes_maintenance, svc.maintenance_price, svc.maintenance_description,
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
