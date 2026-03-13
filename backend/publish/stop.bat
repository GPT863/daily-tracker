@echo off
REM DailyTracker Backend API 停止脚本

echo ======================================
echo  DailyTracker Backend API - 停止服务
echo ======================================
echo.

echo 正在查找 DailyTracker.Api 进程...
echo.

tasklist /FI "IMAGENAME eq DailyTracker.Api.exe" 2>NUL | find /I /N "DailyTracker.Api.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo 发现运行中的进程，正在终止...
    taskkill /F /IM DailyTracker.Api.exe
    echo.
    echo [成功] 服务已停止
) else (
    echo [提示] 未发现运行中的服务
)

echo.
pause
