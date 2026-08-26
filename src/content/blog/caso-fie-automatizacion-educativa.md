---
title: "Automatizacion de gastos educativos con OCR + IA: caso FIE"
description: "Como construimos una plataforma que extrae datos de comprobantes automaticamente usando OCR y RAG. Caso real de una startup edtech en el sur de Chile."
pubDate: 2026-08-26
author: "Matias Perez Nauto"
image: "/blog/og-agentes-ia-empresas.svg"
tags: ["ia", "automatizacion", "caso de estudio", "ocr", "educacion", "chile"]
---

## El problema: horas transcribiendo comprobantes a mano

FIE (Finanzas Inteligentes Educativas) es una plataforma edtech que ayuda a instituciones educativas en Chile a gestionar sus finanzas. Su equipo detecto un cuello de botella critico: **decenas de comprobantes (boletas, pagarés, estados de cuenta) llegaban por email y debian transcribirse manualmente** a una hoja de control.

El proceso era simple pero lento:

- Un administrador abria cada comprobante PDF o imagen
- Copiaba monto, fecha, beneficiario y categoria
- Lo ingresaba en una planilla
- Verificaba errores de tipeo
- Repetia para cada documento

**Tiempo estimado:** 2-3 horas diarias para una institucion mediana.
**Errores tipicos:** montos mal copiados, fechas invertidas, categorias incorrectas.
**Resultado:** datos sin trazabilidad, decisiones financieras con informacion incompleta.

## La solucion: OCR + RAG que entiende cualquier formato

Construimos una aplicacion que elimina la transcripcion manual por completo. El sistema tiene 3 capas:

### 1. Captura automatica

Los comprobantes llegan por email o se suben directamente. El sistema acepta PDF, JPG, PNG y hasta fotos de celular. No necesita un formato estandar.

### 2. Extraccion con OCR + IA

Aqui es donde se pone interesante. Usamos un modelo de OCR (Reconocimiento Optico de Caracteres) para leer el texto del comprobante. Luego, una capa de IA interpreta los datos:

- **Montos:** el sistema entiende que "$1.250.000" y "$1250000" son lo mismo
- **Fechas:** reconoce "15/03/2026", "15 de marzo de 2026" y "mar-26"
- **Beneficiarios:** extrae nombres aunque aparezcan abreviados
- **Categorias:** la IA sugiere si es "material educativo", "servicio tecnico" o "arriendo"

### 3. RAG para formatos nuevos

Aqui viene lo que hace diferente a este sistema de un OCR clasico. **RAG (Retrieval-Augmented Generation)** permite que la IA consulte ejemplos anteriores para entender formatos que nunca ha visto.

Si un proveedor cambia el formato de su boleta, el sistema no se rompe. Busca en la base de comprobantes procesados anteriormente y encuentra el patron mas similar. Es como tener un asistente que aprende de cada documento que procesa.

## Resultados: de horas a segundos

Los numeros hablan por si solos:

| Metrica | Antes | Despues |
|---------|-------|---------|
| Tiempo de procesamiento | 2-3 horas/dia | Segundos por comprobante |
| Errores de captura | 5-10% (humano) | Casi 0 (validacion automatica) |
| Formatos soportados | Solo Excel | Cualquier PDF, imagen o foto |
| Trazabilidad | Sin registro | Historial completo con timestamps |

**El proceso manual fue eliminado por completo.** Los administradores ahora dedican su tiempo a analizar los datos, no a copiarlos.

## Stack tecnico

- **Frontend:** Next.js 15 (React)
- **Backend:** FastAPI (Python)
- **Base de datos:** PostgreSQL
- **OCR:** Motor custom + modelos de IA
- **Arquitectura:** Hexagonal (clean architecture)
- **Deploy:** Docker en VPS

La arquitectura hexagonal fue clave: permite cambiar el motor de OCR sin tocar el resto de la aplicacion. Si mañana aparece un modelo mejor, se cambia una pieza y todo sigue funcionando.

## Que aprendimos

**El problema no era la tecnologia, era el proceso.** FIE tenia gente inteligente perdiendo tiempo en tareas repetitivas. La solucion no fue "poner un chatbot" sino rediseñar el flujo completo de trabajo.

**Los formatos cambian, la IA tambien.** Un OCR clasico se rompe cuando el formato cambia. RAG permite adaptarse sin reprogramar. Esto es especialmente importante en Chile, donde cada proveedor tiene su propio formato de comprobante.

**Lo simple es lo que funciona.** No necesitaban un ERP de $20 millones. Necesitaban que los numeros llegaran solos a la planilla.

---

*Este es un caso de estudio interno de Mtsprz. Desarrollamos la solucion tecnica para FIE como parte de nuestro programa de innovacion.*

*Quieres algo similar para tu negocio? [Conversemos sin compromiso](/contacto).*
