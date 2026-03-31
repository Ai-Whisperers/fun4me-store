import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111',
    paddingBottom: 15,
  },
  clinicName: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  documentCategory: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    fontSize: 10,
    color: '#555',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#000',
  },
  contentSection: {
    marginBottom: 25,
    lineHeight: 1.5,
  },
  contentText: {
    fontSize: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 15,
    lineHeight: 1.5,
  },
  fieldValuesSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  fieldRow: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: '#000',
  },
  signatureSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  signatureBox: {
    padding: 15,
    border: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 15,
  },
  signatureImage: {
    maxHeight: 80,
    marginBottom: 8,
    objectFit: 'contain',
  },
  signatureText: {
    fontSize: 24,
    fontFamily: 'Times-Italic',
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
  },
  signatureDate: {
    fontSize: 9,
    color: '#666',
  },
  witnessSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  idVerificationSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#e8f4f8',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#999',
  },
  statusBadge: {
    position: 'absolute',
    top: 40,
    right: 40,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#e0f7e0',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2e7d32',
    textTransform: 'uppercase',
  },
})

interface ConsentPDFProps {
  clinicName: string
  templateName: string
  templateCategory: string
  documentNumber: string
  petName: string
  petSpecies: string
  petBreed: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  content: string
  fieldValues: Record<string, unknown>
  signatureData: string
  signedAt: string
  witnessName?: string
  witnessSignatureData?: string
  idVerificationType?: string
  idVerificationNumber?: string
  status: string
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    surgery: 'Cirugía',
    anesthesia: 'Anestesia',
    euthanasia: 'Eutanasia',
    boarding: 'Hospedaje',
    treatment: 'Tratamiento',
    vaccination: 'Vacunación',
    diagnostic: 'Diagnóstico',
    other: 'Otro',
  }
  return labels[category] || category
}

const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<h2>/g, '\n')
    .replace(/<\/h2>/g, '\n')
    .replace(/<h3>/g, '\n')
    .replace(/<\/h3>/g, '\n')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<strong>/g, '')
    .replace(/<\/strong>/g, '')
    .replace(/<em>/g, '')
    .replace(/<\/em>/g, '')
    .replace(/<li>/g, '  • ')
    .replace(/<\/li>/g, '\n')
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

export const ConsentPDF = ({
  clinicName,
  templateName,
  templateCategory,
  documentNumber,
  petName,
  petSpecies,
  petBreed,
  ownerName,
  ownerEmail,
  ownerPhone,
  content,
  fieldValues,
  signatureData,
  signedAt,
  witnessName,
  witnessSignatureData,
  idVerificationType,
  idVerificationNumber,
  status,
}: ConsentPDFProps) => {
  const plainContent = stripHtmlTags(content)
  const formattedDate = new Date(signedAt).toLocaleString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Status Badge */}
        {status === 'active' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Activo</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={{ fontSize: 9, color: '#666', marginTop: 4 }}>
            Documento N°: {documentNumber}
          </Text>
        </View>

        {/* Document Title */}
        <Text style={styles.documentTitle}>{templateName}</Text>
        <Text style={styles.documentCategory}>{getCategoryLabel(templateCategory)}</Text>

        {/* Pet Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información de la Mascota</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{petName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Especie:</Text>
            <Text style={styles.value}>{petSpecies}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Raza:</Text>
            <Text style={styles.value}>{petBreed}</Text>
          </View>
        </View>

        {/* Owner Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información del Propietario</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{ownerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{ownerEmail}</Text>
          </View>
          {ownerPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{ownerPhone}</Text>
            </View>
          )}
        </View>

        {/* Additional Fields */}
        {Object.keys(fieldValues).length > 0 && (
          <View style={styles.fieldValuesSection}>
            <Text style={styles.sectionTitle}>Información Adicional</Text>
            {Object.entries(fieldValues).map(([key, value], index) => (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{key}:</Text>
                <Text style={styles.fieldValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Document Content */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Contenido del Consentimiento</Text>
          <Text style={styles.contentText}>{plainContent}</Text>
        </View>

        {/* ID Verification */}
        {idVerificationType && idVerificationNumber && (
          <View style={styles.idVerificationSection}>
            <Text style={styles.sectionTitle}>Verificación de Identidad</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Tipo:</Text>
              <Text style={styles.value}>{idVerificationType.toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Número:</Text>
              <Text style={styles.value}>{idVerificationNumber}</Text>
            </View>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Firma del Propietario</Text>
          <View style={styles.signatureBox}>
            {signatureData.startsWith('data:image') ? (
              <Image src={signatureData} style={styles.signatureImage} />
            ) : (
              <Text style={styles.signatureText}>{signatureData}</Text>
            )}
            <Text style={styles.signatureName}>{ownerName}</Text>
            <Text style={styles.signatureDate}>Firmado el: {formattedDate}</Text>
          </View>
        </View>

        {/* Witness Signature */}
        {witnessName && witnessSignatureData && (
          <View style={styles.witnessSection}>
            <Text style={styles.sectionTitle}>Firma del Testigo</Text>
            <View style={styles.signatureBox}>
              {witnessSignatureData.startsWith('data:image') ? (
                <Image src={witnessSignatureData} style={styles.signatureImage} />
              ) : (
                <Text style={styles.signatureText}>{witnessSignatureData}</Text>
              )}
              <Text style={styles.signatureName}>{witnessName}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generado el: {new Date().toLocaleString('es-PY')}</Text>
          <Text style={styles.footerText}>{clinicName}</Text>
        </View>
      </Page>
    </Document>
  )
}
