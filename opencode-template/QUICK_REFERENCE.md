# Referencia Rapida - OpenCode FPUNA

## Comandos Principales

| Comando | Descripcion | Ejemplo |
|---------|-------------|---------|
| `/fpuna-header` | Genera encabezado academico | `/fpuna-header materia="BD" profesor="Juan" estudiante="Maria"` |
| `/generate-readme` | Crea README profesional | `/generate-readme nombre_proyecto="Mi App"` |
| `/create-api` | Genera API REST | `/create-api recurso="usuarios" framework="fastapi"` |
| `/debug` | Ayuda con errores | `/debug error_message="TypeError..."` |
| `/explain` | Explica codigo | `/explain codigo="..." nivel="basico"` |

## Estructura de Carpetas

```
tu-proyecto/
├── .opencode/              # Configuracion OpenCode
│   ├── config.json         # Agentes y settings
│   ├── mcp-servers.json    # Conexiones externas
│   ├── hooks.yaml          # Automatizaciones
│   ├── rules.yaml          # Reglas de codigo
│   └── skills/             # Skills personalizados
├── src/                    # Tu codigo fuente
└── README.md
```

## Archivos de Configuracion

### config.json
```json
{
  "agents": {
    "oracle": { "enabled": true },
    "explore": { "enabled": true },
    "code-reviewer": { "enabled": true }
  }
}
```

### mcp-servers.json
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

## Agentes Disponibles

| Agente | Uso |
|--------|-----|
| `oracle` | Consultas de arquitectura |
| `explore` | Buscar en tu codigo |
| `librarian` | Buscar documentacion |
| `code-reviewer` | Revisar codigo |
| `test-writer` | Generar tests |
| `debugger` | Ayuda debugging |

## Reglas de Codigo (rules.yaml)

### Severidades
- `error`: Bloquea, debe corregirse
- `warning`: Deberia corregirse
- `info`: Sugerencia

### Reglas Globales
- No hardcodear credenciales
- Evitar console.log en produccion

### Por Lenguaje
- **Python**: Type hints, docstrings, no bare except
- **JavaScript**: Usar const, evitar any, manejar async errors
- **SQL**: No SELECT *, usar queries parametrizadas

## Hooks (hooks.yaml)

### Hooks Disponibles
- `session-start`: Al iniciar
- `pre-edit`: Antes de editar
- `post-create`: Despues de crear archivo
- `pre-commit`: Antes de commit
- `reminder`: Recordatorios periodicos

## Crear tu propio Skill

1. Crea carpeta: `.opencode/skills/mi-skill/`
2. Crea archivo: `skill.yaml`

```yaml
name: mi-skill
description: "Mi skill personalizado"
triggers:
  - "/mi-skill"
  - "activar mi skill"
parameters:
  - name: param1
    type: string
    required: true
instructions: |
  Instrucciones para el agente...
```

## Buenas Practicas

1. **Credenciales**: Usa variables de entorno, nunca hardcodees
2. **Git**: Agrega `.opencode/mcp-servers.json` a `.gitignore`
3. **Skills**: Crea skills para tareas repetitivas
4. **Reglas**: Personaliza reglas para tu proyecto

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| OpenCode no inicia | Verifica que la carpeta se llame `.opencode` (con punto) |
| Agente no responde | Verifica `config.json` es JSON valido |
| MCP no conecta | Verifica credenciales en `mcp-servers.json` |
| Skill no aparece | Verifica estructura en `skills/mi-skill/skill.yaml` |

## Enlaces Utiles

- [Documentacion OpenCode](https://github.com/code-yeongyu/oh-my-opencode)
- [Anthropic MCP](https://github.com/anthropics/mcp)
- [Claude Code](https://claude.ai/code)

---

**FPUNA - Facultad Politecnica UNA**
