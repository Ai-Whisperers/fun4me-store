/**
 * TerraPet Configuration Validation Tests
 * Phase 1: Critical - Configuration Integrity
 * 
 * These tests validate that all TerraPet configuration files are:
 * - Present and valid JSON
 * - Contain accurate client data
 * - Follow expected structure
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

const TERRAPET_DIR = path.join(process.cwd(), '.content_data', 'terrapet')

describe('TerraPet Configuration Files', () => {
  
  it('should have all required configuration files', async () => {
    const requiredFiles = [
      'config.json',
      'theme.json',
      'home.json',
      'services.json',
      'about.json',
      'images.json',
      'faq.json',
      'showcase.json',
      'legal.json',
      'testimonials.json'
    ]
    
    for (const file of requiredFiles) {
      const filePath = path.join(TERRAPET_DIR, file)
      const exists = await fs.access(filePath).then(() => true).catch(() => false)
      expect(exists, `${file} should exist`).toBe(true)
    }
  })
  
  it('should have valid JSON in all config files', async () => {
    const files = await fs.readdir(TERRAPET_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(TERRAPET_DIR, file), 'utf-8')
      expect(() => JSON.parse(content), `${file} should be valid JSON`).not.toThrow()
    }
  })
})

describe('TerraPet Business Information (config.json)', () => {
  let config: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'config.json'), 'utf-8')
    config = JSON.parse(content)
  })
  
  it('should have correct clinic ID and name', () => {
    expect(config.id).toBe('terrapet')
    expect(config.name).toBe('TerraPet')
  })
  
  it('should have correct slogan', () => {
    expect(config.slogan).toBe('El mejor cuidado para tu peludo')
  })
  
  it('should have correct contact information', () => {
    expect(config.contact.whatsapp_number).toBe('5950992152465')
    expect(config.contact.phone_display).toBe('+595 992 152 465')
    expect(config.contact.email).toBe('terrapetanimal@gmail.com')
    expect(config.contact.google_maps_url).toBe('https://maps.app.goo.gl/mdMfXwBpAQdYjGP88')
  })
  
  it('should have correct operating hours (9-6, 7 days)', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    days.forEach(day => {
      expect(config.hours[day].open).toBe('09:00')
      expect(config.hours[day].close).toBe('18:00')
    })
  })
  
  it('should have emergency_24h set to false', () => {
    expect(config.settings.emergency_24h).toBe(false)
  })
  
  it('should have online_store and qr_tags enabled', () => {
    expect(config.settings.modules.online_store).toBe(true)
    expect(config.settings.modules.qr_tags).toBe(true)
  })
  
  it('should have logo URL configured', () => {
    expect(config.branding.logo_url).toContain('drive.google.com')
    expect(config.branding.logo_url).toContain('1pLfZCCIYW6qPsrkTpfeFJuZ6AX8Q0IPG')
  })
})

describe('TerraPet Theme Colors (theme.json)', () => {
  let theme: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'theme.json'), 'utf-8')
    theme = JSON.parse(content)
  })
  
  it('should have sage green as primary color', () => {
    expect(theme.colors.primary.main).toBe('#78866B')
  })
  
  it('should have tan/beige as secondary color', () => {
    expect(theme.colors.secondary.main).toBe('#C19A6B')
  })
  
  it('should have terracotta as accent color', () => {
    expect(theme.colors.accent).toBe('#E8A87C')
  })
  
  it('should have Inter font configured', () => {
    expect(theme.fonts.heading).toContain('Inter')
    expect(theme.fonts.body).toContain('Inter')
  })
})

describe('TerraPet Services (services.json)', () => {
  let services: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'services.json'), 'utf-8')
    services = JSON.parse(content)
  })
  
  it('should have exactly 9 services', () => {
    expect(services.services).toHaveLength(9)
  })
  
  it('should have all expected services', () => {
    const serviceIds = services.services.map((s: any) => s.id)
    
    expect(serviceIds).toContain('consultation')
    expect(serviceIds).toContain('vaccination')
    expect(serviceIds).toContain('deworming')
    expect(serviceIds).toContain('weight-control')
    expect(serviceIds).toContain('grooming')
    expect(serviceIds).toContain('bath')
    expect(serviceIds).toContain('microchip')
    expect(serviceIds).toContain('certificates')
    expect(serviceIds).toContain('euthanasia')
  })
  
  it('should have home visit consultation variant', () => {
    const consultation = services.services.find((s: any) => s.id === 'consultation')
    const variants = consultation.variants.map((v: any) => v.name)
    
    expect(variants).toContain('Consulta a Domicilio')
  })
  
  it('should have dog-focused service descriptions', () => {
    services.services.forEach((service: any) => {
      const description = service.details.description.toLowerCase()
      // Should mention dog/perro, not generic mascota
      const hasDogReference = description.includes('perro') || 
                              description.includes('canino') ||
                              description.includes('peludo')
      
      expect(hasDogReference || service.id === 'euthanasia').toBe(true)
    })
  })
})

describe('TerraPet Team (about.json)', () => {
  let about: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'about.json'), 'utf-8')
    about = JSON.parse(content)
  })
  
  it('should have Dr. Adrián Alexander Gill Sánchez', () => {
    expect(about.team).toHaveLength(1)
    expect(about.team[0].name).toBe('Dr. Adrián Alexander Gill Sánchez')
  })
  
  it('should have correct veterinarian title', () => {
    expect(about.team[0].role).toBe('Doctor en Ciencias Veterinarias')
  })
  
  it('should have specialization', () => {
    expect(about.team[0].specialties).toBe('Clínica diaria')
  })
  
  it('should have vet photo URL', () => {
    expect(about.team[0].photo_url).toContain('drive.google.com')
    expect(about.team[0].photo_url).toContain('1t_z4_tSXiPqm_c3NpQGepcxGfuX_ONLH')
  })
  
  it('should have mission statement about good treatment and prices', () => {
    expect(about.mission.text).toContain('buen trato')
    expect(about.mission.text).toContain('precios accesibles')
  })
})

describe('TerraPet Images (images.json)', () => {
  let images: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'images.json'), 'utf-8')
    images = JSON.parse(content)
  })
  
  it('should have logo from Google Drive', () => {
    expect(images.images.branding.logo.src).toContain('drive.google.com')
    expect(images.images.branding.logo.src).toContain('1pLfZCCIYW6qPsrkTpfeFJuZ6AX8Q0IPG')
  })
  
  it('should have clinic photos from Google Drive', () => {
    expect(images.images.hero.main.src).toContain('drive.google.com')
    expect(images.images.facilities.exterior.src).toContain('drive.google.com')
  })
  
  it('should have vet photo from Google Drive', () => {
    expect(images.images.team.vet.src).toContain('drive.google.com')
    expect(images.images.team.vet.src).toContain('1t_z4_tSXiPqm_c3NpQGepcxGfuX_ONLH')
  })
  
  it('should have product photos from Google Drive', () => {
    const products = images.images.products
    const productKeys = Object.keys(products)
    
    expect(productKeys.length).toBeGreaterThanOrEqual(5)
    
    productKeys.forEach(key => {
      expect(products[key].src).toContain('drive.google.com')
    })
  })
})

describe('TerraPet FAQ (faq.json)', () => {
  let faq: any[]
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'faq.json'), 'utf-8')
    faq = JSON.parse(content)
  })
  
  it('should have 12 FAQ entries', () => {
    expect(faq).toHaveLength(12)
  })
  
  it('should all be in Spanish (questions with ¿?)', () => {
    faq.forEach((item: any) => {
      expect(item.question).toMatch(/¿.*\?/)
    })
  })
  
  it('should mention dog-only specialization', () => {
    const animalsQuestion = faq.find((item: any) => 
      item.question.toLowerCase().includes('animales')
    )
    
    expect(animalsQuestion).toBeDefined()
    expect(animalsQuestion.answer.toLowerCase()).toContain('perro')
  })
  
  it('should mention home visits', () => {
    const homeVisitQuestion = faq.find((item: any) => 
      item.question.toLowerCase().includes('domicilio')
    )
    
    expect(homeVisitQuestion).toBeDefined()
  })
  
  it('should include contact phone number', () => {
    const appointmentQuestion = faq.find((item: any) => 
      item.category === 'citas'
    )
    
    expect(appointmentQuestion.answer).toContain('+595 992 152 465')
  })
})

describe('TerraPet Homepage (home.json)', () => {
  let home: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'home.json'), 'utf-8')
    home = JSON.parse(content)
  })
  
  it('should have correct headline', () => {
    expect(home.hero.headline).toBe('TerraPet - El mejor cuidado para tu peludo')
  })
  
  it('should mention dog specialization in subhead', () => {
    expect(home.hero.subhead.toLowerCase()).toContain('perro')
  })
  
  it('should have 3 feature highlights', () => {
    expect(home.features).toHaveLength(3)
  })
  
  it('should highlight good treatment and accessible prices', () => {
    const featureTitles = home.features.map((f: any) => f.title)
    
    expect(featureTitles.some((t: string) => t.includes('Mejor Trato'))).toBe(true)
    expect(featureTitles.some((t: string) => t.includes('Precios Accesibles'))).toBe(true)
  })
})

describe('TerraPet Showcase (showcase.json)', () => {
  let showcase: any
  
  beforeAll(async () => {
    const content = await fs.readFile(path.join(TERRAPET_DIR, 'showcase.json'), 'utf-8')
    showcase = JSON.parse(content)
  })
  
  it('should be enabled for display', () => {
    expect(showcase.displayInShowcase).toBe(true)
  })
  
  it('should have Dr. Gill as contact person', () => {
    expect(showcase.contactPerson.name).toBe('Dr. Adrián Alexander Gill Sánchez')
  })
  
  it('should list specialties including home visits', () => {
    expect(showcase.specialties).toContain('Consultas a domicilio')
  })
  
  it('should list highlights including QR tags', () => {
    expect(showcase.highlights.some((h: string) => h.includes('QR'))).toBe(true)
  })
})
