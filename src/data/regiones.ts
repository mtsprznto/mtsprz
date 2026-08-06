// Datos locales por comuna · diferenciación de páginas región.
// Fuente población: INE, Censo de Población y Vivienda 2024 (resultados oficiales).
// Distancias: carretera aproximada desde Puerto Varas (Ruta 5 y accesos).
// Actualizar solo con fuente verificable. No inventar cifras.

export interface RegionInfo {
  slug: string;
  nombre: string;
  region: string;
  poblacion: number;
  distanciaKm: number; // desde Puerto Varas, aprox.
  sectores: string[];
  hitos: string[];
  notaDistancia?: string; // ej. "incluye ferry Pargua–Chacao"
}

export const REGIONES: Record<string, RegionInfo> = {
  "puerto-varas": {
    slug: "puerto-varas",
    nombre: "Puerto Varas",
    region: "Región de Los Lagos",
    poblacion: 52942,
    distanciaKm: 0,
    sectores: ["turismo y hospedaje", "gastronomía", "servicios profesionales", "inmobiliario"],
    hitos: ["Lago Llanquihue y volcán Osorno", "ciudad jardín", "destino turístico principal de Los Lagos"],
  },
  "puerto-montt": {
    slug: "puerto-montt",
    nombre: "Puerto Montt",
    region: "Región de Los Lagos",
    poblacion: 277040,
    distanciaKm: 20,
    sectores: ["salmonicultura y acuicultura", "comercio y logística", "servicios portuarios", "gastronomía"],
    hitos: ["capital de la Región de Los Lagos", "puerto de Angelmó", "puerta de la Patagonia"],
  },
  osorno: {
    slug: "osorno",
    nombre: "Osorno",
    region: "Región de Los Lagos",
    poblacion: 166455,
    distanciaKm: 92,
    sectores: ["ganadería y lechería", "agroindustria", "retail", "salud", "servicios profesionales"],
    hitos: ["capital de la provincia de Osorno", "polo ganadero y lácteo del sur", "plaza de armas y mercado municipal"],
  },
  valdivia: {
    slug: "valdivia",
    nombre: "Valdivia",
    region: "Región de Los Ríos",
    poblacion: 170043,
    distanciaKm: 190,
    sectores: ["educación superior (Universidad Austral)", "cervecería artesanal", "turismo y gastronomía", "comercio"],
    hitos: ["ciudad universitaria", "Feria Fluvial", "cerveza artesanal", "fuerte de Niebla"],
  },
  castro: {
    slug: "castro",
    nombre: "Castro",
    region: "Región de Los Lagos",
    poblacion: 46997,
    distanciaKm: 195,
    sectores: ["turismo", "gastronomía chilota", "artesanía", "acuicultura"],
    hitos: ["capital de Chiloé", "palafitos y casas coloridas", "iglesia patrimonial de Castro"],
  },
  ancud: {
    slug: "ancud",
    nombre: "Ancud",
    region: "Región de Los Lagos",
    poblacion: 40949,
    distanciaKm: 105,
    sectores: ["turismo", "pesca", "comercio", "gastronomía"],
    hitos: ["puerta de entrada a Chiloé", "Fuerte San Antonio", "museo regional de Chiloé"],
    notaDistancia: "incluye ferry Pargua–Chacao",
  },
  calbuco: {
    slug: "calbuco",
    nombre: "Calbuco",
    region: "Región de Los Lagos",
    poblacion: 36474,
    distanciaKm: 55,
    sectores: ["pesca artesanal", "acuicultura y mitilicultura", "turismo rural"],
    hitos: ["capital de la mitilicultura chilena", "isla y volcán Calbuco", "fuerte de Calbuco"],
    notaDistancia: "vía Puerto Montt",
  },
  frutillar: {
    slug: "frutillar",
    nombre: "Frutillar",
    region: "Región de Los Lagos",
    poblacion: 22554,
    distanciaKm: 32,
    sectores: ["turismo cultural", "gastronomía", "artesanía", "hospedaje"],
    hitos: ["Teatro del Lago", "Semanas Musicales", "costanera y patrimonio alemán"],
  },
  purranque: {
    slug: "purranque",
    nombre: "Purranque",
    region: "Región de Los Lagos",
    poblacion: 19542,
    distanciaKm: 45,
    sectores: ["agropecuario", "lechería", "servicios rurales"],
    hitos: ["zona agrícola y ganadera", "ruta entre Osorno y Puerto Varas"],
  },
  llanquihue: {
    slug: "llanquihue",
    nombre: "Llanquihue",
    region: "Región de Los Lagos",
    poblacion: 18088,
    distanciaKm: 11,
    sectores: ["agroindustria láctea", "turismo lacustre", "comercio local"],
    hitos: ["orilla del Lago Llanquihue", "industria lechera", "cercanía a Puerto Varas"],
  },
  chonchi: {
    slug: "chonchi",
    nombre: "Chonchi",
    region: "Región de Los Lagos",
    poblacion: 16078,
    distanciaKm: 210,
    sectores: ["turismo patrimonial", "pesca artesanal", "artesanía"],
    hitos: ["palafitos patrimoniales", "ciudad de los tres pisos", "patrimonio UNESCO"],
  },
  maullin: {
    slug: "maullin",
    nombre: "Maullín",
    region: "Región de Los Lagos",
    poblacion: 15063,
    distanciaKm: 60,
    sectores: ["pesca artesanal", "turismo rural", "gastronomía"],
    hitos: ["río Maullín", "puerta de paso a Chiloé", "tradición pesquera"],
    notaDistancia: "vía Puerto Montt",
  },
  fresia: {
    slug: "fresia",
    nombre: "Fresia",
    region: "Región de Los Lagos",
    poblacion: 12320,
    distanciaKm: 50,
    sectores: ["sector forestal", "agricultura", "comercio local"],
    hitos: ["polo forestal", "zona agrícola entre Frutillar y Purranque"],
  },
  queilen: {
    slug: "queilen",
    nombre: "Queilén",
    region: "Región de Los Lagos",
    poblacion: 5690,
    distanciaKm: 235,
    sectores: ["pesca artesanal", "turismo rural", "artesanía"],
    hitos: ["pueblo costero de Chiloé", "tradición pesquera", "sur profundo de Chiloé"],
  },
};

export function getRegion(slug: string): RegionInfo | undefined {
  return REGIONES[slug];
}
