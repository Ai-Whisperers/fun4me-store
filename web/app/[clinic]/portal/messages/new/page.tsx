import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Send, PawPrint, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface Props {
  params: Promise<{ clinic: string }>
}

interface Pet {
  id: string
  name: string
  species: string
  photo_url: string | null
}

export default async function NewMessagePage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch user's pets for context selection
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, photo_url')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('name')

  const typedPets = (pets || []) as Pet[]

  // Get clinic info
  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', clinic).single()

  // Server action to create conversation
  async function createConversation(formData: FormData): Promise<void> {
    'use server'

    const supabaseServer = (await import('@/lib/supabase/server')).createClient
    const supabase = await supabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const petId = formData.get('petId') as string | null
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string
    const priority = formData.get('priority') as string

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        tenant_id: clinic,
        client_id: user.id,
        pet_id: petId || null,
        channel: 'portal',
        status: 'open',
        subject: subject,
        priority: priority || 'normal',
      })
      .select('id')
      .single()

    if (convError || !conversation) {
      const { logger } = await import('@/lib/logger')
      logger.error('Error creating conversation', { error: convError?.message })
      return
    }

    // Create first message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_type: 'client',
      content: message,
      status: 'sent',
    })

    // Redirect to conversation
    const { redirect: redirectFn } = await import('next/navigation')
    redirectFn(`/${clinic}/portal/messages/${conversation.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/portal/messages`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Mensajes
        </Link>

        <div className="flex items-center gap-4">
          <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <MessageCircle className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Nuevo Mensaje</h1>
            <p className="text-[var(--text-secondary)]">
              Contacta a {tenant?.name || 'la clínica'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        action={createConversation}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        {/* Pet Selection (Optional) */}
        {typedPets.length > 0 && (
          <div className="border-b border-gray-100 p-6">
            <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-gray-400">
              Mascota relacionada (opcional)
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="relative cursor-pointer">
                <input type="radio" name="petId" value="" defaultChecked className="peer sr-only" />
                <div className="peer-checked:bg-[var(--primary)]/5 rounded-xl border-2 border-gray-200 p-3 text-center transition-all peer-checked:border-[var(--primary)]">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <MessageCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Consulta General</p>
                </div>
              </label>
              {typedPets.map((pet) => (
                <label key={pet.id} className="relative cursor-pointer">
                  <input type="radio" name="petId" value={pet.id} className="peer sr-only" />
                  <div className="peer-checked:bg-[var(--primary)]/5 rounded-xl border-2 border-gray-200 p-3 text-center transition-all peer-checked:border-[var(--primary)]">
                    <div className="mx-auto mb-2 h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                      {pet.photo_url ? (
                        <Image
                          src={pet.photo_url}
                          alt={pet.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <PawPrint className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-gray-600">{pet.name}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Subject & Priority */}
        <div className="grid gap-4 border-b border-gray-100 p-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="subject"
              className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
            >
              Asunto *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              placeholder="Ej: Consulta sobre vacunas"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="priority"
              className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
            >
              Prioridad
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="normal"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="low">Baja - Consulta general</option>
              <option value="normal">Normal</option>
              <option value="high">Alta - Necesito respuesta pronto</option>
              <option value="urgent">Urgente - Emergencia</option>
            </select>
          </div>
        </div>

        {/* Message */}
        <div className="border-b border-gray-100 p-6">
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-bold uppercase tracking-wider text-gray-400"
          >
            Mensaje *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="Escribe tu mensaje aquí..."
            className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
          />
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 bg-blue-50 px-6 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <p className="text-sm text-blue-700">
            Recibirás una notificación cuando el equipo responda tu mensaje. Para emergencias, por
            favor llama directamente a la clínica.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 p-6">
          <Link
            href={`/${clinic}/portal/messages`}
            className="rounded-xl px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Enviar Mensaje
          </button>
        </div>
      </form>
    </div>
  )
}
