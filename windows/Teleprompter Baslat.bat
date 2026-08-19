@echo off
REM Teleprompter Pro - yerel sunucuyu baslatir, telefon uzaktan kumandayi acar.
REM Bu dosya DEPODA durur; masaustundeki kopya ondan uretilir. Once yalniz
REM masaustunde vardi ve 19 Agustos 2026'da disk temizliginde kayboldu -
REM depoda olmayan dosya, yedegi olmayan dosyadir.
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Python bulunamadi.
  echo Kur: https://www.python.org/downloads/
  echo Kurulum ekraninda "Add Python to PATH" kutusunu isaretle.
  pause
  exit /b 1
)

REM QR kodu icin 'qrcode' varsa sessizce kurulur (internet gerektirir)
python -m pip install --quiet "qrcode[pil]" >nul 2>&1

REM Gosterim ekranini birazdan ac
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:8080/"

python "teleprompter_server.py"
pause
