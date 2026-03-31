#!/bin/bash
# ===========================================
# SCRIPT DE INSTALACION - OpenCode Template
# ===========================================
# Ejecuta: chmod +x setup.sh && ./setup.sh

echo ""
echo "============================================"
echo "  INSTALADOR OpenCode para FPUNA"
echo "============================================"
echo ""

# Crear estructura de carpetas
echo "Creando estructura de carpetas..."

mkdir -p .opencode/skills/fpuna-header
mkdir -p .opencode/skills/generate-readme
mkdir -p .opencode/skills/create-api
mkdir -p .opencode/skills/debug-error
mkdir -p .opencode/skills/explain-code

echo "Estructura creada!"
echo ""

# Verificar si los archivos de configuracion existen
if [ -f ".opencode/config.json" ]; then
    echo "config.json ya existe"
else
    echo "NOTA: Copia config.json a .opencode/"
fi

echo ""
echo "============================================"
echo "  INSTALACION COMPLETADA"
echo "============================================"
echo ""
echo "Proximos pasos:"
echo ""
echo "1. Copia los archivos de configuracion a .opencode/:"
echo "   - config.json"
echo "   - mcp-servers.json"
echo "   - hooks.yaml"
echo "   - rules.yaml"
echo ""
echo "2. Copia las carpetas de skills a .opencode/skills/"
echo ""
echo "3. Configura tus credenciales en mcp-servers.json"
echo "   (NUNCA subas credenciales a git!)"
echo ""
echo "4. Inicia OpenCode:"
echo "   opencode"
echo ""
echo "5. Usa los skills disponibles:"
echo "   /fpuna-header"
echo "   /generate-readme"
echo "   /create-api"
echo "   /debug"
echo "   /explain"
echo ""
echo "============================================"
echo ""
