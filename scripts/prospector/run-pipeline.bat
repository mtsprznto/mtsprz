@echo off
REM Pipeline completo de prospección — Windows (.bat)
REM Ejecuta scrape → enrich → validate → dedup → stats → export
REM
REM Uso:
REM   run-pipeline                  # todo por defecto
REM   run-pipeline --rubro abogado  # solo un rubro
REM   run-pipeline --skip-scrape    # desde enrich en adelante
REM   run-pipeline --export-only    # solo stats + csv
REM   run-pipeline --full           # scrape masivo chilerut + gmaps

cd /d "%~dp0"
echo ══════════════════════════════════════════════════════
echo  PROSPECTOR Pipeline — Región de Los Lagos
echo ══════════════════════════════════════════════════════

uv run python run_pipeline.py %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ✗ Pipeline falló (código %ERRORLEVEL%)
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo  ✓ Pipeline completado.
echo.
pause
