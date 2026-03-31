import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FAQPage from '@/app/[clinic]/faq/page'
import { getClinicData } from '@/lib/clinics'
import type { ClinicData } from '@/lib/types/clinic-config'

// Mock dependencies
vi.mock('@/lib/clinics', () => ({
  getClinicData: vi.fn(),
  getAllClinics: vi.fn(() => Promise.resolve(['terrapet'])),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('Not Found')
  }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next-intl
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => (key: string) => key),
}))

// Mock FAQSection component to focus on page logic
vi.mock('@/components/faq/FAQSection', () => ({
  FAQSection: ({ items, categories }: { items: any[]; categories: string[] }) => (
    <div data-testid="faq-section">
      <div data-testid="faq-items-count">{items.length}</div>
      <div data-testid="faq-categories">{categories.join(',')}</div>
      {items.map((item) => (
        <div key={item.id} data-testid={`faq-item-${item.id}`}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </div>
  ),
}))

describe('TerraPet FAQ Page Component Tests', () => {
  let mockClinicData: ClinicData

  beforeEach(() => {
    vi.clearAllMocks()

    // Full mock clinic data matching TerraPet's structure
    mockClinicData = {
      config: {
        name: 'TerraPet',
        slug: 'terrapet',
        database_tenant_id: 'terrapet',
        tagline: 'Cuidado veterinario especializado para perros',
        ui_labels: {
          homepage: { hero: 'Bienvenido' },
          about: { intro_badge: 'Nuestra Historia' },
        },
        contact: {
          phone_display: '+595 992 152 465',
          phone_raw: '595992152465',
          whatsapp_number: '595992152465',
          email: 'contacto@terrapet.com',
          address: 'Asunción, Paraguay',
          city: '',
          coordinates: { lat: null, lng: null },
        },
        hours: {
          weekdays: '09:00 - 18:00',
          weekends: '09:00 - 18:00',
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
        },
        social_media: {
          facebook: '',
          instagram: '',
          tiktok: '',
        },
      },
      theme: {
        colors: {
          primary: '#78866B',
          'primary-dark': '#5A6550',
          secondary: '#E8A87C',
          'secondary-dark': '#C19A6B',
          accent: '#C19A6B',
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Inter',
        },
      },
      home: {
        meta: { title: '', subtitle: '' },
        promo_banner: null,
        hero: { title: '', subtitle: '', cta_text: '' },
        features: [],
      },
      services: {
        meta: { title: '', subtitle: '' },
        services: [],
      },
      about: {
        intro: {
          title: 'Sobre TerraPet',
          text: 'En TerraPet nos dedicamos al cuidado integral de tu mascota.',
        },
        mission: {
          title: 'Nuestra Misión',
          text: 'El buen trato y la atención tanto para dueños y pacientes.',
        },
        team: [],
        values: [],
      },
      // TerraPet FAQ data (12 items)
      faq: [
        {
          id: 'appointment',
          category: 'citas',
          question: '¿Cómo puedo agendar una cita?',
          answer:
            "Puedes agendar una cita a través de nuestro portal web haciendo clic en 'Agendar Cita', llamándonos al +595 992 152 465, o enviándonos un mensaje por WhatsApp al mismo número.",
        },
        {
          id: 'animals',
          category: 'servicios',
          question: '¿Qué tipos de animales atienden?',
          answer:
            'Somos especialistas en el cuidado de perros. Nuestro equipo está enfocado en brindar el mejor servicio veterinario para tu peludo.',
        },
        {
          id: 'payment-methods',
          category: 'pagos',
          question: '¿Qué formas de pago aceptan?',
          answer:
            'Aceptamos efectivo, tarjetas de débito y crédito, y transferencias bancarias. Ofrecemos precios accesibles para que todos puedan acceder a servicios veterinarios de calidad.',
        },
        {
          id: 'vaccines',
          category: 'vacunas',
          question: '¿Qué vacunas necesita mi perro?',
          answer:
            'El esquema de vacunación depende de la edad y estilo de vida de tu perro. Ofrecemos vacunas antirrábicas, polivalentes y otras necesarias. Nuestro veterinario te dará un plan personalizado.',
        },
        {
          id: 'hours',
          category: 'horarios',
          question: '¿Cuál es el horario de atención?',
          answer:
            'Nuestro horario de atención es de lunes a domingo de 9:00 a 18:00. ¡Abierto todos los días para el cuidado de tu peludo!',
        },
        {
          id: 'home-visits',
          category: 'servicios',
          question: '¿Hacen consultas a domicilio?',
          answer:
            'Sí, ofrecemos servicio de consultas a domicilio para mayor comodidad. Contáctanos para coordinar una visita.',
        },
        {
          id: 'first-visit',
          category: 'citas',
          question: '¿Qué debo traer en la primera visita?',
          answer:
            'Para la primera visita, por favor trae el carnet de vacunas de tu perro (si tiene), cualquier historial médico anterior, y una lista de cualquier medicamento que esté tomando actualmente.',
        },
        {
          id: 'grooming-schedule',
          category: 'peluqueria',
          question: '¿Con qué frecuencia debo traer a mi perro a peluquería?',
          answer:
            'Recomendamos un baño cada 3-4 semanas para mantener la higiene y salud de tu perro. La frecuencia del corte depende de la raza y tus preferencias.',
        },
        {
          id: 'microchip',
          category: 'identificacion',
          question: '¿Por qué es importante el microchip?',
          answer:
            'El microchip es una identificación permanente que ayuda a recuperar a tu perro si se pierde. Es un procedimiento simple y seguro que brinda tranquilidad.',
        },
        {
          id: 'certificates',
          category: 'documentos',
          question: '¿Emiten certificados de salud y viaje?',
          answer:
            'Sí, emitimos certificados de salud para trámites generales y certificados de viaje para viajes nacionales e internacionales. Agenda una cita para la evaluación.',
        },
        {
          id: 'products',
          category: 'tienda',
          question: '¿Venden productos para perros?',
          answer:
            'Sí, contamos con alimentos balanceados de calidad y otros productos para el cuidado de tu perro. Consulta nuestra tienda online o visítanos.',
        },
        {
          id: 'why-terrapet',
          category: 'nosotros',
          question: '¿Qué hace diferente a TerraPet?',
          answer:
            'Nos destacamos por el buen trato y la atención tanto para dueños como para pacientes. Ofrecemos servicios de calidad con precios accesibles, porque creemos que todos merecen el mejor cuidado para sus peludos.',
        },
      ],
    }

    vi.mocked(getClinicData).mockResolvedValue(mockClinicData)
  })

  describe('Page Structure', () => {
    it('should render the FAQ page without errors', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('Preguntas Frecuentes')).toBeInTheDocument()
    })

    it('should call getClinicData with correct clinic slug', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      await FAQPage({ params })

      expect(getClinicData).toHaveBeenCalledWith('terrapet')
    })

    it('should render hero section with title and description', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('Preguntas Frecuentes')).toBeInTheDocument()
      expect(
        screen.getByText(/Encuentra respuestas a las dudas más comunes sobre nuestros servicios/i)
      ).toBeInTheDocument()
    })
  })

  describe('FAQ Items', () => {
    it('should render all 12 FAQ items', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      const itemCount = screen.getByTestId('faq-items-count')
      expect(itemCount.textContent).toBe('12')
    })

    it('should render appointment FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Cómo puedo agendar una cita?')).toBeInTheDocument()
      expect(screen.getByText(/Puedes agendar una cita a través de nuestro portal web/i)).toBeInTheDocument()
    })

    it('should render animals FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Qué tipos de animales atienden?')).toBeInTheDocument()
      expect(screen.getByText(/Somos especialistas en el cuidado de perros/i)).toBeInTheDocument()
    })

    it('should render payment methods FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Qué formas de pago aceptan?')).toBeInTheDocument()
      expect(screen.getByText(/Aceptamos efectivo, tarjetas de débito y crédito/i)).toBeInTheDocument()
    })

    it('should render vaccines FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Qué vacunas necesita mi perro?')).toBeInTheDocument()
      expect(screen.getByText(/El esquema de vacunación depende de la edad/i)).toBeInTheDocument()
    })

    it('should render hours FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Cuál es el horario de atención?')).toBeInTheDocument()
      expect(screen.getByText(/Nuestro horario de atención es de lunes a domingo de 9:00 a 18:00/i)).toBeInTheDocument()
    })

    it('should render home visits FAQ', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Hacen consultas a domicilio?')).toBeInTheDocument()
      expect(screen.getByText(/Sí, ofrecemos servicio de consultas a domicilio/i)).toBeInTheDocument()
    })
  })

  describe('FAQ Categories', () => {
    it('should identify all unique FAQ categories', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      const categories = screen.getByTestId('faq-categories')
      const categoryList = categories.textContent?.split(',') || []

      // TerraPet has 11 unique categories
      expect(categoryList.length).toBeGreaterThan(0)
      expect(categoryList).toContain('citas')
      expect(categoryList).toContain('servicios')
      expect(categoryList).toContain('pagos')
      expect(categoryList).toContain('vacunas')
    })
  })

  describe('Contact Section', () => {
    it('should render "Still have questions?" section', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      expect(screen.getByText('¿Aún tienes dudas?')).toBeInTheDocument()
      expect(screen.getByText(/Nuestro equipo está listo para ayudarte/i)).toBeInTheDocument()
    })

    it('should render WhatsApp contact button', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      const whatsappLink = screen.getByText('WhatsApp').closest('a')
      expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/595992152465')
    })

    it('should render phone contact button with display number', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      const phoneLink = screen.getByText('+595 992 152 465').closest('a')
      expect(phoneLink).toHaveAttribute('href', 'tel:+595992152465')
    })

    it('should render email contact button', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      const emailLink = screen.getByText('Email').closest('a')
      expect(emailLink).toHaveAttribute('href', 'mailto:contacto@terrapet.com')
    })
  })

  describe('Spanish Language Content', () => {
    it('should display all content in Spanish', async () => {
      const params = Promise.resolve({ clinic: 'terrapet' })
      const result = await FAQPage({ params })
      render(result)

      // Spanish headers
      expect(screen.getByText('Preguntas Frecuentes')).toBeInTheDocument()
      expect(screen.getByText('¿Aún tienes dudas?')).toBeInTheDocument()

      // Spanish FAQ questions
      expect(screen.getByText('¿Cómo puedo agendar una cita?')).toBeInTheDocument()
      expect(screen.getByText('¿Qué tipos de animales atienden?')).toBeInTheDocument()

      // Spanish contact buttons
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing clinic data gracefully', async () => {
      vi.mocked(getClinicData).mockResolvedValue(null)

      const params = Promise.resolve({ clinic: 'nonexistent' })

      await expect(FAQPage({ params })).rejects.toThrow('Not Found')
    })
  })
})
