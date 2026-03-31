# Cuestionario de Onboarding para Clínicas

Este cuestionario recopila toda la información necesaria para crear el sitio web de su clínica veterinaria en la plataforma Vetic.

## Instrucciones

1. Complete todos los formularios marcados como **[REQUERIDO]**
2. Los formularios marcados como **[OPCIONAL]** pueden completarse después del lanzamiento
3. Envíe las imágenes por separado según la lista de verificación
4. Las respuestas en español serán utilizadas directamente en el sitio web

## Contenido del Cuestionario

| #   | Archivo                      | Descripción                                     | Estado          |
| --- | ---------------------------- | ----------------------------------------------- | --------------- |
| 0   | `00-links-existentes.md`     | **Instagram, Google Maps, Facebook, sitio web** | **[REQUERIDO]** |
| 1   | `01-informacion-basica.md`   | Datos de la clínica, contacto, horarios         | **[REQUERIDO]** |
| 2   | `02-marca-tema.md`           | Colores de marca, preferencias visuales         | **[REQUERIDO]** |
| 3   | `03-pagina-principal.md`     | Contenido de la página de inicio                | **[REQUERIDO]** |
| 4   | `04-servicios-precios.md`    | Catálogo de servicios y precios                 | **[REQUERIDO]** |
| 5   | `05-sobre-nosotros.md`       | Historia, misión, equipo                        | **[REQUERIDO]** |
| 6   | `06-testimonios.md`          | Reseñas de clientes                             | [OPCIONAL]      |
| 7   | `07-preguntas-frecuentes.md` | FAQ para clientes                               | [OPCIONAL]      |
| 8   | `08-legal.md`                | Políticas de privacidad y términos              | [OPCIONAL]      |
| 9   | `09-imagenes-checklist.md`   | Lista de imágenes requeridas                    | **[REQUERIDO]** |
| 10  | `10-metricas-showcase.md`    | Métricas para caso de estudio                   | [OPCIONAL]      |

## Tiempo Estimado

- **Con redes sociales activas**: 20-30 minutos (completar formulario 0, nosotros extraemos el resto)
- **Mínimo requerido**: 45-60 minutos (formularios 0-5 y 9)
- **Completo**: 90-120 minutos (todos los formularios)

> **💡 Tip:** Si tiene Instagram activo con fotos de su clínica, el proceso es mucho más rápido. Podemos extraer imágenes, información y hasta testimonios de sus redes existentes.

## Formato de Entrega

### Opción A: Google Forms (Próximamente)

Link: [Por definir]

### Opción B: Documentos

1. Descargue los archivos `.md`
2. Complete las secciones marcadas con `[RESPUESTA]`
3. Envíe por email a: onboarding@Vetic.com

### Opción C: Reunión Guiada

Agende una videollamada de 1 hora donde completaremos el cuestionario juntos.

## Soporte

- **WhatsApp**: +595 981 XXX XXX
- **Email**: soporte@Vetic.com
- **Horario**: Lunes a Viernes, 8:00 - 18:00

---

## Notas para el Equipo Vetic

Después de recibir las respuestas:

1. Crear carpeta en `.content_data/{slug}/`
2. Copiar template desde `_TEMPLATE/`
3. Completar JSONs con respuestas
4. Procesar y optimizar imágenes
5. Ejecutar `node scripts/seed-all-clinics.js`
6. Verificar en localhost antes de deploy
