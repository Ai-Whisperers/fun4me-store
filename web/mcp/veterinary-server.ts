#!/usr/bin/env node

/**
 * Vete Veterinary Tools MCP Server
 * 
 * Spanish-first tools for veterinary clinic workflows.
 * Provides domain-specific operations for pets, appointments, vaccines, and clinical tasks.
 * 
 * Tools:
 * - obtener_historial_medico: Get complete medical history for a pet
 * - crear_cita: Create appointment with conflict detection
 * - resumen_citas_veterinario: Daily appointment summary for vet
 * - revisar_vacunas_pendientes: Check pending/overdue vaccines
 * - buscar_mascotas: Search pets by name, species, or owner
 * 
 * Resources:
 * - mcp://veterinary/vets/{tenant_id}: List available vets
 * - mcp://veterinary/species: Supported species list
 * 
 * Prompts:
 * - resumen_clinico: Generate clinical summary in Spanish
 * 
 * Usage:
 *   node dist/veterinary-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Input schemas
const ObtenerHistorialSchema = z.object({
  pet_id: z.string().describe('ID de la mascota'),
  tenant_id: z.string().describe('ID del tenant (clínica)'),
});

const CrearCitaSchema = z.object({
  pet_id: z.string(),
  vet_id: z.string(),
  tenant_id: z.string(),
  fecha: z.string().describe('Fecha y hora ISO 8601'),
  motivo: z.string().describe('Motivo de la consulta'),
  duracion_minutos: z.number().default(30),
});

const ResumenCitasSchema = z.object({
  vet_id: z.string(),
  tenant_id: z.string(),
  fecha: z.string().describe('Fecha YYYY-MM-DD'),
});

const RevisarVacunasSchema = z.object({
  tenant_id: z.string(),
  dias_adelanto: z.number().default(30).describe('Días de anticipación'),
});

const BuscarMascotasSchema = z.object({
  tenant_id: z.string(),
  query: z.string().describe('Término de búsqueda (nombre, especie, o dueño)'),
  limit: z.number().default(20),
});

// Initialize server
const server = new Server({
  name: 'veterinary-tools',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'obtener_historial_medico',
        description: 'Obtener historial médico completo de una mascota (vacunas, consultas, recetas)',
        inputSchema: {
          type: 'object',
          properties: {
            pet_id: { type: 'string', description: 'ID de la mascota' },
            tenant_id: { type: 'string', description: 'ID del tenant (ej: "terrapet")' },
          },
          required: ['pet_id', 'tenant_id'],
        },
      },
      {
        name: 'crear_cita',
        description: 'Crear nueva cita veterinaria con detección de conflictos de horario',
        inputSchema: {
          type: 'object',
          properties: {
            pet_id: { type: 'string' },
            vet_id: { type: 'string' },
            tenant_id: { type: 'string' },
            fecha: { type: 'string', description: 'ISO 8601 (ej: 2026-01-20T10:00:00)' },
            motivo: { type: 'string', description: 'Motivo de la consulta' },
            duracion_minutos: { type: 'number', default: 30 },
          },
          required: ['pet_id', 'vet_id', 'tenant_id', 'fecha', 'motivo'],
        },
      },
      {
        name: 'resumen_citas_veterinario',
        description: 'Generar resumen de citas del día para un veterinario',
        inputSchema: {
          type: 'object',
          properties: {
            vet_id: { type: 'string' },
            tenant_id: { type: 'string' },
            fecha: { type: 'string', description: 'YYYY-MM-DD' },
          },
          required: ['vet_id', 'tenant_id', 'fecha'],
        },
      },
      {
        name: 'revisar_vacunas_pendientes',
        description: 'Revisar vacunas pendientes o próximas a vencer',
        inputSchema: {
          type: 'object',
          properties: {
            tenant_id: { type: 'string' },
            dias_adelanto: { type: 'number', default: 30, description: 'Días de anticipación' },
          },
          required: ['tenant_id'],
        },
      },
      {
        name: 'buscar_mascotas',
        description: 'Buscar mascotas por nombre, especie, o nombre de dueño',
        inputSchema: {
          type: 'object',
          properties: {
            tenant_id: { type: 'string' },
            query: { type: 'string', description: 'Término de búsqueda' },
            limit: { type: 'number', default: 20 },
          },
          required: ['tenant_id', 'query'],
        },
      },
    ],
  };
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'mcp://veterinary/vets/{tenant_id}',
        mimeType: 'application/json',
        name: 'Veterinarios disponibles',
        description: 'Lista de veterinarios activos en la clínica',
      },
      {
        uri: 'mcp://veterinary/species',
        mimeType: 'application/json',
        name: 'Especies soportadas',
        description: 'Lista de especies de mascotas soportadas',
      },
    ],
  };
});

// List prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'resumen_clinico',
        description: 'Generar resumen clínico profesional en español',
        arguments: [
          {
            name: 'nombre_mascota',
            description: 'Nombre de la mascota',
            required: true,
          },
          {
            name: 'sintomas',
            description: 'Síntomas observados',
            required: true,
          },
          {
            name: 'diagnostico',
            description: 'Diagnóstico preliminar o confirmado',
            required: false,
          },
        ],
      },
    ],
  };
});

// Get prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'resumen_clinico') {
    const nombre_mascota = args?.nombre_mascota || 'Mascota';
    const sintomas = args?.sintomas || '';
    const diagnostico = args?.diagnostico || '';

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Genera un resumen clínico profesional en español para:

Mascota: ${nombre_mascota}
Síntomas: ${sintomas}
${diagnostico ? `Diagnóstico: ${diagnostico}` : ''}

Incluye:
1. Resumen de consulta
2. Observaciones clínicas
3. Recomendaciones de tratamiento
4. Indicaciones para el dueño

Formato: Profesional pero comprensible para el dueño de la mascota.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri.startsWith('mcp://veterinary/vets/')) {
    const tenantId = uri.split('/').pop();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('role', 'vet')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Error fetching vets: ${error.message}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data || [], null, 2),
        },
      ],
    };
  }

  if (uri === 'mcp://veterinary/species') {
    const species = [
      { value: 'dog', label: 'Perro', icon: '🐕' },
      { value: 'cat', label: 'Gato', icon: '🐈' },
      { value: 'bird', label: 'Ave', icon: '🦜' },
      { value: 'rabbit', label: 'Conejo', icon: '🐰' },
      { value: 'rodent', label: 'Roedor', icon: '🐹' },
      { value: 'reptile', label: 'Reptil', icon: '🦎' },
      { value: 'other', label: 'Otro', icon: '🐾' },
    ];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(species, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'obtener_historial_medico') {
      const { pet_id, tenant_id } = ObtenerHistorialSchema.parse(args);

      const { data: pet, error } = await supabase
        .from('pets')
        .select(`
          *,
          medical_records (
            *,
            vaccines (*),
            prescriptions (*)
          ),
          profiles!pets_owner_id_fkey (name, phone, email)
        `)
        .eq('id', pet_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                mensaje: `Error al obtener historial: ${error.message}`,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              exito: true,
              mascota: pet?.name,
              especie: pet?.species,
              dueño: pet?.profiles?.name,
              telefono: pet?.profiles?.phone,
              historial: pet?.medical_records || [],
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'crear_cita') {
      const { pet_id, vet_id, tenant_id, fecha, motivo, duracion_minutos } = CrearCitaSchema.parse(args);

      // Check for conflicts
      const endTime = new Date(new Date(fecha).getTime() + duracion_minutos * 60000).toISOString();

      const { data: conflicts } = await supabase
        .from('appointments')
        .select('*')
        .eq('vet_id', vet_id)
        .eq('tenant_id', tenant_id)
        .gte('scheduled_at', fecha)
        .lt('scheduled_at', endTime);

      if (conflicts && conflicts.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                mensaje: '⚠️ Conflicto de horario: veterinario no disponible',
                citas_existentes: conflicts,
              }, null, 2),
            },
          ],
        };
      }

      // Create appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          pet_id,
          vet_id,
          tenant_id,
          scheduled_at: fecha,
          reason: motivo,
          duration_minutes: duracion_minutos,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                mensaje: `Error al crear cita: ${error.message}`,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              exito: true,
              mensaje: `✅ Cita creada exitosamente para ${fecha}`,
              cita: data,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'resumen_citas_veterinario') {
      const { vet_id, tenant_id, fecha } = ResumenCitasSchema.parse(args);

      const { data: citas } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (name, species),
          profiles!appointments_owner_id_fkey (name, phone)
        `)
        .eq('vet_id', vet_id)
        .eq('tenant_id', tenant_id)
        .gte('scheduled_at', `${fecha}T00:00:00`)
        .lte('scheduled_at', `${fecha}T23:59:59`)
        .order('scheduled_at');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              exito: true,
              fecha,
              total_citas: citas?.length || 0,
              citas: citas?.map(c => ({
                hora: new Date(c.scheduled_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
                mascota: c.pets?.name,
                dueño: c.profiles?.name,
                telefono: c.profiles?.phone,
                motivo: c.reason,
                estado: c.status,
              })) || [],
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'revisar_vacunas_pendientes') {
      const { tenant_id, dias_adelanto } = RevisarVacunasSchema.parse(args);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + dias_adelanto);

      const { data: vaccines } = await supabase
        .from('vaccines')
        .select(`
          *,
          pets (name, species),
          profiles!pets_owner_id_fkey (name, phone)
        `)
        .eq('tenant_id', tenant_id)
        .lte('next_due', futureDate.toISOString())
        .order('next_due');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              exito: true,
              vacunas_pendientes: vaccines?.length || 0,
              alertas: vaccines?.map(v => ({
                mascota: v.pets?.name,
                dueño: v.profiles?.name,
                telefono: v.profiles?.phone,
                vacuna: v.vaccine_type,
                vencimiento: v.next_due,
                dias_restantes: Math.ceil((new Date(v.next_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              })) || [],
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'buscar_mascotas') {
      const { tenant_id, query, limit } = BuscarMascotasSchema.parse(args);

      const { data: pets } = await supabase
        .from('pets')
        .select(`
          *,
          profiles!pets_owner_id_fkey (name, phone)
        `)
        .eq('tenant_id', tenant_id)
        .or(`name.ilike.%${query}%,species.ilike.%${query}%`)
        .limit(limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              exito: true,
              resultados: pets?.length || 0,
              mascotas: pets?.map(p => ({
                id: p.id,
                nombre: p.name,
                especie: p.species,
                raza: p.breed,
                dueño: p.profiles?.name,
                telefono: p.profiles?.phone,
              })) || [],
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            mensaje: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vete Veterinary Tools MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
