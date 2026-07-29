@echo off
title Servidor Local PWA MES
echo ===================================================
echo   Servidor Web Local para la PWA de Alertas MES
echo ===================================================
echo.
echo Para evitar bloqueos de seguridad del navegador (Mixed Content),
echo accede a la aplicacion usando HTTP (no HTTPS) cuando conectes
echo a un backend local.
echo.
echo Intentando iniciar servidor con Python en el puerto 5000...
python -m http.server 5000
if %errorlevel% neq 0 (
    echo.
    echo Python no esta disponible. Intentando con Node.js (npx serve) en el puerto 5000...
    npx -y serve -l 5000
)
pause
