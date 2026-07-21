# 🕵️ Prospector — Sistema de Prospección de Clientes

Sistema modular para **obtener, enriquecer y exportar prospectos** de la Región de Los Lagos, Chile. Extrae datos desde **Google Maps**, **Yelu.cl**, **ChileRutEmpresa.cl**, y archivos **CSV**.

> ⚡ Usa `uv` como gestor de paquetes (el doble de rápido que pip).

---

## ⚙️ Requisitos

- **Python ≥ 3.12**
- **uv** — instalarlo con: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Playwright** (solo para scraper de Google Maps):
  ```bash
  uv run playwright install chromium
  ```

---

## 🚀 Instalación

```bash
# Navegar al directorio del prospector
cd scripts/prospector

# Crear entorno virtual e instalar dependencias
uv sync

# (Opcional) Verificar que funciona
uv run prospector --version
```

---

## 📋 Uso Básico

### Ver ayuda
```bash
uv run prospector --help
uv run prospector scrape --help
```

### Ver estadísticas de la base de datos
```bash
uv run prospector stats
uv run prospector stats --export data/report.json
```

### Listar prospectos
```bash
uv run prospector list-prospects
uv run prospector list-prospects --rubro otro --limit 10
```

---

## 🔍 Scraping (Extraer Prospectos)

### Yelu.cl (directorio chileno — teléfonos reales)
```bash
# Una ciudad específica
uv run prospector scrape yelu --ciudades puerto_varas --max 20

# Varias ciudades
uv run prospector scrape yelu --ciudades puerto_varas,puerto_montt,osorno --max 50

# Por categoría (ej: abogados en Frutillar)
uv run prospector scrape yelu --ciudades frutillar --categoria abogado --max 30
```

**Ciudades disponibles:** `puerto_varas`, `puerto_montt`, `osorno`, `valdivia`, `frutillar`, `llanquihue`, `calbuco`, `ancud`, `castro`, `quellon`, `rio_negro`, `purranque`, `la_union`, `paillaco`, `rio_bueno`, `lago_ranco`, `puyehue`

### Google Maps (Playwright — requiere navegador)
```bash
uv run prospector scrape gmaps --query "inmobiliaria Puerto Varas" --max 30
uv run prospector scrape gmaps --query "restaurante Osorno" --max 50
```

### Google Maps Batch (múltiples rubros × ciudades)
```bash
uv run prospector scrape gmaps-batch \
    --rubros "inmobiliaria,abogado,restaurante" \
    --ciudades "Puerto Varas,Puerto Montt,Osorno" \
    --max 20
```

### Barrido Completo (Yelu + GMaps)
```bash
uv run prospector scrape all --max-yelu 30 --max-gmaps 15
```

### ChileRutEmpresa.cl (datos SII públicos) —⚠️ datos de ejemplo
```bash
uv run prospector scrape chilerut --provincias Llanquihue,Osorno
```

> ⚠️ El scraper de ChileRut actualmente usa **datos de ejemplo**. La implementación real con BeautifulSoup está pendiente.

---

## 📤 Importar CSV

```bash
uv run prospector import-csv ruta/archivo.csv --fuente "mi_lista" --save
```

El importador **detecta automáticamente** nombres de columna:
- `empresa`, `nombre`, `razon_social` → nombre de la empresa
- `telefono`, `celular`, `phone` → teléfono
- `email`, `correo`, `mail` → email
- `rut` → RUT (valida dígito verificador)
- `sitio_web`, `web`, `url` → sitio web

---

## 🔧 Enriquecer Datos

### 1. Buscar sitios web faltantes (vía Google Search)
```bash
uv run prospector find-websites --limit 50 --save
```

### 2. Extraer emails desde sitios web
```bash
uv run prospector enrich web --limit 100
uv run prospector enrich web --solo-sin-email
```

### 3. Analizar presencia digital completa
```bash
uv run prospector enrich all
```

---

## ✅ Validar y Limpiar

```bash
# Validar todos los datos
uv run prospector validate

# Validar y corregir automáticamente
uv run prospector validate --fix
```

---

## 🗑️ Detectar Duplicados

```bash
# Solo analizar
uv run prospector dedup

# Analizar y eliminar
uv run prospector dedup --auto-remove
```

Estrategias de detección:
1. **RUT** exacto
2. **Teléfono** en común
3. **Email** en común
4. **Nombre fuzzy** + misma comuna (thefuzz ≥ 85%)

---

## 📊 Exportar

```bash
# Todos los prospectos
uv run prospector export

# Filtrados
uv run prospector export --rubro inmobiliaria --min-score 40
uv run prospector export --comuna "Puerto Varas" --solo-telefono
uv run prospector export --formato json

# Para campaña de email marketing
uv run prospector export-emails --output campana_email.csv
```

---

## 🧪 Modo Dry-Run (Simular sin modificar)

Agrega `-n` o `--dry-run` a cualquier comando para ver qué haría sin modificar datos:

```bash
uv run prospector -n scrape yelu --ciudades puerto_varas --max 10
uv run prospector -n dedup --auto-remove
uv run prospector -n find-websites --limit 5
```

---

## 🐛 Modo Debug

```bash
# INFO detallado
uv run prospector -v stats

# DEBUG completo
uv run prospector -vv scrape yelu --ciudades puerto_varas --max 5

# TRACE (máxima verbosidad)
uv run prospector -vvv validate
```

---

## 📁 Estructura del Proyecto

```
scripts/prospector/
├── src/prospector/
│   ├── main.py                  # CLI (click commands)
│   ├── core/
│   │   ├── config.py            # Config desde pyproject.toml + env vars
│   │   ├── database.py          # JSON store con backups atómicos
│   │   ├── logger.py            # Logging estructurado con colores
│   │   └── models.py            # Pydantic models (Prospect, SenalesDigitales)
│   ├── scrapers/
│   │   ├── base.py              # BaseScraper con rate limiting + retry
│   │   ├── yelu.py              # Yelu.cl (directorio chileno)
│   │   ├── google_maps.py       # Google Maps con Playwright
│   │   ├── google_search.py     # Google Search para encontrar webs
│   │   ├── chilerut.py          # ChileRutEmpresa.cl (SII)
│   │   └── web_scraper.py       # Extrae emails/teléfonos de sitios web
│   ├── enrichers/
│   │   └── digital_presence.py  # Score digital 0-100
│   ├── exporters/
│   │   └── csv_exporter.py      # Exportación a CSV con filtros
│   ├── importers/
│   │   └── csv_importer.py      # Importación CSV con mapeo automático
│   ├── validators/
│   │   ├── rut.py               # Validador RUT chileno
│   │   ├── phone.py             # Normalizador teléfonos +56 9
│   │   └── email.py             # Validador emails + anti-temp
│   └── utils/
│       ├── dedup.py              # Desduplicación fuzzy
│       └── stats.py              # Reportes y estadísticas
├── data/
│   ├── prospects.json            # Base de datos principal
│   ├── backups/                  # Backups automáticos (cada escritura)
│   ├── checkpoints/              # Checkpoints para reanudar scrapers
│   └── exports/                  # CSVs exportados
├── logs/
│   ├── prospector.log            # Log principal (rotativo)
│   └── errors.log                # Solo errores
├── pyproject.toml                # Dependencias y configuración
└── uv.lock                       # Lockfile de dependencias
```

---

## ⚙️ Configuración

### pyproject.toml (bajo `[tool.prospector]`)

```toml
[tool.prospector]
data_dir = "data"
log_dir = "logs"
default_region = "Los Lagos"

[tool.prospector.scraping]
delay = 2.0       # segundos entre requests
timeout = 30      # timeout HTTP
max_retries = 3   # reintentos con backoff

[tool.prospector.logging]
level = "INFO"
max_size_mb = 10
backup_count = 5
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PROSPECTOR_DATA_DIR` | Directorio de datos |
| `PROSPECTOR_LOG_DIR` | Directorio de logs |
| `PROSPECTOR_LOG_LEVEL` | Nivel de logging |
| `PROSPECTOR_SCRAPE_DELAY` | Delay entre requests |
| `PROSPECTOR_DEFAULT_REGION` | Región por defecto |

---

## 🧠 Pipeline Recomendado

```bash
# 1. Scrapeo masivo
uv run prospector scrape all --max-yelu 50 --max-gmaps 20

# 2. Buscar websites de los que no tienen
uv run prospector find-websites --limit 100 --save

# 3. Extraer emails
uv run prospector enrich web --limit 200

# 4. Validar y limpiar
uv run prospector validate --fix
uv run prospector dedup --auto-remove

# 5. Analizar presencia digital
uv run prospector enrich all

# 6. Exportar
uv run prospector export-emails --output campana_email.csv
uv run prospector export --rubro inmobiliaria --min-score 40 --formato csv
```

---

## ❓ Solución de Problemas

| Problema | Solución |
|----------|----------|
| `Playwright no instalado` | `uv run playwright install chromium` |
| `greenlet.h: No such file or directory` | `uv sync` (se corrige solo) |
| `Failed to hardlink files` | `export UV_LINK_MODE=copy` |
| Scraper lento | Aumentar `delay` en pyproject.toml o reducir `max` |
| Google Maps bloquea | Reducir `--max`, aumentar `delay=3.0` |
| CSV no tiene columnas reconocidas | Usar `--help` para ver mapeo de columnas |

---

## 📝 Notas

- Los datos se almacenan en **JSON plano** con backup atómico antes de cada escritura
- Los scrapers tienen **rate limiting** configurable para no saturar servidores
- Los checkpoints permiten **reanudar** scrapers interrumpidos (`--resume`)
- El proyecto es parte del ecosistema **Mtsprz** — plataforma de marketing digital para la Región de Los Lagos
