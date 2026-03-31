# OpenCode Template para Estudiantes FPUNA

> Configuracion lista para usar con OpenCode/Claude Code

## Instalacion Rapida

### 1. Copia esta carpeta a tu proyecto

```bash
# Opcion A: Copiar manualmente
# Copia la carpeta "opencode-template" a tu proyecto como ".opencode"

# Opcion B: Con comando
cp -r opencode-template/ tu-proyecto/.opencode/
```

### 2. Renombra la carpeta

```
tu-proyecto/
├── .opencode/          <-- Debe llamarse ".opencode" (con punto)
│   ├── config.json
│   ├── mcp-servers.json
│   ├── hooks.yaml
│   ├── rules.yaml
│   └── skills/
├── src/
├── README.md
└── ...
```

### 3. Inicia OpenCode

```bash
cd tu-proyecto
opencode
```

## Estructura de Archivos

```
.opencode/
├── config.json           # Configuracion principal de agentes
├── mcp-servers.json      # Conexiones a servicios externos (DB, APIs)
├── hooks.yaml            # Automatizaciones (pre-commit, etc.)
├── rules.yaml            # Reglas de codigo por lenguaje
└── skills/               # Skills personalizados
    ├── fpuna-header/     # Genera encabezados academicos
    ├── generate-readme/  # Genera README profesional
    ├── create-api/       # Crea API REST basica
    ├── debug-error/      # Ayuda a debuggear errores
    └── explain-code/     # Explica codigo de forma didactica
```

## Archivos Principales

### `config.json`
Configura los agentes de IA disponibles:
- **oracle**: Consultas de arquitectura
- **explore**: Busqueda en el codebase
- **librarian**: Busqueda de documentacion
- **code-reviewer**: Revision de codigo
- **test-writer**: Generacion de tests
- **debugger**: Ayuda con debugging

### `mcp-servers.json`
Conexiones a servicios externos:
- Bases de datos (Supabase, PostgreSQL)
- APIs (GitHub, etc.)
- Herramientas de desarrollo

> **IMPORTANTE**: Nunca subas este archivo con credenciales reales a git!

### `hooks.yaml`
Automatizaciones que se ejecutan en momentos especificos:
- `session-start`: Al iniciar sesion
- `pre-edit`: Antes de editar archivos
- `pre-commit`: Antes de hacer commit

### `rules.yaml`
Reglas de codigo organizadas por lenguaje:
- Python
- JavaScript/TypeScript
- SQL
- Documentacion

## Skills Incluidos

### `/fpuna-header`
Genera encabezados estandar para trabajos academicos.

```
/fpuna-header materia="Base de Datos" profesor="Juan Perez" estudiante="Maria Garcia"
```

### `/generate-readme`
Genera un README.md profesional.

```
/generate-readme nombre_proyecto="Mi API" descripcion="API REST para gestion de usuarios"
```

### `/create-api`
Crea estructura basica de API REST.

```
/create-api recurso="productos" framework="fastapi"
```

### `/debug`
Ayuda a debuggear errores de forma sistematica.

```
/debug error_message="TypeError: 'NoneType' object is not subscriptable"
```

### `/explain`
Explica codigo de forma didactica.

```
/explain codigo="..." nivel="basico"
```

## Personalizacion

### Agregar tu propio skill

1. Crea una carpeta en `skills/`:
```
skills/mi-skill/
└── skill.yaml
```

2. Define el skill:
```yaml
name: mi-skill
description: "Descripcion de mi skill"
triggers:
  - "/mi-skill"
  - "activar mi skill"
parameters:
  - name: parametro1
    type: string
    required: true
instructions: |
  Instrucciones para el agente...
```

### Agregar reglas personalizadas

Edita `rules.yaml` y agrega en `custom_rules`:

```yaml
custom_rules:
  mi-regla:
    file_patterns: ["src/**/*.py"]
    patterns: ["print\\("]
    message: "Usa logging en lugar de print"
    severity: warning
```

### Configurar MCP Servers

Edita `mcp-servers.json` y descomenta/agrega servers:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "tu-url",
        "SUPABASE_KEY": "tu-key"
      }
    }
  }
}
```

## Comandos Utiles

| Comando | Descripcion |
|---------|-------------|
| `/help` | Muestra ayuda |
| `/fpuna-header` | Genera encabezado FPUNA |
| `/generate-readme` | Genera README |
| `/create-api` | Crea API REST |
| `/debug` | Ayuda con errores |
| `/explain` | Explica codigo |

## Buenas Practicas

1. **No subas credenciales**: Usa variables de entorno
2. **Personaliza las reglas**: Adaptalas a tu proyecto
3. **Crea tus propios skills**: Para tareas repetitivas
4. **Usa los hooks**: Automatiza validaciones

## Soporte

Si tienes problemas:
1. Verifica que la carpeta se llame `.opencode` (con punto)
2. Revisa que `config.json` sea JSON valido
3. Reinicia opencode despues de cambios

---

Creado para estudiantes de la Facultad Politecnica - UNA
