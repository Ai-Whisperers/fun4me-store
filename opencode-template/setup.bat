@echo off
REM ===========================================
REM SCRIPT DE INSTALACION - OpenCode Template
REM ===========================================
REM Ejecuta este script para configurar OpenCode en tu proyecto

echo.
echo ============================================
echo   INSTALADOR OpenCode para FPUNA
echo ============================================
echo.

REM Verificar que estamos en un directorio de proyecto
if not exist "." (
    echo ERROR: No se puede acceder al directorio actual
    pause
    exit /b 1
)

REM Crear carpeta .opencode si no existe
if not exist ".opencode" (
    echo Creando carpeta .opencode...
    mkdir .opencode
    mkdir .opencode\skills
    mkdir .opencode\skills\fpuna-header
    mkdir .opencode\skills\generate-readme
    mkdir .opencode\skills\create-api
    mkdir .opencode\skills\debug-error
    mkdir .opencode\skills\explain-code
) else (
    echo Carpeta .opencode ya existe
)

echo.
echo ============================================
echo   INSTALACION COMPLETADA
echo ============================================
echo.
echo Proximos pasos:
echo.
echo 1. Copia los archivos de configuracion:
echo    - config.json
echo    - mcp-servers.json
echo    - hooks.yaml
echo    - rules.yaml
echo.
echo 2. Configura tus credenciales en mcp-servers.json
echo    (NUNCA subas credenciales a git!)
echo.
echo 3. Inicia OpenCode:
echo    opencode
echo.
echo 4. Usa los skills disponibles:
echo    /fpuna-header
echo    /generate-readme
echo    /create-api
echo    /debug
echo    /explain
echo.
echo ============================================
echo.

pause
