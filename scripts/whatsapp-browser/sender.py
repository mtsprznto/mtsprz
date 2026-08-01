"""Mtsprz — WhatsApp Web Browser Sender.

Controla web.whatsapp.com OFICIAL con un Chrome real (perfil persistente).
Reemplaza a Evolution/Baileys para los envíos: WhatsApp ve un navegador
humano, no un cliente no oficial -> los mensajes se entregan normal.

Expone un mini HTTP server local para que el server Astro envíe:

  GET  /ping        -> {"ok": true}
  GET  /status      -> {"session": bool, "state": "ready"|"waiting_qr"|"starting"}
  POST /send        -> {"number": "...", "text": "..."} -> {"ok": true, "status": "SENT"}

Primera vez: se abre Chrome -> escaneas el QR con el número del bot.
La sesión queda persistida en profile/ (no vuelves a escanear).

Uso:  uv run python sender.py      (Windows: run-sender.bat)
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Compat Python 3.12+: distutils fue removido del stdlib y undetected-chromedriver
# aún lo importa. setuptools trae el shim oficial; este es el backup por si no
# se activó el _distutils_hack.
try:
    from distutils.version import LooseVersion  # noqa: F401
except ImportError:
    import sys

    from setuptools import _distutils as _du

    sys.modules.setdefault("distutils", _du)
    sys.modules.setdefault("distutils.version", _du.version)

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

HOST = os.environ.get("SENDER_HOST", "127.0.0.1")
PORT = int(os.environ.get("SENDER_PORT", "8899"))
BASE_DIR = Path(__file__).resolve().parent
PROFILE_DIR = BASE_DIR / "profile"
LOG_DIR = BASE_DIR / "logs"
QR_FILE = LOG_DIR / "qr_latest.png"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "sender.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("wa-sender")
# urllib3 (usado por Selenium internamente para hablar con chromedriver) loguea
# warnings de pool lleno cuando el driver está ocupado — ruido benigno.
logging.getLogger("urllib3").setLevel(logging.ERROR)

# Selectores WhatsApp Web (data-testid — estables desde 2023)
SEL_SEARCH = '[data-testid="chat-list-search"]'
SEL_LIST = '[data-testid="chat-list"]'
SEL_COMPOSE = '[data-testid="conversation-compose-box-input"]'
SEL_QR = '[data-testid="qrcode"]'
SEL_CHAT_TITLE = '[data-testid="conversation-info-header-chat-title"]'
# Versiones 2026 de WWWeb usan testids conv-msg-* + clase tail-out, no msg-out.
# La confirmación se hace por texto renderizado (div.selectable-text), robusto a cambios.

# Señales de "sesión iniciada" — cualquiera presente = logueado
SESSION_SELECTORS = [
    '[data-testid="chat-list-search"]',
    '[data-testid="chat-list"]',
    '[data-testid="side-bar"]',
    '[data-testid="conversation-panel"]',
    '[data-testid="chat-panel"]',
]

# Alternativas para el input de búsqueda de chats
SEARCH_SELECTORS = [
    '[data-testid="chat-list-search"]',
    'div[data-testid="chat-list"] input[type="text"]',
    'div[data-testid="chat-list"] div[contenteditable="true"]',
]

# Alternativas para el input de redacción de mensaje
COMPOSE_SELECTORS = [
    '[data-testid="conversation-compose-box-input"]',
    'div[contenteditable="true"][role="textbox"][data-tab]',
    'div[contenteditable="true"][role="textbox"]',
    'footer div[contenteditable="true"]',
]


def any_present(driver: uc.Chrome, selectors: list[str], timeout: float = 5.0) -> bool:
    """True si CUALQUIERA de los selectores está presente en el DOM."""
    for sel in selectors:
        try:
            WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, sel))
            )
            return True
        except Exception:
            continue
    return False


def find_first(driver: uc.Chrome, selectors: list[str], timeout: float = 10.0):
    """Devuelve el primer elemento clickeable de la lista de selectores."""
    last_exc: Exception | None = None
    for sel in selectors:
        try:
            return WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, sel))
            )
        except Exception as exc:
            last_exc = exc
    raise last_exc or RuntimeError(f"Ningún selector disponible: {selectors}")


def human_delay(lo: float = 0.4, hi: float = 1.2) -> None:
    """Pausa humana aleatoria — parte del anti-detección."""
    time.sleep(random.uniform(lo, hi))


def detect_chrome_version() -> int | None:
    """Detecta la versión mayor de Chrome instalado. None = dejar auto a uc."""
    # 1. Registro de Windows
    try:
        import winreg

        candidates = (
            (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon", "version"),
            (
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Google\Chrome\Update\Clients\{8A69D345-D564-463c-AFF1-A69D9E530F96}",
                "pv",
            ),
        )
        for hive, key_path, value_name in candidates:
            try:
                with winreg.OpenKey(hive, key_path) as key:
                    version = winreg.QueryValueEx(key, value_name)[0]
                    return int(str(version).split(".")[0])
            except OSError:
                continue
    except Exception:
        pass
    # 2. Carpetas de instalación
    pf = os.environ.get("ProgramFiles", r"C:\Program Files")
    pfx = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
    local = os.environ.get("LOCALAPPDATA", "")
    for base in (
        Path(pf) / "Google" / "Chrome" / "Application",
        Path(pfx) / "Google" / "Chrome" / "Application",
        Path(local) / "Google" / "Chrome" / "Application" if local else None,
    ):
        if base is None:
            continue
        try:
            for entry in base.iterdir():
                if entry.name and entry.name[0].isdigit():
                    return int(entry.name.split(".")[0])
        except Exception:
            continue
    return None


class WhatsAppWebBot:
    """Chrome real + sesión persistente sobre web.whatsapp.com."""

    def __init__(self) -> None:
        self.driver: uc.Chrome | None = None
        self._lock = threading.Lock()  # el driver NO es thread-safe
        self.state = "starting"

    # ── lifecycle ──────────────────────────────────────────────

    def start(self) -> None:
        # Limpiar locks de Chrome de cierres abruptos (Docker stop/down/rebuild):
        # si quedó SingletonLock de un Chrome muerto, el nuevo no arranca.
        try:
            for lock in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
                (PROFILE_DIR / lock).unlink(missing_ok=True)
        except Exception:
            pass
        options = uc.ChromeOptions()
        # Perfil persistente: la sesión de WhatsApp Web sobrevive reinicios
        options.add_argument(f"--user-data-dir={str(PROFILE_DIR.resolve())}")
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-background-networking")
        if os.name == "posix":
            # Docker/VPS: /dev/shm es pequeño y corremos como root
            options.add_argument("--disable-dev-shm-usage")
            if hasattr(os, "geteuid") and os.geteuid() == 0:
                options.add_argument("--no-sandbox")
        # Sin headless: WhatsApp Web + anti-detección prefieren ventana real
        # (en VPS la "ventana" la provee Xvfb, display virtual)
        self.driver = uc.Chrome(options=options, version_main=detect_chrome_version())
        self.driver.get("https://web.whatsapp.com")
        self.state = "waiting_qr" if self._has_qr() else "ready"
        log.info("Estado inicial: %s", self.state)

    def _has_qr(self) -> bool:
        """True si hay un canvas grande visible (el QR de login de WWWeb).
        No depende de testids (cambian entre versiones)."""
        try:
            return bool(
                self.driver.execute_script(
                    "return [...document.querySelectorAll('canvas')]"
                    ".some(c => c.offsetParent !== null && c.width > 100)"
                )
            )
        except Exception:
            return False

    def _capture_qr(self) -> bool:
        """Extrae el QR NATIVO del canvas (toDataURL) y lo guarda en QR_FILE.

        El screenshot (viewport o elemento) degrada el QR: bordes UI, menor
        resolución, transiciones. toDataURL da el PNG exacto del canvas.
        """
        try:
            b64 = self.driver.execute_script(
                "const c = [...document.querySelectorAll('canvas')]"
                ".filter(x => x.offsetParent !== null && x.width > 100)"
                ".pop();"
                "if (!c) return null;"
                "return c.toDataURL('image/png').split(',')[1] || null;"
            )
            if b64:
                import base64

                QR_FILE.write_bytes(base64.b64decode(b64))
                return True
        except Exception:
            pass
        # Fallback: viewport completo (mejor que nada)
        try:
            if self.driver is not None:
                self.driver.save_screenshot(str(QR_FILE))
                return True
        except Exception:
            pass
        return False

    def _is_ready(self) -> bool:
        return any_present(self.driver, SESSION_SELECTORS, timeout=3)

    def wait_for_session(self, timeout: int = 60) -> bool:
        """Espera a que el usuario escanee el QR. Refresca cada ~30s para
        generar un QR fresco (los QR de WhatsApp Web expiran ~60s).
        Guarda el QR nativo en QR_FILE -> GET /qr.png del bridge."""
        deadline = time.time() + timeout
        last_refresh = 0.0
        while time.time() < deadline:
            if self._is_ready():
                self.state = "ready"
                return True
            # QR fresco del canvas (toDataURL, no screenshot)
            self._capture_qr()
            # QR fresco: recargar antes de que expire (~60s de vida)
            if time.time() - last_refresh > 30:
                try:
                    self.driver.get("https://web.whatsapp.com")
                    log.info("QR refrescado — espera 2s y descarga qr.png")
                    # el canvas del QR tarda 1-3s en pintarse tras la recarga
                    time.sleep(2)
                except Exception:
                    pass
                last_refresh = time.time()
            time.sleep(2)
        return False

    # ── sending ───────────────────────────────────────────────

    def _chat_title(self) -> str:
        """Texto del encabezado del chat abierto (número o nombre del contacto)."""
        try:
            el = self.driver.find_element(By.CSS_SELECTOR, SEL_CHAT_TITLE)
            return (el.text or "").strip()
        except Exception:
            return ""

    def _is_chat_open_for(self, number: str) -> bool:
        """True si el chat visible ya corresponde al número destino.

        El título del chat es el número (contacto no guardado) o un nombre.
        Solo confiamos cuando es numérico y matchea: si es nombre, navegamos
        para no mandar al chat equivocado (ej. otro lead abierto).
        """
        if not any_present(self.driver, COMPOSE_SELECTORS, timeout=1):
            return False
        title = self._chat_title()
        if not title:
            return False
        digits = re.sub(r"\D", "", title)
        return bool(digits) and digits == number

    def send_message(self, number: str, text: str) -> dict:
        """Envía texto a un número (formato 569XXXXXXXX). Devuelve ok + key."""
        number = number.strip().replace("+", "").replace(" ", "")
        if not number.isdigit():
            raise ValueError(f"Número inválido: {number!r}")
        with self._lock:
            if self.driver is None:
                raise RuntimeError("Browser no iniciado")
            if self.state != "ready":
                raise RuntimeError(f"Sesión no lista (state={self.state})")

            # 1. Reutilizar el chat abierto si ya es la conversación correcta.
            #    Evita la re-navegación lenta de /send?phone= al mismo número
            #    (WWWeb tarda 20-40s en restaurar el chat tras recargar la página).
            if self._is_chat_open_for(number):
                log.info("Chat ya abierto para %s — sin navegar", number)
                compose = find_first(self.driver, COMPOSE_SELECTORS, timeout=5)
            else:
                # 2. Abrir chat directo por URL — método oficial, evita el buscador
                self.driver.get(f"https://web.whatsapp.com/send?phone={number}")
                human_delay(0.8, 1.6)

                # 3. Esperar compose (chat abierto) — hasta ~45s; la primera
                #    navegación tras el arranque puede tardar (recarga de sesión)
                compose = None
                deadline = time.time() + 45
                while time.time() < deadline:
                    try:
                        compose = find_first(self.driver, COMPOSE_SELECTORS, timeout=3)
                        break
                    except Exception:
                        time.sleep(1)
                if compose is None:
                    raise RuntimeError(
                        f"No se abrió chat para {number} — ¿el número existe en WhatsApp?"
                    )

            # 4. Escribir y enviar (Enter)
            compose.click()
            human_delay()
            compose.send_keys(text)
            human_delay(0.3, 0.8)
            compose.send_keys(Keys.ENTER)
            human_delay(0.5, 1.0)

            # 5. Confirmación: nuestro texto renderizado en el chat (testids
            #    conv-msg-* / selectable-text de las versiones 2026)
            confirmed = False
            try:
                for _ in range(8):
                    confirmed = bool(
                        self.driver.execute_script(
                            "return [...document.querySelectorAll('[data-testid=selectable-text]')]"
                            ".some(el => (el.textContent || '').includes(t))",
                            text[:30],
                        )
                    )
                    if confirmed:
                        break
                    time.sleep(1)
            except Exception:
                pass
            if not confirmed:
                log.warning("Sin confirmación msg-out para %s (puede llegar con delay)", number)

            key = str(int(time.time() * 1000))
            log.info("Enviado a %s: %r", number, text[:60])
            return {"ok": True, "key": key, "number": number, "status": "SENT"}

    def status(self) -> dict:
        return {
            "session": self.state == "ready",
            "state": self.state,
            "host": HOST,
            "port": PORT,
        }

    def debug_info(self) -> dict:
        """Diagnóstico del DOM: título, URL y qué selectores existen."""
        info: dict = {"state": self.state, "title": "", "url": "", "selectors": {}}
        if self.driver is None:
            return info
        try:
            info["title"] = self.driver.title
            info["url"] = self.driver.current_url
        except Exception:
            pass
        groups = {
            "session": SESSION_SELECTORS,
            "search": SEARCH_SELECTORS,
            "compose": COMPOSE_SELECTORS,
            "list": [SEL_LIST],
            "qr": [SEL_QR],
        }
        for name, sels in groups.items():
            info["selectors"][name] = any_present(self.driver, sels, timeout=1)
        # Data-testids presentes en el DOM actual (vocabulario real de la versión)
        try:
            info["testids"] = self.driver.execute_script(
                "return [...new Set([...document.querySelectorAll('[data-testid]')]"
                ".map(el => el.getAttribute('data-testid')))]"
            )[:80]
        except Exception:
            info["testids"] = []
        # Inputs y contenteditable visibles (buscador, compose)
        try:
            info["inputs"] = self.driver.execute_script(
                "return [...document.querySelectorAll('input, [contenteditable=true]')]"
                ".filter(el => el.offsetParent !== null)"
                ".map(el => ({tag: el.tagName, ph: el.getAttribute('placeholder') || '', "
                "dph: el.getAttribute('data-placeholder') || '', tab: el.getAttribute('data-tab') || '', "
                "tid: el.getAttribute('data-testid') || '', role: el.getAttribute('role') || ''}))"
            )[:20]
        except Exception:
            info["inputs"] = []
        return info

    def stop(self) -> None:
        if self.driver is not None:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None
        self.state = "stopped"


# ── HTTP bridge ───────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    bot: WhatsAppWebBot

    def log_message(self, *args) -> None:  # silenciar log ruidoso de http.server
        pass

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path: Path, content_type: str) -> None:
        try:
            data = path.read_bytes()
        except FileNotFoundError:
            self._json(404, {"ok": False, "error": "archivo no existe (¿hay QR?)"})
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/status":
            self._json(200, self.bot.status())
        elif self.path == "/debug":
            self._json(200, self.bot.debug_info())
        elif self.path == "/qr.png":
            self._file(QR_FILE, "image/png")
        elif self.path == "/ping":
            self._json(200, {"ok": True})
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        if self.path == "/send":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
                number = payload.get("number", "")
                text = payload.get("text", "")
                if not number or not text:
                    self._json(400, {"ok": False, "error": "number y text requeridos"})
                    return
                result = self.bot.send_message(number, text)
                self._json(200, result)
            except Exception as exc:
                log.exception("Error en /send")
                self._json(500, {"ok": False, "error": str(exc), "debug": self.bot.debug_info()})
        else:
            self._json(404, {"ok": False, "error": "not found"})


def main() -> None:
    bot = WhatsAppWebBot()
    Handler.bot = bot

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    log.info("HTTP bridge en http://%s:%s", HOST, PORT)

    def run_bot() -> None:
        bot.start()
        if bot.state == "waiting_qr":
            log.info("Escanea el QR en la ventana de Chrome (sesión persistente). Esperando...")
            if bot.wait_for_session(timeout=300):
                log.info("Sesión lista ✔")
            else:
                log.warning("Sin sesión tras 5 min — el QR seguirá visible en Chrome.")
        # Vigilancia de sesión: si se cae (logout remoto), lo reflejamos
        while True:
            try:
                if bot.driver is None:
                    break
                if bot.state == "ready":
                    if not bot._is_ready():
                        bot.state = "waiting_qr"
                elif bot.state == "waiting_qr":
                    if bot.wait_for_session(timeout=15):
                        log.info("Sesión recuperada ✔")
            except Exception:
                pass
            time.sleep(10)

    threading.Thread(target=run_bot, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Deteniendo...")
    finally:
        bot.stop()
        server.server_close()


if __name__ == "__main__":
    main()
