'use client'

import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 11,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  clinicName: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ticketTitle: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  confirmationBadge: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  section: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    flex: 1,
    color: '#333',
  },
  servicesSection: {
    marginBottom: 15,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  serviceName: {
    fontWeight: 'bold',
    flex: 1,
  },
  serviceDuration: {
    width: 60,
    textAlign: 'right',
    color: '#666',
  },
  servicePrice: {
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    marginTop: 10,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    fontSize: 8,
    color: '#999',
  },
})

interface ServiceItem {
  name: string
  duration: number
  price: number
}

interface AppointmentTicketPDFProps {
  clinicName: string
  petName: string
  ownerName?: string
  date: string
  startTime: string
  endTime?: string
  services: ServiceItem[]
  totalDuration: number
  totalPrice: number
  confirmationNumber?: string
  notes?: string
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-PY')
}

export function AppointmentTicketPDF({
  clinicName,
  petName,
  ownerName,
  date,
  startTime,
  endTime,
  services,
  totalDuration,
  totalPrice,
  confirmationNumber,
  notes,
}: AppointmentTicketPDFProps) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.ticketTitle}>Comprobante de Cita</Text>
        </View>

        {/* Confirmation Badge */}
        <View style={styles.confirmationBadge}>
          <Text style={styles.confirmationText}>
            ✓ CITA CONFIRMADA
          </Text>
          {confirmationNumber && (
            <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              Nº {confirmationNumber}
            </Text>
          )}
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{petName}</Text>
          </View>
          {ownerName && (
            <View style={styles.row}>
              <Text style={styles.label}>Propietario:</Text>
              <Text style={styles.value}>{ownerName}</Text>
            </View>
          )}
        </View>

        {/* Schedule Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horario</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hora:</Text>
            <Text style={styles.value}>
              {startTime}{endTime ? ` - ${endTime}` : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duración:</Text>
            <Text style={styles.value}>{totalDuration} minutos</Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>
            {services.length > 1 ? 'Servicios Reservados' : 'Servicio Reservado'}
          </Text>
          {services.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>{service.duration} min</Text>
              <Text style={styles.servicePrice}>₲{formatPrice(service.price)}</Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Total Estimado:</Text>
            <Text style={styles.totalValue}>₲{formatPrice(totalPrice)}</Text>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={{ color: '#555' }}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Presenta este comprobante al llegar a la clínica</Text>
          <Text style={{ marginTop: 4 }}>
            Generado el {new Date().toLocaleDateString('es-PY')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
