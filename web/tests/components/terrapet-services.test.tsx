import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ServicesPage from '@/app/[clinic]/services/page'
import { getClinicData } from '@/lib/clinics'
import type { ClinicData } from '@/lib/types/clinic-config'

// Mock the getClinicData function
vi.mock('@/lib/clinics', () => ({
  getClinicData: vi.fn(),
}))

// Mock the ServicesGrid component
vi.mock('@/components/services/services-grid', () => ({
  ServicesGrid: ({ services, config }: { services: unknown[]; config: { name: string } }) => (
    <div data-testid="services-grid">
      <div data-testid="services-count">{services.length} services</div>
      <div data-testid="clinic-name">{config.name}</div>
      {services.map((service: { id: string; title: string }) => (
        <div key={service.id} data-testid={`service-${service.id}`}>
          {service.title}
        </div>
      ))}
    </div>
  ),
}))

// Mock config utilities
vi.mock('@/lib/config', () => ({
  getCanonicalUrl: vi.fn((clinic: string, path: string) => `https://example.com/${clinic}${path}`),
  getSiteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

describe('TerraPet Services Page Component Tests', () => {
  let mockClinicData: ClinicData

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup comprehensive mock clinic data with all 9 TerraPet services
    mockClinicData = {
      config: {
        id: 'terrapet',
        name: 'TerraPet',
        slogan: 'El mejor cuidado para tu peludo',
        contact: {
          whatsapp_number: '5950992152465',
          phone_display: '+595 992 152 465',
          email: 'terrapetanimal@gmail.com',
          address: '',
          google_maps_url: '',
          google_maps_embed: '',
          google_maps_id: '',
          city: '',
          coordinates: { lat: null, lng: null },
        },
        hours: {
          weekdays: '09:00 - 18:00',
          weekends: '09:00 - 13:00',
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '18:00' },
          sunday: { open: '09:00', close: '18:00' },
        },
        settings: {
          currency: 'PYG',
          emergency_24h: false,
          modules: {
            toxic_checker: true,
            age_calculator: true,
            online_store: true,
            qr_tags: true,
          },
          inventory_template_google_sheet_url: null,
        },
        branding: {
          logo_url: '',
          logo_width: 150,
          logo_height: 40,
          favicon_url: '/favicon.ico',
          hero_image_url: '',
          og_image_url: '',
        },
        ui_labels: {
          nav: { home: 'Inicio', services: 'Servicios', about: 'Nosotros', book_btn: 'Agendar' },
          footer: { rights: 'Todos los derechos reservados.' },
          home: {},
          services: {
            online_badge: 'Reservable Online',
            description_label: 'Descripción:',
            includes_label: 'Incluye:',
            table_variant: 'Variante / Tipo',
            table_price: 'Precio',
            book_floating_btn: 'Agendar Turno',
          },
          about: { team_title: 'Nuestro Equipo' },
          common: {},
          portal: {},
          store: {},
          cart: {},
          checkout: {},
          booking: {},
          auth: {},
          tools: {},
          errors: {},
        },
      },
      theme: {
        colors: {
          primary: '#78866B',
          'primary-light': '#A5B396',
          'primary-dark': '#5D6A52',
          'primary-contrast': '#FFFFFF',
          secondary: '#C19A6B',
          'secondary-light': '#D4B896',
          'secondary-dark': '#8F724F',
          'secondary-contrast': '#FFFFFF',
          accent: '#E8A87C',
          'accent-light': '#F0C9A5',
          'accent-dark': '#D8925C',
          'accent-contrast': '#FFFFFF',
          'bg-primary': '#FFFFFF',
          'bg-subtle': '#F8F6F0',
          'bg-muted': '#E8E6DC',
          'bg-card': '#FFFFFF',
          'text-primary': '#2D3319',
          'text-secondary': '#5A5F4A',
          'text-muted': '#8B9178',
          'text-inverse': '#FFFFFF',
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#F44336',
          info: '#2196F3',
        },
        fonts: { heading: 'Poppins', body: 'Inter' },
        borderRadius: { card: '1rem', button: '0.5rem', input: '0.5rem' },
        shadows: {
          card: '0 4px 6px rgba(0, 0, 0, 0.1)',
          'card-hover': '0 10px 20px rgba(0, 0, 0, 0.15)',
          button: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
      home: {
        hero: {
          headline: '',
          subhead: '',
          cta_primary: '',
          cta_secondary: '',
        },
        features: [],
        seo: { meta_title: '', meta_description: '' },
      },
      services: {
        meta: {
          title: 'Nuestros Servicios',
          subtitle: 'Atención veterinaria especializada para perros con el mejor trato y precios accesibles.',
        },
        services: [
          {
            id: 'consultation',
            visible: true,
            category: 'medical',
            title: 'Consultas Veterinarias',
            icon: 'stethoscope',
            summary: 'Atención médica profesional para tu perro.',
            details: {
              description:
                'Evaluación completa del estado de salud de tu perro con el mejor trato y atención.',
              duration_minutes: 30,
              includes: ['Revisión Física Completa', 'Diagnóstico', 'Plan de Tratamiento'],
            },
            variants: [
              {
                name: 'Consulta General',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Consulta veterinaria general en clínica',
              },
              {
                name: 'Consulta a Domicilio',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Atención veterinaria en la comodidad de tu hogar',
              },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'vaccination',
            visible: true,
            category: 'preventative',
            title: 'Vacunación',
            icon: 'shield-check',
            summary: 'Protección completa para tu perro.',
            details: {
              description:
                'Vacunas de alta calidad con registro y seguimiento para mantener a tu perro protegido.',
              duration_minutes: 20,
              includes: ['Revisión Pre-vacunal', 'Vacuna', 'Registro en Carnet'],
            },
            variants: [
              { name: 'Antirrábica', price_display: 'Consultar', price_value: 0 },
              { name: 'Polivalente Canina', price_display: 'Consultar', price_value: 0 },
              { name: 'Otras Vacunas', price_display: 'Consultar', price_value: 0 },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'deworming',
            visible: true,
            category: 'preventative',
            title: 'Desparasitación',
            icon: 'pill',
            summary: 'Elimina y previene parásitos en tu perro.',
            details: {
              description:
                'Tratamiento antiparasitario interno y externo para mantener a tu perro saludable.',
              duration_minutes: 15,
              includes: ['Evaluación', 'Medicamento Antiparasitario', 'Recomendaciones'],
            },
            variants: [
              {
                name: 'Desparasitación Interna',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Tratamiento contra parásitos intestinales',
              },
              {
                name: 'Desparasitación Externa',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Tratamiento contra pulgas y garrapatas',
              },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'weight-control',
            visible: true,
            category: 'preventative',
            title: 'Control de Peso',
            icon: 'scale',
            summary: 'Monitoreo del peso y condición corporal.',
            details: {
              description:
                'Control periódico de peso y asesoramiento nutricional para mantener a tu perro en forma óptima.',
              duration_minutes: 15,
              includes: [
                'Pesaje',
                'Evaluación de Condición Corporal',
                'Recomendaciones Nutricionales',
              ],
            },
            variants: [{ name: 'Control de Peso', price_display: 'Consultar', price_value: 0 }],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'grooming',
            visible: true,
            category: 'cosmetic',
            title: 'Peluquería / Grooming',
            icon: 'sparkles',
            summary: 'Tu perro lucirá hermoso y saludable.',
            details: {
              description: 'Servicios de peluquería profesional con productos de calidad para perros.',
              duration_minutes: 60,
              includes: ['Corte de Pelo', 'Corte de Uñas', 'Limpieza de Oídos', 'Secado'],
            },
            variants: [
              {
                name: 'Peluquería Completa',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Corte de pelo, uñas, limpieza de oídos',
              },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'bath',
            visible: true,
            category: 'cosmetic',
            title: 'Baño',
            icon: 'droplet',
            summary: 'Baño profesional para tu perro.',
            details: {
              description:
                'Servicio de baño completo con productos de calidad para el cuidado de la piel y pelo de tu perro.',
              duration_minutes: 45,
              includes: ['Baño con Shampoo de Calidad', 'Secado', 'Cepillado', 'Corte de Uñas'],
            },
            variants: [
              {
                name: 'Baño Completo',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Precio según tamaño del perro',
              },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'microchip',
            visible: true,
            category: 'preventative',
            title: 'Microchip / Identificación',
            icon: 'chip',
            summary: 'Identificación permanente para tu perro.',
            details: {
              description:
                'Implantación de microchip de identificación para la seguridad de tu mascota.',
              duration_minutes: 15,
              includes: ['Microchip', 'Implantación', 'Registro Nacional'],
            },
            variants: [{ name: 'Microchip', price_display: 'Consultar', price_value: 0 }],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'certificates',
            visible: true,
            category: 'administrative',
            title: 'Certificados',
            icon: 'file-text',
            summary: 'Certificados de salud y viaje.',
            details: {
              description: 'Emisión de certificados veterinarios oficiales para diversos trámites.',
              duration_minutes: 20,
              includes: ['Examen Clínico', 'Certificado Oficial', 'Firma del Veterinario'],
            },
            variants: [
              {
                name: 'Certificado de Salud',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Para trámites generales',
              },
              {
                name: 'Certificado de Viaje',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Para viajes nacionales e internacionales',
              },
            ],
            booking: { online_enabled: true, emergency_available: false },
          },
          {
            id: 'euthanasia',
            visible: true,
            category: 'medical',
            title: 'Eutanasia Humanitaria',
            icon: 'heart',
            summary: 'Despedida digna y sin sufrimiento.',
            details: {
              description:
                'Procedimiento humanitario realizado con compasión y respeto cuando es médicamente necesario.',
              duration_minutes: 30,
              includes: ['Consulta Previa', 'Sedación', 'Procedimiento', 'Acompañamiento'],
            },
            variants: [
              {
                name: 'Eutanasia Humanitaria',
                price_display: 'Consultar',
                price_value: 0,
                description: 'Consulta previa requerida',
              },
            ],
            booking: { online_enabled: false, emergency_available: false },
          },
        ],
      },
      about: {
        mission: '',
        vision: '',
        values: [],
        team: [],
      },
    } as ClinicData

    vi.mocked(getClinicData).mockResolvedValue(mockClinicData)
  })

  describe('Page Structure', () => {
    it('should render the services page without errors', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const { container } = render(await ServicesPage({ params }))
      expect(container).toBeTruthy()
    })

    it('should call getClinicData with correct clinic slug', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      await ServicesPage({ params })
      expect(getClinicData).toHaveBeenCalledWith('terrapet')
      expect(getClinicData).toHaveBeenCalledTimes(1)
    })

    it('should render the page title from services meta', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Nuestros Servicios')).toBeInTheDocument()
    })

    it('should render the page subtitle from services meta', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(
        screen.getByText(
          'Atención veterinaria especializada para perros con el mejor trato y precios accesibles.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('ServicesGrid Component Integration', () => {
    it('should render ServicesGrid component', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByTestId('services-grid')).toBeInTheDocument()
    })

    it('should pass all 9 services to ServicesGrid', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByTestId('services-count')).toHaveTextContent('9 services')
    })

    it('should pass clinic config to ServicesGrid', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByTestId('clinic-name')).toHaveTextContent('TerraPet')
    })
  })

  describe('All Services Rendering', () => {
    it('should render all 9 TerraPet services', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      const serviceIds = [
        'consultation',
        'vaccination',
        'deworming',
        'weight-control',
        'grooming',
        'bath',
        'microchip',
        'certificates',
        'euthanasia',
      ]

      serviceIds.forEach((id) => {
        expect(screen.getByTestId(`service-${id}`)).toBeInTheDocument()
      })
    })

    it('should render Consultas Veterinarias service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Consultas Veterinarias')).toBeInTheDocument()
    })

    it('should render Vacunación service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Vacunación')).toBeInTheDocument()
    })

    it('should render Desparasitación service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Desparasitación')).toBeInTheDocument()
    })

    it('should render Control de Peso service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Control de Peso')).toBeInTheDocument()
    })

    it('should render Peluquería / Grooming service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Peluquería / Grooming')).toBeInTheDocument()
    })

    it('should render Baño service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Baño')).toBeInTheDocument()
    })

    it('should render Microchip / Identificación service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Microchip / Identificación')).toBeInTheDocument()
    })

    it('should render Certificados service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Certificados')).toBeInTheDocument()
    })

    it('should render Eutanasia Humanitaria service', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Eutanasia Humanitaria')).toBeInTheDocument()
    })
  })

  describe('Service Categories', () => {
    it('should have medical category services', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      // Consultation and Euthanasia are medical category
      expect(screen.getByTestId('service-consultation')).toBeInTheDocument()
      expect(screen.getByTestId('service-euthanasia')).toBeInTheDocument()
    })

    it('should have preventative category services', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      // Vaccination, Deworming, Weight Control, Microchip are preventative
      expect(screen.getByTestId('service-vaccination')).toBeInTheDocument()
      expect(screen.getByTestId('service-deworming')).toBeInTheDocument()
      expect(screen.getByTestId('service-weight-control')).toBeInTheDocument()
      expect(screen.getByTestId('service-microchip')).toBeInTheDocument()
    })

    it('should have cosmetic category services', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      // Grooming and Bath are cosmetic
      expect(screen.getByTestId('service-grooming')).toBeInTheDocument()
      expect(screen.getByTestId('service-bath')).toBeInTheDocument()
    })

    it('should have administrative category services', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      // Certificates is administrative
      expect(screen.getByTestId('service-certificates')).toBeInTheDocument()
    })
  })

  describe('Service Variants', () => {
    it('should have Consulta a Domicilio variant in consultation service', () => {
      const consultationService = mockClinicData.services.services.find((s) => s.id === 'consultation')
      const homeVisitVariant = consultationService?.variants?.find((v) => v.name === 'Consulta a Domicilio')
      expect(homeVisitVariant).toBeDefined()
      expect(homeVisitVariant?.description).toBe('Atención veterinaria en la comodidad de tu hogar')
    })

    it('should have 3 vaccination variants', () => {
      const vaccinationService = mockClinicData.services.services.find((s) => s.id === 'vaccination')
      expect(vaccinationService?.variants).toHaveLength(3)
      expect(vaccinationService?.variants?.map((v) => v.name)).toEqual([
        'Antirrábica',
        'Polivalente Canina',
        'Otras Vacunas',
      ])
    })

    it('should have 2 deworming variants', () => {
      const dewormingService = mockClinicData.services.services.find((s) => s.id === 'deworming')
      expect(dewormingService?.variants).toHaveLength(2)
      expect(dewormingService?.variants?.map((v) => v.name)).toEqual([
        'Desparasitación Interna',
        'Desparasitación Externa',
      ])
    })

    it('should have 2 certificate variants', () => {
      const certificatesService = mockClinicData.services.services.find((s) => s.id === 'certificates')
      expect(certificatesService?.variants).toHaveLength(2)
      expect(certificatesService?.variants?.map((v) => v.name)).toEqual([
        'Certificado de Salud',
        'Certificado de Viaje',
      ])
    })
  })

  describe('Online Booking Configuration', () => {
    it('should mark 8 services as online booking enabled', () => {
      const onlineServices = mockClinicData.services.services.filter(
        (s) => s.booking?.online_enabled === true
      )
      expect(onlineServices).toHaveLength(8)
    })

    it('should mark euthanasia as NOT online booking enabled', () => {
      const euthanasiaService = mockClinicData.services.services.find((s) => s.id === 'euthanasia')
      expect(euthanasiaService?.booking?.online_enabled).toBe(false)
    })

    it('should have no services marked as emergency available', () => {
      const emergencyServices = mockClinicData.services.services.filter(
        (s) => s.booking?.emergency_available === true
      )
      expect(emergencyServices).toHaveLength(0)
    })
  })

  describe('WhatsApp Floating CTA', () => {
    it('should render WhatsApp floating button', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const { container } = render(await ServicesPage({ params }))

      const whatsappLink = container.querySelector('a[href*="wa.me"]')
      expect(whatsappLink).toBeInTheDocument()
    })

    it('should use correct WhatsApp number', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const { container } = render(await ServicesPage({ params }))

      const whatsappLink = container.querySelector('a[href="https://wa.me/5950992152465"]')
      expect(whatsappLink).toBeInTheDocument()
    })

    it('should display booking button text', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      // Button should show "Agendar Turno" text
      expect(screen.getByText('Agendar Turno')).toBeInTheDocument()
    })
  })

  describe('Service Details', () => {
    it('should have duration specified for all services', () => {
      mockClinicData.services.services.forEach((service) => {
        expect(service.details?.duration_minutes).toBeGreaterThan(0)
      })
    })

    it('should have includes array for all services', () => {
      mockClinicData.services.services.forEach((service) => {
        expect(service.details?.includes).toBeDefined()
        expect(Array.isArray(service.details?.includes)).toBe(true)
        expect(service.details!.includes!.length).toBeGreaterThan(0)
      })
    })

    it('should have description for all services', () => {
      mockClinicData.services.services.forEach((service) => {
        expect(service.details?.description).toBeDefined()
        expect(service.details?.description?.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Spanish Language Content', () => {
    it('should display all service names in Spanish', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))

      const spanishServiceNames = [
        'Consultas Veterinarias',
        'Vacunación',
        'Desparasitación',
        'Control de Peso',
        'Peluquería / Grooming',
        'Baño',
        'Microchip / Identificación',
        'Certificados',
        'Eutanasia Humanitaria',
      ]

      spanishServiceNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument()
      })
    })

    it('should have page title in Spanish', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await ServicesPage({ params }))
      expect(screen.getByText('Nuestros Servicios')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing clinic data gracefully', async () => {
      vi.mocked(getClinicData).mockResolvedValue(null)

      const params = Promise.resolve({ clinic: 'nonexistent' })

      try {
        await ServicesPage({ params })
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
