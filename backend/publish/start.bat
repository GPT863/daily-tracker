@echo off
REM DailyTracker Backend API 启动脚本
REM 用于在 Windows 上快速启动服务

echo ======================================
echo  DailyTracker Backend API
echo ======================================
echo.

REM 检查 .NET 运行时
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 .NET 运行时
    echo.
    echo 请先安装 ASP.NET Core 8.0 运行时:
    echo https://dotnet.microsoft.com/download/dotnet/8.0
    echo.
    pause
    exit /b 1
)

echo [信息] .NET 运行时已安装
dotnet --version
echo.

REM 设置环境变量
set ASPNETCORE_ENVIRONMENT=Production
set ASPNETCORE_URLS=http://0.0.0.0:8080

echo ======================================
echo  启动配置
echo ======================================
echo  环境: %ASPNETCORE_ENVIRONMENT%
echo  监听地址: %ASPNETCORE_URLS%
echo  数据库: Tencent Cloud MySQL
echo.
echo ======================================
echo  服务启动中...
echo ======================================
echo.

REM 启动应用
DailyTracker.Api.exe

pause
