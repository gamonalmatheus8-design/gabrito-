@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Diagnostico Gabarito+

echo ==============================================
echo   DIAGNOSTICO GABARITO+
echo ==============================================
echo.
where node
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)
echo.
echo Versao do Node:
node --version
echo.
echo Testando sintaxe do servidor...
node --check server.mjs
if errorlevel 1 (
  echo [ERRO] server.mjs possui erro de sintaxe.
  pause
  exit /b 1
)
echo [OK] Sintaxe valida.
echo.
echo Tentando iniciar sem abrir o navegador...
echo Se aparecer "Gabarito+ Supabase", o servidor esta funcionando.
echo Pressione Ctrl+C para encerrar.
echo.
set "PORT=3090"
node server.mjs
pause
