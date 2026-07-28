@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE="
where node >nul 2>nul && set "NODE_EXE=node"
if not defined NODE_EXE if exist "C:\Users\apple\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=C:\Users\apple\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE_EXE (
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 20 oder neuer installieren und danach STARTEN.cmd erneut ausfuehren.
  pause
  exit /b 1
)
"%NODE_EXE%" scripts\serve.js
if errorlevel 1 pause
