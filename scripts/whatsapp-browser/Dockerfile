# Mtsprz — WhatsApp Web Browser Sender
# =====================================
# Genérico: corre en CUALQUIER VPS con Docker (Debian/Ubuntu x86_64).
# No necesitas Chrome ni pantalla en el host: el container instala Chrome
# y Xvfb (display virtual) provee la "ventana" para WhatsApp Web.
#
# Uso:
#   docker build -t mtsprz-sender .
#   docker compose up -d
#
# Primer uso (escanear QR sin pantalla):
#   curl http://localhost:8899/qr.png -o qr.png   # abrir el PNG y escanear con el teléfono
#   curl http://localhost:8899/status             # -> {"session": true, "state": "ready"}
#
# La sesión persiste en el volumen sender_profile -> no vuelves a escanear.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Chrome stable + deps de display/audio/fonts + Xvfb (display virtual)
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget gnupg ca-certificates xvfb xauth fonts-liberation \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
        libxss1 libgtk-3-0 \
    && wget -q -O /tmp/chrome.deb \
        https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY sender.py ./
RUN pip install --no-cache-dir "undetected-chromedriver>=3.5.5" "setuptools>=75"

# Sesión de WhatsApp (profile/) y logs: montar como volúmenes
VOLUME ["/app/profile", "/app/logs"]

EXPOSE 8899

# xvfb-run crea el display virtual :99 y corre el sender sobre él.
# -a  -> display auto (99 si está libre)
# -s  -> resolución de la "pantalla" virtual
CMD ["sh", "-c", "xvfb-run -a -s '-screen 0 1280x1024x24' python sender.py"]
