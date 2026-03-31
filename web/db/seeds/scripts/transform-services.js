#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Transform services data to match database schema
function transformServices(services) {
  return services.map((service) => {
    const transformed = { ...service }

    // Rename is_public to is_featured
    if (transformed.is_public !== undefined) {
      transformed.is_featured = transformed.is_public
      delete transformed.is_public
    }

    // Rename species to species_allowed
    if (transformed.species !== undefined) {
      if (transformed.species.includes('all') || transformed.species.length === 0) {
        transformed.species_allowed = null // NULL means all species
      } else {
        transformed.species_allowed = transformed.species
      }
      delete transformed.species
    }

    // Add required fields with defaults
    transformed.currency = transformed.currency || 'PYG'
    transformed.requires_appointment = transformed.requires_appointment !== false

    // Ensure available_days is properly formatted
    if (transformed.available_days) {
      transformed.available_days = transformed.available_days.map((d) => parseInt(d))
    }

    return transformed
  })
}

// Read and transform the file
const filePath = path.join(__dirname, 'data', '02-clinic', 'adris', 'services.json')

try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.services = transformServices(data.services)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log('✅ Services data transformed successfully')
} catch (error) {
  console.error('❌ Error transforming services data:', error.message)
  process.exit(1)
}
