import { useState } from 'react';

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, spacing, typography } from '@/theme';

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function JoinEventScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scannerSize = Math.min(
    width - layout.screenGutter * 2,
    height * 0.5,
    440
  );

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    if (!isValidUuid(data)) {
      Alert.alert(
        'Invalid Event QR',
        'This QR code is not a valid EventSpark event code.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    router.push({ pathname: '/event-preview', params: { eventId: data } });
  }

  if (!permission) {
    return (
      <View style={styles.centerState}>
        <Stack.Screen options={{ title: 'Scan event', headerShadowVisible: false, headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Preparing the camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.permissionContent, { paddingBottom: Math.max(insets.bottom, spacing[6]) }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Stack.Screen options={{ title: 'Scan event', headerShadowVisible: false, headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }} />
        <View style={styles.permissionIcon} accessibilityElementsHidden>
          <Text style={styles.permissionIconText}>▣</Text>
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          EventSpark uses the camera only to read the event QR code displayed at the venue.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => void requestPermission()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Allow camera access</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.scannerScreen, { paddingBottom: Math.max(insets.bottom, spacing[5]) }]}>
      <Stack.Screen options={{ title: 'Scan event', headerShadowVisible: false, headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }} />

      <View style={styles.instructions}>
        <Text style={styles.scannerTitle}>Find the event QR code</Text>
        <Text style={styles.scannerText}>Position the entire code inside the frame.</Text>
      </View>

      <View
        style={[styles.cameraFrame, { width: scannerSize, height: scannerSize }]}
        accessibilityLabel="QR code camera scanner"
      >
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.cameraScrim} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerTopLeft]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerTopRight]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerBottomLeft]} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerBottomRight]} pointerEvents="none" />
        {scanned && (
          <View style={styles.scannedOverlay}>
            <ActivityIndicator color={colors.textPrimary} />
            <Text style={styles.scannedText}>Code detected</Text>
          </View>
        )}
      </View>

      <View style={styles.scannerFooter}>
        <Text style={styles.privacyText}>No photo or video is saved.</Text>
        {scanned && (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => setScanned(false)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Scan again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], backgroundColor: colors.background, padding: layout.screenGutter },
  stateText: { color: colors.textSecondary, ...typography.supporting },
  permissionContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenGutter },
  permissionIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.primarySoft },
  permissionIconText: { color: colors.primary, fontSize: 34, lineHeight: 40 },
  permissionTitle: { paddingTop: spacing[6], color: colors.textPrimary, textAlign: 'center', ...typography.sectionTitle },
  permissionText: { maxWidth: 440, paddingTop: spacing[3], color: colors.textSecondary, textAlign: 'center', ...typography.body },
  primaryButton: { width: '100%', minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', marginTop: spacing[8], borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing[5] },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.textPrimary, ...typography.button },
  scannerScreen: { flex: 1, alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: layout.screenGutter },
  instructions: { width: '100%', alignItems: 'center', paddingTop: spacing[6], paddingBottom: spacing[5], gap: spacing[2] },
  scannerTitle: { color: colors.textPrimary, textAlign: 'center', ...typography.sectionTitle },
  scannerText: { color: colors.textSecondary, textAlign: 'center', ...typography.supporting },
  cameraFrame: { overflow: 'hidden', maxWidth: '100%', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.lg, backgroundColor: colors.surface, borderCurve: 'continuous' },
  camera: { flex: 1 },
  cameraScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 18, borderColor: colors.overlay },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: colors.primary },
  cornerTopLeft: { top: spacing[5], left: spacing[5], borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radii.sm },
  cornerTopRight: { top: spacing[5], right: spacing[5], borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radii.sm },
  cornerBottomLeft: { bottom: spacing[5], left: spacing[5], borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radii.sm },
  cornerBottomRight: { right: spacing[5], bottom: spacing[5], borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: radii.sm },
  scannedOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], backgroundColor: colors.scrimStrong },
  scannedText: { color: colors.textPrimary, ...typography.bodyEmphasized },
  scannerFooter: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  privacyText: { color: colors.textMuted, ...typography.supporting },
  secondaryButton: { minHeight: layout.compactButtonHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: spacing[6] },
  secondaryButtonPressed: { backgroundColor: colors.surfacePressed },
  secondaryButtonText: { color: colors.textPrimary, ...typography.label },
});
