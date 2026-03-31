import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import QRCode from 'qrcode'

/**
 * POST /api/pets/[id]/qr
 * Generate a new QR code for a pet
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const petId = params.id

    try {
      // Verify pet exists and get owner info
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id, name, owner_id, tenant_id, species, breed, microchip_number')
        .eq('id', petId)
        .single()

      if (petError || !pet) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
      }

      // Check if user is owner or staff of same tenant
      const isOwner = pet.owner_id === user.id
      const isStaff =
        ['vet', 'admin'].includes(profile.role) && profile.tenant_id === pet.tenant_id

      if (!isOwner && !isStaff) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Fetch owner contact info
      const { data: owner } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', pet.owner_id)
        .single()

      // Generate QR data payload
      const qrData = {
        petId: pet.id,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        microchip: pet.microchip_number,
        ownerName: owner?.full_name,
        ownerPhone: owner?.phone,
        ownerEmail: owner?.email,
        scanUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/scan/${pet.id}`,
      }

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 512,
        margin: 2,
      })

      // Convert data URL to buffer for upload
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      // Upload to Supabase Storage
      const fileName = `${petId}-${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pet-qr-codes')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false,
        })

      if (uploadError) {
        logger.error('Error uploading QR code to storage', {
          tenantId: profile.tenant_id,
          petId,
          userId: user.id,
          error: uploadError.message,
        })
        return apiError('UPLOAD_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('pet-qr-codes').getPublicUrl(uploadData.path)

      // Deactivate old QR codes for this pet
      await supabase
        .from('pet_qr_codes')
        .update({ is_active: false })
        .eq('pet_id', petId)
        .eq('is_active', true)

      // Save QR code record
      const { data: qrRecord, error: insertError } = await supabase
        .from('pet_qr_codes')
        .insert({
          pet_id: petId,
          qr_code_url: publicUrl,
          qr_data: JSON.stringify(qrData),
          is_active: true,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Error saving QR code record', {
          tenantId: profile.tenant_id,
          petId,
          userId: user.id,
          error: insertError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        success: true,
        qrCode: {
          id: qrRecord.id,
          url: publicUrl,
          scanUrl: qrData.scanUrl,
        },
      })
    } catch (e) {
      logger.error('Error generating pet QR code', {
        tenantId: profile.tenant_id,
        petId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * GET /api/pets/[id]/qr
 * Retrieve active QR code for a pet
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const petId = params.id

    try {
      // Verify pet access (owner or staff of same tenant)
      const { data: pet } = await supabase
        .from('pets')
        .select('owner_id, tenant_id')
        .eq('id', petId)
        .single()

      if (!pet) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
      }

      const isOwner = pet.owner_id === user.id
      const isStaff =
        ['vet', 'admin'].includes(profile.role) && profile.tenant_id === pet.tenant_id

      if (!isOwner && !isStaff) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      const { data: qrCode } = await supabase
        .from('pet_qr_codes')
        .select('*')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .single()

      return NextResponse.json({ qrCode: qrCode || null })
    } catch (e) {
      logger.error('Error fetching pet QR code', {
        tenantId: profile.tenant_id,
        petId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)
