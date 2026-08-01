@echo off
REM Mtsprz — WAHA WhatsApp HTTP API (Windows con Docker Desktop)
REM Uso: doble clic o desde PowerShell:  .\start-waha.bat
cd /d %~dp0

if not exist .env (
  echo [ERROR] Falta .env — copia .env.example y edita WAHA_API_KEY:
  echo   copy .env.example .env
  exit /b 1
)

docker compose up -d

echo.
echo WAHA levantado:
echo   Dashboard: http://localhost:3000/dashboard
echo   Swagger:   http://localhost:3000/swagger
echo   Enviar:    POST http://localhost:3000/api/sendText  (header X-Api-Key)
echo.
docker compose ps
pause
