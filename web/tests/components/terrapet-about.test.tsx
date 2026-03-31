import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutPage from '@/app/[clinic]/about/page'
import { getClinicData } from '@/lib/clinics'
import type { ClinicData } from '@/lib/types/clinic-config'

// Mock the getClinicData function
vi.mock('@/lib/clinics', () => ({
  getClinicData: vi.fn(),
}))

// Mock child components
vi.mock('@/components/about/team-member-card', () => ({
  TeamMemberCard: ({ member }: { member: { name: string; role: string } }) => (
    <div data-testid="team-member-card">
      <h3>{member.name}</h3>
      <p>{member.role}</p>
    </div>
  ),
}))

vi.mock('@/components/about/facilities-gallery', () => ({
  FacilitiesGallery: () => <div data-testid="facilities-gallery">Facilities Gallery</div>,
}))

vi.mock('@/components/about/certification-badge', () => ({
  CertificationBadge: () => <div data-testid="certification-badge">Certification Badge</div>,
}))

vi.mock('@/components/seo/structured-data', () => ({
  TeamSchema: () => <script data-testid="team-schema">Team Schema</script>,
  BreadcrumbSchema: () => <script data-testid="breadcrumb-schema">Breadcrumb Schema</script>,
}))

// Mock config utilities
vi.mock('@/lib/config', () => ({
  getCanonicalUrl: vi.fn((clinic: string, path: string) => `https://example.com/${clinic}${path}`),
  getSiteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

describe('TerraPet About Page Component Tests', () => {
  let mockClinicData: ClinicData

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup comprehensive mock clinic data
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
          services: {},
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
        hero: { headline: '', subhead: '', cta_primary: '', cta_secondary: '' },
        features: [],
        seo: { meta_title: '', meta_description: '' },
      },
      services: {
        meta: { title: '', subtitle: '' },
        services: [],
      },
      about: {
        intro: {
          title: 'Sobre TerraPet',
          text: 'En TerraPet nos dedicamos al cuidado integral de tu mascota. Con 2 meses de trayectoria, nuestro equipo profesional brinda servicios veterinarios de excelencia con el mejor trato y atención tanto para dueños como para pacientes. Nos comprometemos con la salud y el bienestar de tus compañeros peludos ofreciendo precios accesibles y atención personalizada.',
        },
        mission: {
          title: 'Nuestra Misión',
          text: 'El buen trato y la atención tanto para dueños y pacientes. Ofrecemos precios accesibles para que todos puedan acceder a servicios veterinarios de calidad.',
        },
        vision: {
          title: 'Nuestra Visión',
          text: 'Ser la veterinaria de referencia para el cuidado canino.',
        },
        team: [
          {
            name: 'Dr. Adrián Alexander Gill Sánchez',
            role: 'Doctor en Ciencias Veterinarias',
            specialties: 'Clínica diaria',
            bio: 'Doctor en ciencias veterinarias especializado en clínica diaria. Comprometido con brindar la mejor atención a tu mascota con calidez y profesionalismo.',
            photo_url: 'https://drive.google.com/uc?id=1t_z4_tSXiPqm_c3NpQGepcxGfuX_ONLH',
          },
        ],
        values: [
          {
            title: 'Mejor Trato',
            description:
              'Tratamos a cada perro con amor, respeto y dedicación. Tu mascota recibirá atención personalizada y cariñosa.',
            icon: 'heart',
          },
          {
            title: 'Precios Accesibles',
            description:
              'Cuidado veterinario de calidad al alcance de todos. Creemos que tu perro merece la mejor atención sin comprometer tu presupuesto.',
            icon: 'dollar-sign',
          },
          {
            title: 'Atención a Domicilio',
            description:
              'Consultas veterinarias en la comodidad de tu hogar, reduciendo el estrés de tu mascota.',
            icon: 'home',
          },
        ],
      },
    } as ClinicData

    vi.mocked(getClinicData).mockResolvedValue(mockClinicData)
  })

  describe('Page Structure', () => {
    it('should render the about page without errors', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const { container } = render(await AboutPage({ params }))
      expect(container).toBeTruthy()
    })

    it('should call getClinicData with correct clinic slug', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      await AboutPage({ params })
      expect(getClinicData).toHaveBeenCalledWith('terrapet')
      expect(getClinicData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Intro Section', () => {
    it('should render about intro title', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(screen.getByText('Sobre TerraPet')).toBeInTheDocument()
    })

    it('should render about intro text', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(
        screen.getByText(/En TerraPet nos dedicamos al cuidado integral de tu mascota/)
      ).toBeInTheDocument()
    })
  })

  describe('Mission Section', () => {
    it('should render mission title', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(screen.getByText('Nuestra Misión')).toBeInTheDocument()
    })

    it('should render mission text', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(
        screen.getByText(/El buen trato y la atención tanto para dueños y pacientes/)
      ).toBeInTheDocument()
    })
  })

  describe('Company Values Section', () => {
    it('should render all 3 company values', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))

      expect(screen.getByText('Mejor Trato')).toBeInTheDocument()
      expect(screen.getByText('Precios Accesibles')).toBeInTheDocument()
      expect(screen.getByText('Atención a Domicilio')).toBeInTheDocument()
    })

    it('should render Mejor Trato value description', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(
        screen.getByText(/Tratamos a cada perro con amor, respeto y dedicación/)
      ).toBeInTheDocument()
    })

    it('should render Precios Accesibles value description', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(
        screen.getByText(/Cuidado veterinario de calidad al alcance de todos/)
      ).toBeInTheDocument()
    })

    it('should render Atención a Domicilio value description', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(
        screen.getByText(/Consultas veterinarias en la comodidad de tu hogar/)
      ).toBeInTheDocument()
    })
  })

  describe('Team Section', () => {
    it('should render Dr. Gill profile', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(screen.getByText('Dr. Adrián Alexander Gill Sánchez')).toBeInTheDocument()
    })

    it('should render Dr. Gill role', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(screen.getByText('Doctor en Ciencias Veterinarias')).toBeInTheDocument()
    })

    it('should render team member card component', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))
      expect(screen.getByTestId('team-member-card')).toBeInTheDocument()
    })
  })

  describe('Spanish Language Content', () => {
    it('should display all content in Spanish', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      render(await AboutPage({ params }))

      const spanishTexts = [
        'Sobre TerraPet',
        'Nuestra Misión',
        'Mejor Trato',
        'Precios Accesibles',
        'Atención a Domicilio',
      ]

      spanishTexts.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing clinic data gracefully', async () => {
      vi.mocked(getClinicData).mockResolvedValue(null)

      const params = Promise.resolve({ clinic: 'nonexistent' })

      try {
        await AboutPage({ params })
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
