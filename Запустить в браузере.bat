@echo off
chcp 65001 >nul
echo ============================================
echo DenzoCRM - Запуск в браузере
echo ============================================
echo.
echo Установка зависимостей...
call npm install
echo.
echo Запуск сервера разработки...
echo.
echo Приложение будет доступно по адресу:
echo http://localhost:3000
echo.
echo Нажмите Ctrl+C для остановки
echo ============================================
echo.
npm run dev
pause
