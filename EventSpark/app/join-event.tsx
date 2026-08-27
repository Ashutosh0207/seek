import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { router } from 'expo-router';

export default function JoinEventScreen() {
  const [permission, requestPermission] =
    useCameraPermissions();

  const [scanned, setScanned] =
    useState(false);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Loading camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Camera permission required
        </Text>

        <Text style={styles.text}>
          EventSpark needs camera access
          to scan the event QR code.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>
            Allow Camera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function isValidUuid(value: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
    return uuidRegex.test(value);
  }
  
  function handleBarcodeScanned({
    data,
  }: {
    data: string;
  }) {
    if (scanned) {
      return;
    }
  
    setScanned(true);
  
    console.log(
      'QR scanned:',
      data
    );
  
    if (!isValidUuid(data)) {
      Alert.alert(
        'Invalid Event QR',
        'This QR code is not a valid EventSpark event code.',
        [
          {
            text: 'Scan Again',
            onPress: () =>
              setScanned(false),
          },
        ]
      );
  
      return;
    }
  
    router.push({
      pathname: '/event-preview',
      params: {
        eventId: data,
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Scan Event QR
      </Text>

      <Text style={styles.text}>
        Scan the QR code displayed
        at the venue.
      </Text>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : handleBarcodeScanned
          }
        />
      </View>

      {scanned && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            setScanned(false)
          }
        >
          <Text
            style={styles.secondaryButtonText}
          >
            Scan Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 24,
    paddingTop: 70,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },

  text: {
    color: '#999999',
    marginTop: 10,
    marginBottom: 24,
    fontSize: 15,
  },

  cameraContainer: {
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
  },

  camera: {
    flex: 1,
  },

  button: {
    backgroundColor: '#FF3B81',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#18181F',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});