---
title: "Gestor de contraseñas con cifrado real: caso GestorPass"
description: "Como construimos un gestor de contraseñas seguro para pymes chilenas con cifrado AES, verificacion biometrica y auditoria completa. Caso real."
pubDate: 2026-08-26
author: "Matias Perez Nauto"
image: "/blog/og-agentes-ia-empresas.svg"
tags: ["seguridad", "saas", "caso de estudio", "cifrado", "pymes", "chile"]
---

## El problema: contraseñas en Excel y notas adhesivas

GestorPass nacio de un problema que toda pyme chilena tiene pero nadie quiere admitir: **las contraseñas estan en un Excel, en una nota adhesiva, o peor, en la memoria del jefe**.

El escenario tipico:

- "La contraseña del Instagram es la del restaurante pero con 2026"
- "El login del banco esta en el Excel de contabilidad"
- "La clave del WiFi la sabe todo el mundo"
- "Cuando se va un empleado, hay que cambiar todas las contraseñas"

**Sin control de acceso.** Cualquier empleado con acceso al Excel puede ver las credenciales de todo. Sin auditoria. Sin registro de quien accedio que.

## La solucion: cifrado fuerte + acceso biometrico

Construimos GestorPass: una aplicacion web que resuelve seguridad y usabilidad al mismo tiempo. No es un password manager mas — esta disenado para pymes chilenas.

### 1. Cifrado AES en reposo

Las contraseñas no se guardan en texto plano. Se cifran con **AES (Advanced Encryption Standard)**, el mismo algoritmo que usan los bancos. La clave de cifrado no la tiene ni el servidor — la tiene el usuario.

**Si alguien accede a la base de datos, ve texto cifrado.** No puede leer las contraseñas sin la clave maestra del usuario.

### 2. Acceso biometrico

Iniciar sesion con contraseña es seguro pero lento. GestorPass ofrece **verificacion biometrica** (huella dactilar, Face ID) para acceder rapido sin sacrificar seguridad.

El flujo:

1. Abres GestorPass
2. Tocas el sensor de huella
3. Listo — tienes acceso a tus credenciales

**Sin recordar contraseñas. Sin escribirlas. Sin riesgo de que alguien las vea.**

### 3. Auditoria completa

Cada accion queda registrada:

- Quien accedio a que credencial
- Cuando (timestamp exacto)
- Desde donde (IP, dispositivo)
- Que accion realizo (ver, copiar, editar)

Si un empleado accede a credenciales que no le corresponden, lo sabes. Si alguien cambia una contraseña, lo sabes. **Trazabilidad total.**

## Resultados: seguridad sin friccion

| Metrica | Antes | Despues |
|---------|-------|---------|
| Cifrado | Texto plano (Excel) | AES (banco) |
| Acceso | Contraseña manual | Biometrico (1 toque) |
| Auditoria | Sin registro | Completa |
| Control de acceso | Todo o nada | Por credencial |

**La seguridad no tiene por que ser complicada.** GestorPass demuestra que se puede tener cifrado real, acceso biometrico y auditoria completa sin necesitar un equipo de TI.

## Stack tecnico

- **Frontend:** Astro + TypeScript
- **Backend:** Node.js
- **Cifrado:** AES-256-GCM
- **Biometria:** WebAuthn API (FIDO2)
- **Base de datos:** PostgreSQL con cifrado en reposo
- **Deploy:** Docker en VPS

## Que aprendimos

**Las pymes chilenas necesitan seguridad real, no seguridad teatrica.** Un Excel con contraseña no es seguridad. Un password manager generico no resuelve el problema de acceso compartido. GestorPass esta disenado para el uso real de una pyme.

**Lo biometrico reduce la friccion.** La gente no usa password managers porque son tediosos. Con biometria, la barrera de entrada es casi cero.

**La auditoria da tranquilidad.** No se trata de desconfiar del equipo — se trata de tener visibilidad. Si algo sale mal, sabes que paso y quien fue.

---

*Este es un caso de estudio interno de Mtsprz. GestorPass es parte de nuestro ecosistema de herramientas para pymes.*

*Quieres una solucion similar para tu negocio? [Conversemos](/contacto).*
