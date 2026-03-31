import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  clinicSubtitle: {
    fontSize: 10,
    marginTop: 4,
    color: '#555',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: 'heavy',
  },
  patientSection: {
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 80,
    fontWeight: 'bold',
    color: '#444',
  },
  value: {
    flex: 1,
  },
  drugsSection: {
    marginBottom: 30,
  },
  drugRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drugName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  drugDose: {
    fontSize: 12,
    marginBottom: 2,
  },
  drugInstructions: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#333',
  },
  notesSection: {
    marginBottom: 40,
    border: 1,
    borderColor: '#eee',
    padding: 10,
    minHeight: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  signatureArea: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
  },
  qrArea: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#eee',
    marginBottom: 4,
  },
  hash: {
    fontSize: 8,
    color: '#999',
    marginTop: 4,
  },
})

interface PrescriptionPDFProps {
  clinicName: string
  clinicAddress?: string
  patientName: string
  ownerName: string
  date: string
  drugs: Array<{ name: string; dose: string; instructions: string }>
  notes?: string
  vetName: string
  signatureHash?: string
}

export const PrescriptionPDF = ({
  clinicName,
  clinicAddress,
  patientName,
  ownerName,
  date,
  drugs,
  notes,
  vetName,
  signatureHash,
}: PrescriptionPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.clinicSubtitle}>{clinicAddress || 'Veterinary Clinic'}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 30, color: '#ddd' }}>Rx</Text>
        </View>
      </View>

      <Text style={styles.title}>Receta Médica Veterinaria</Text>

      {/* Patient Info */}
      <View style={styles.patientSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Paciente:</Text>
          <Text style={styles.value}>{patientName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Propietario:</Text>
          <Text style={styles.value}>{ownerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{date}</Text>
        </View>
      </View>

      {/* Drugs */}
      <View style={styles.drugsSection}>
        {drugs.map((drug, i) => (
          <View key={i} style={styles.drugRow}>
            <Text style={styles.drugName}>{drug.name}</Text>
            <Text style={styles.drugDose}>Dosis: {drug.dose}</Text>
            <Text style={styles.drugInstructions}>Indicaciones: {drug.instructions}</Text>
          </View>
        ))}
      </View>

      {/* Notes */}
      {notes && (
        <View style={styles.notesSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notas Adicionales:</Text>
          <Text>{notes}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.qrArea}>
          {/* In real app, render actual QR code image here */}
          <View style={styles.qrPlaceholder} />
          <Text style={{ fontSize: 8 }}>Verificar Autenticidad</Text>
        </View>

        <View style={styles.signatureArea}>
          <View style={{ height: 40 }} /> {/* Space for physical signature if printed */}
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Dr/a. {vetName}</Text>
          <Text style={styles.signatureLabel}>Médico Veterinario</Text>
        </View>
      </View>

      {signatureHash && (
        <Text style={{ position: 'absolute', bottom: 10, left: 30, fontSize: 8, color: '#ccc' }}>
          Digital ID: {signatureHash}
        </Text>
      )}
    </Page>
  </Document>
)
