@echo off
REM DailyTracker Backend API 打包脚本
REM 将发布文件压缩为 zip 包

echo ======================================
echo  DailyTracker Backend API - 打包工具
echo ======================================
echo.

set SOURCE_DIR=d:\18健康记录daily-tracker\backend\publish
set OUTPUT_DIR=d:\18健康记录daily-tracker\backend
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set PACKAGE_NAME=DailyTracker.Backend.%TIMESTAMP%.zip

echo 源目录: %SOURCE_DIR%
echo 输出目录: %OUTPUT_DIR%
echo 包名: %PACKAGE_NAME%
echo.

REM 检查源目录是否存在
if not exist "%SOURCE_DIR%" (
    echo [错误] 源目录不存在: %SOURCE_DIR%
    pause
    exit /b 1
)

echo 正在压缩文件...
echo.

REM 使用 PowerShell 压缩
powershell -Command "Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%PACKAGE_NAME%' -Force"

if %errorlevel% equ 0 (
    echo.
    echo ======================================
    echo [成功] 打包完成！
    echo ======================================
    echo.
    echo 包文件: %OUTPUT_DIR%\%PACKAGE_NAME%

    REM 获取文件大小
    for %%F in ("%OUTPUT_DIR%\%PACKAGE_NAME%") do (
        set SIZE=%%~zF
        set /a SIZE_MB=!SIZE!/1048576
    )
    echo 大小: !SIZE_MB! MB
    echo.

    echo 接下来可以:
    echo 1. 将压缩包上传到服务器
    echo 2. 在服务器上解压并部署
    echo 3. 或者分享给其他人部署
    echo.
) else (
    echo.
    echo [失败] 打包失败，请检查错误信息
    echo.
)

pause
