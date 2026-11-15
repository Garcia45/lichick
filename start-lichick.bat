@echo off
title LiChick by LUCUIH - Pre-Order Server
echo ===================================================
echo   LICHICK BY LUCUIH - AUTO SETUP ^& RUN SERVER
echo ===================================================

:: Paksa gunakan PHP 8.2 dari XAMPP yang sudah aktif ekstensi openssl, curl, dan sqlite
set "PATH=C:\xampp\php;%PATH%"
set "PHPRC=C:\xampp\php"

echo [1/4] Memeriksa dependensi Laravel (vendor)...
if not exist "vendor\laravel\framework" (
    C:\xampp\php\php.exe C:\ProgramData\ComposerSetup\bin\composer.phar install --no-interaction
)

echo [2/4] Generate Application Key...
C:\xampp\php\php.exe artisan key:generate --ansi

echo [3/4] Menjalankan Migrasi Database ^& Seeder Menu (Mac Gemoy ^& Fries Gemoy)...
C:\xampp\php\php.exe artisan migrate --seed --force

echo [4/4] Menjalankan Server Lokal LiChick di http://127.0.0.1:8000 ...
C:\xampp\php\php.exe artisan serve
