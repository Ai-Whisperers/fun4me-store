---
name: react-native-vet
description: React Native patterns for veterinary mobile apps including push notifications, offline-first data, QR scanning, camera integration, and mobile payments. Use when planning or building the Vete mobile app.
---

# React Native Veterinary App Patterns

## Overview

This skill covers React Native development patterns for building a mobile companion app for the Vete veterinary platform, with focus on pet owner features.

---

## 1. Project Structure

```
vete-mobile/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens (login, register)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── pets.tsx
│   │   ├── appointments.tsx
│   │   ├── store.tsx
│   │   └── profile.tsx
│   ├── pet/[id]/                 # Pet details
│   │   ├── index.tsx
│   │   ├── vaccines.tsx
│   │   ├── records.tsx
│   │   └── qr-tag.tsx
│   ├── appointment/[id].tsx
│   ├── booking/                  # Booking flow
│   │   ├── service.tsx
│   │   ├── date.tsx
│   │   ├── time.tsx
│   │   └── confirm.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── pets/                     # Pet-related components
│   ├── appointments/             # Appointment components
│   └── common/                   # Shared components
├── lib/
│   ├── api/                      # API client
│   ├── hooks/                    # Custom hooks
│   ├── store/                    # Zustand stores
│   ├── utils/                    # Utilities
│   └── notifications/            # Push notification handling
├── assets/                       # Images, fonts
└── app.json                      # Expo config
```

---

## 2. Push Notifications

### Expo Notifications Setup

```typescript
// lib/notifications/setup.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/api/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  });

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Citas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });

    await Notifications.setNotificationChannelAsync('vaccines', {
      name: 'Vacunas',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promociones',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token.data;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
  });
}
```

### Notification Handlers

```typescript
// lib/notifications/handlers.ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function setupNotificationListeners() {
  // Handle notification received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
    }
  );

  // Handle notification tap
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      switch (data.type) {
        case 'appointment_reminder':
          router.push(`/appointment/${data.appointmentId}`);
          break;
        case 'vaccine_due':
          router.push(`/pet/${data.petId}/vaccines`);
          break;
        case 'prescription_ready':
          router.push(`/pet/${data.petId}/records`);
          break;
        case 'order_update':
          router.push(`/orders/${data.orderId}`);
          break;
        default:
          router.push('/home');
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
```

### Notification Types

```typescript
// lib/notifications/types.ts
export interface VetNotification {
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
}

export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'vaccine_due'
  | 'vaccine_overdue'
  | 'prescription_ready'
  | 'lab_results_ready'
  | 'order_shipped'
  | 'order_delivered'
  | 'promotion';

export interface NotificationData {
  type: NotificationType;
  appointmentId?: string;
  petId?: string;
  orderId?: string;
  clinicId?: string;
}

// Notification templates (Spanish)
export const NOTIFICATION_TEMPLATES = {
  appointment_reminder_24h: {
    title: '⏰ Recordatorio de cita',
    body: '{{petName}} tiene cita mañana a las {{time}}',
  },
  appointment_reminder_1h: {
    title: '🔔 Cita en 1 hora',
    body: '{{petName}} tiene cita a las {{time}} en {{clinicName}}',
  },
  vaccine_due: {
    title: '💉 Vacuna pendiente',
    body: '{{petName}} necesita su vacuna de {{vaccineName}}',
  },
  prescription_ready: {
    title: '📋 Receta lista',
    body: 'La receta de {{petName}} está lista para retirar',
  },
  lab_results: {
    title: '🔬 Resultados disponibles',
    body: 'Los resultados de {{petName}} ya están disponibles',
  },
};
```

---

## 3. Offline-First Data

### MMKV Storage Setup

```typescript
// lib/storage/mmkv.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'vete-app-storage',
  encryptionKey: 'your-encryption-key', // For sensitive data
});

// Type-safe storage helpers
export const mmkvStorage = {
  getString: (key: string) => storage.getString(key),
  setString: (key: string, value: string) => storage.set(key, value),

  getObject: <T>(key: string): T | null => {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  },
  setObject: <T>(key: string, value: T) => {
    storage.set(key, JSON.stringify(value));
  },

  delete: (key: string) => storage.delete(key),
  clearAll: () => storage.clearAll(),
};
```

### Offline Pets Store

```typescript
// lib/store/pets-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage/mmkv';
import { Pet, Vaccine, MedicalRecord } from '@/lib/types';

interface PetsState {
  pets: Pet[];
  vaccines: Record<string, Vaccine[]>; // Keyed by petId
  records: Record<string, MedicalRecord[]>;
  lastSynced: string | null;

  // Actions
  setPets: (pets: Pet[]) => void;
  addPet: (pet: Pet) => void;
  updatePet: (petId: string, updates: Partial<Pet>) => void;
  setVaccines: (petId: string, vaccines: Vaccine[]) => void;
  setRecords: (petId: string, records: MedicalRecord[]) => void;
  setLastSynced: (date: string) => void;
}

export const usePetsStore = create<PetsState>()(
  persist(
    (set) => ({
      pets: [],
      vaccines: {},
      records: {},
      lastSynced: null,

      setPets: (pets) => set({ pets }),
      addPet: (pet) => set((state) => ({ pets: [...state.pets, pet] })),
      updatePet: (petId, updates) =>
        set((state) => ({
          pets: state.pets.map((p) =>
            p.id === petId ? { ...p, ...updates } : p
          ),
        })),
      setVaccines: (petId, vaccines) =>
        set((state) => ({
          vaccines: { ...state.vaccines, [petId]: vaccines },
        })),
      setRecords: (petId, records) =>
        set((state) => ({
          records: { ...state.records, [petId]: records },
        })),
      setLastSynced: (date) => set({ lastSynced: date }),
    }),
    {
      name: 'pets-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => mmkvStorage.getString(name) ?? null,
        setItem: (name, value) => mmkvStorage.setString(name, value),
        removeItem: (name) => mmkvStorage.delete(name),
      })),
    }
  )
);
```

### Sync Service

```typescript
// lib/sync/sync-service.ts
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/api/supabase';
import { usePetsStore } from '@/lib/store/pets-store';
import { useAppointmentsStore } from '@/lib/store/appointments-store';

class SyncService {
  private isSyncing = false;

  async syncAll(): Promise<void> {
    if (this.isSyncing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('Offline - skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      await Promise.all([
        this.syncPets(),
        this.syncAppointments(),
        this.syncVaccines(),
      ]);

      usePetsStore.getState().setLastSynced(new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncPets(): Promise<void> {
    const { data: pets, error } = await supabase
      .from('pets')
      .select('*')
      .order('name');

    if (!error && pets) {
      usePetsStore.getState().setPets(pets);
    }
  }

  private async syncAppointments(): Promise<void> {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, duration_minutes),
        pets (name, species)
      `)
      .gte('start_time', new Date().toISOString())
      .order('start_time');

    if (!error && appointments) {
      useAppointmentsStore.getState().setAppointments(appointments);
    }
  }

  private async syncVaccines(): Promise<void> {
    const pets = usePetsStore.getState().pets;

    for (const pet of pets) {
      const { data: vaccines, error } = await supabase
        .from('vaccines')
        .select('*')
        .eq('pet_id', pet.id)
        .order('administered_date', { ascending: false });

      if (!error && vaccines) {
        usePetsStore.getState().setVaccines(pet.id, vaccines);
      }
    }
  }
}

export const syncService = new SyncService();
```

---

## 4. QR Code Scanning

### QR Scanner Component

```typescript
// components/qr-scanner.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Parse QR data
    try {
      // Expected format: vete://pet/{petId} or vete://tag/{tagCode}
      const url = new URL(data);

      if (url.protocol === 'vete:') {
        const [, type, id] = url.pathname.split('/');

        switch (type) {
          case 'pet':
            router.push(`/pet/${id}`);
            break;
          case 'tag':
            handleTagScan(id);
            break;
          default:
            Alert.alert('Código no reconocido');
        }
      } else {
        onScan(data);
      }
    } catch {
      // Not a URL, treat as plain text
      onScan(data);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Necesitamos acceso a la cámara para escanear códigos QR
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay with scan frame */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Apuntá al código QR</Text>
      </View>
    </View>
  );
}

async function handleTagScan(tagCode: string) {
  // Look up tag and navigate to pet
  const { data: tag, error } = await supabase
    .from('qr_tags')
    .select('pet_id')
    .eq('code', tagCode)
    .eq('is_active', true)
    .single();

  if (tag?.pet_id) {
    router.push(`/pet/${tag.pet_id}`);
  } else {
    Alert.alert('Tag no encontrado', 'Este tag no está asociado a ninguna mascota');
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  message: {
    textAlign: 'center',
    padding: 20,
  },
});
```

---

## 5. Camera Integration (Pet Photos)

### Photo Capture Hook

```typescript
// lib/hooks/use-pet-photo.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/api/supabase';

interface UsePetPhotoOptions {
  petId: string;
  onSuccess?: (url: string) => void;
}

export function usePetPhoto({ petId, onSuccess }: UsePetPhotoOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Se necesita permiso para acceder a la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Se necesita permiso para acceder a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setIsUploading(true);
    setError(null);

    try {
      // Resize and compress image
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert to blob
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const filename = `${petId}/${Date.now()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(filename);

      // Update pet record
      await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      onSuccess?.(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    takePhoto,
    pickFromLibrary,
    isUploading,
    error,
  };
}
```

---

## 6. Mobile Payments (Paraguay)

### Bancard Mobile SDK Integration

```typescript
// lib/payments/bancard-mobile.ts
import { NativeModules, Platform } from 'react-native';

const { BancardModule } = NativeModules;

interface BancardPaymentRequest {
  amount: number;
  orderId: string;
  description: string;
}

interface BancardPaymentResult {
  success: boolean;
  transactionId?: string;
  authorizationCode?: string;
  error?: string;
}

export async function processBancardPayment(
  request: BancardPaymentRequest
): Promise<BancardPaymentResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('Bancard only available on mobile');
  }

  try {
    // Call native Bancard SDK
    const result = await BancardModule.processPayment({
      publicKey: process.env.BANCARD_PUBLIC_KEY,
      amount: request.amount.toFixed(2),
      currency: 'PYG',
      shopProcessId: request.orderId,
      description: request.description,
    });

    return {
      success: result.status === 'approved',
      transactionId: result.transactionId,
      authorizationCode: result.authorizationCode,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de pago',
    };
  }
}
```

### Payment Screen

```typescript
// app/checkout/payment.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { processBancardPayment } from '@/lib/payments/bancard-mobile';
import { formatGuarani } from '@/lib/utils/currency';

export default function PaymentScreen() {
  const { orderId, total } = useLocalSearchParams<{ orderId: string; total: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Seleccioná un método de pago');
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedMethod === 'card') {
        const result = await processBancardPayment({
          amount: parseFloat(total),
          orderId,
          description: `Pedido #${orderId}`,
        });

        if (result.success) {
          router.replace(`/checkout/success?orderId=${orderId}`);
        } else {
          Alert.alert('Pago rechazado', result.error);
        }
      } else if (selectedMethod === 'cash') {
        // Mark order as pending cash payment
        await updateOrderPaymentMethod(orderId, 'cash');
        router.replace(`/checkout/success?orderId=${orderId}&method=cash`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Método de Pago</Text>
      <Text style={styles.total}>Total: {formatGuarani(parseFloat(total))}</Text>

      {/* Payment methods */}
      <TouchableOpacity
        style={[styles.method, selectedMethod === 'card' && styles.methodSelected]}
        onPress={() => setSelectedMethod('card')}
      >
        <Text style={styles.methodIcon}>💳</Text>
        <View>
          <Text style={styles.methodTitle}>Tarjeta</Text>
          <Text style={styles.methodDesc}>Débito o crédito (Bancard)</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.method, selectedMethod === 'cash' && styles.methodSelected]}
        onPress={() => setSelectedMethod('cash')}
      >
        <Text style={styles.methodIcon}>💵</Text>
        <View>
          <Text style={styles.methodTitle}>Efectivo</Text>
          <Text style={styles.methodDesc}>Pagar al retirar</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        <Text style={styles.payButtonText}>
          {isProcessing ? 'Procesando...' : 'Pagar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 7. App Configuration

### app.json (Expo)

```json
{
  "expo": {
    "name": "Vete",
    "slug": "vete-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "app.vete.mobile",
      "infoPlist": {
        "NSCameraUsageDescription": "Vete necesita acceso a la cámara para tomar fotos de tu mascota y escanear códigos QR.",
        "NSPhotoLibraryUsageDescription": "Vete necesita acceso a tu galería para seleccionar fotos de tu mascota."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "app.vete.mobile",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.VIBRATE"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Permitir a Vete acceder a tu cámara."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Permitir a Vete acceder a tus fotos."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF6B6B"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

*Reference: Expo documentation, React Native best practices*
