@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Gabarito+

echo ==============================================
echo   GABARITO+
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado.
  echo Instale a versao LTS do Node.js e tente novamente.
  echo.
  pause
  exit /b 1
)

node launcher-gabarito-mais.mjs
set "CODIGO=%ERRORLEVEL%"
if not "%CODIGO%"=="0" (
  echo.
  echo O servidor encerrou com erro. Codigo: %CODIGO%
  echo Execute DIAGNOSTICO_GABARITO_MAIS.bat para ver mais detalhes.
  echo.
  pause
)
