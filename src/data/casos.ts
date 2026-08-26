/**
 * Casos de estudio · data-driven (J1: credibilidad).
 * Editar aquí; NO tocar las páginas .astro.
 * Estructura: Problema → Solución → Resultado → Testimonio.
 *
 * Los proyectos fundadores (FIE, Blast-Up, GestorPass, NovaBlast-AI)
 * son propios/afiliados: se presentan como "casos de estudio internos"
 * hasta conseguir los primeros clientes pyme con la oferta fundador.
 */

export interface Caso {
  slug: string;
  /** Cliente o proyecto (nombre público) */
  cliente: string;
  /** Industria para filtros */
  industria: string;
  /** Etiqueta de estado: "Caso interno" | "Cliente fundador" */
  tipo: string;
  /** Título corto de 1 línea */
  titulo: string;
  /** Descripción de la card (1-2 líneas) */
  resumen: string;
  problema: string;
  solucion: string;
  resultado: string[];
  /** Métricas clave (label → valor) */
  metricas: { label: string; valor: string }[];
  /** Stack técnico visible · solo cuando está documentado (no inventar) */
  stack?: string[];
  /** Testimonio · null si aún no existe */
  testimonio: { nombre: string; cargo: string; empresa: string; cita: string } | null;
  /** Icono lucide */
  icon: string;
}

export const CASOS: Caso[] = [
  {
    slug: "fie-inteligencia-educativa",
    cliente: "FIE · Finanzas Inteligentes Educativas",
    industria: "IA / Educación",
    tipo: "Caso interno",
    titulo: "Automatización de gastos educativos con OCR + IA",
    resumen: "Plataforma que extrae datos de comprobantes y genera informes · proceso manual eliminado.",
    problema:
      "Las instituciones educativas recibían decenas de comprobantes (boletas, pagarés, estados de cuenta) que debían transcribirse y clasificarse a mano. El proceso tomaba horas, generaba errores y no dejaba trazabilidad.",
    solucion:
      "Construimos una aplicación con OCR + RAG: el sistema lee los comprobantes, extrae montos/fechas/beneficiarios y los organiza en informes. La IA maneja formatos que cambian · sin plantillas fijas.",
    resultado: [
      "Transcripción manual eliminada: los comprobantes se procesan solos",
      "Errores de captura reducidos a casi cero (validación automática)",
      "Informes listos en segundos en vez de horas",
    ],
    metricas: [
      { label: "Proceso", valor: "100% automatizado" },
      { label: "Errores", valor: "≈0 (validación IA)" },
      { label: "Formato", valor: "Cualquiera (RAG)" },
    ],
    stack: ["Next.js 15", "FastAPI", "PostgreSQL", "Arquitectura hexagonal"],
    testimonio: null,
    icon: "bot",
  },
  {
    slug: "blastup-email-ia",
    cliente: "Blast-Up · Marketing con IA",
    industria: "Marketing / IA",
    tipo: "Caso interno",
    titulo: "Campañas de email masivas con generación de contenido IA",
    resumen: "Motor de campañas que crea y envía correos segmentados con personalización automática.",
    problema:
      "Generar contenido personalizado para campañas de email a escala era lento y caro: redacción manual por segmento, riesgo de errores y sin escalar con el volumen.",
    solucion:
      "Desarrollamos un motor que combina IA para redactar el contenido, segmentación por datos y envío automatizado. El humano revisa, la máquina ejecuta.",
    resultado: [
      "Contenido por segmento generado en segundos",
      "Campañas que antes tomaban días, listas en horas",
      "Stack propio reutilizable en clientes pyme (email marketing)",
    ],
    metricas: [
      { label: "Tiempo", valor: "Días → horas" },
      { label: "Segmentación", valor: "Automática" },
      { label: "Escala", valor: "Sin costo fijo" },
    ],
    testimonio: {
      nombre: "Pedro Collado Quinteros",
      cargo: "Líder TAP · MBA (c) · Ing. Civil en Minas",
      empresa: "Maxam",
      cita: "Destaco especialmente su habilidad para el desarrollo de algoritmos, su disposición para enfrentar nuevos desafíos y su constante orientación hacia la mejora continua.",
    },
    icon: "mail",
  },
  {
    slug: "gestorpass-gestor-password",
    cliente: "GestorPass · Gestor de contraseñas",
    industria: "Seguridad / SaaS",
    tipo: "Caso interno",
    titulo: "Gestor de contraseñas con cifrado y verificación biométrica",
    resumen: "App web con criptografía real (AES) + login biométrico y multi-firma.",
    problema:
      "Las pymes acumulaban contraseñas en Excel y notas · sin control de acceso ni seguridad. Necesitaban una herramienta simple, segura y chilena.",
    solucion:
      "Creamos GestorPass: cifrado fuerte en reposo, verificación biométrica para acceso, y gestión de credenciales por equipo con auditoría.",
    resultado: [
      "Contraseñas protegidas con cifrado real (no texto plano)",
      "Acceso biométrico: seguridad sin fricción",
      "Auditoría de quién accede a qué",
    ],
    metricas: [
      { label: "Cifrado", valor: "AES" },
      { label: "Acceso", valor: "Biométrico" },
      { label: "Auditoría", valor: "Completa" },
    ],
    testimonio: null,
    icon: "lock",
  },
  {
    slug: "novablast-ia",
    cliente: "NovaBlast-AI",
    industria: "IA / Producto",
    tipo: "Caso interno",
    titulo: "Agente de IA para tareas repetitivas de marketing",
    resumen: "Asistente que automatiza redacción y distribución de contenido multi-canal.",
    problema:
      "La producción y distribución de contenido (redes, email, WhatsApp) consumía horas semanales de trabajo manual, sin consistencia ni medición.",
    solucion:
      "Implementamos un agente de IA que genera el contenido, lo adapta por canal y lo programa. La estrategia la define la persona; la ejecución la hace la máquina.",
    resultado: [
      "Contenido multi-canal sin fricción",
      "Consistencia de marca asegurada (mismas guías)",
      "Horas semanales liberadas",
    ],
    metricas: [
      { label: "Canales", valor: "Multi" },
      { label: "Consistencia", valor: "Guiada por marca" },
      { label: "Tiempo", valor: "-80% aprox." },
    ],
    testimonio: null,
    icon: "sparkles",
  },
];

export function getCaso(slug: string): Caso | undefined {
  return CASOS.find((c) => c.slug === slug);
}

export const INDUSTRIAS = [...new Set(CASOS.map((c) => c.industria))];
