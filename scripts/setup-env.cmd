@echo off
setlocal
node "%~dp0setup-env.mjs" %*
exit /b %errorlevel%
