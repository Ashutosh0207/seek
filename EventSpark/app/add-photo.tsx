import { useState } from 'react';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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

import { supabase } from '@/lib/supabase';
import { colors, layout, radii, spacing, typography } from '@/theme';

export default function AddPhotoScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [fileExtension, setFileExtension] = useState('jpg');
  const [loading, setLoading] = useState(false);

  const previewWidth = Math.min(Math.max(width - 80, 220), 320);

  function setSelectedImage(image: ImagePicker.ImagePickerAsset) {
    setImageUri(image.uri);

    if (image.mimeType) {
      setMimeType(image.mimeType);
    }

    setFileExtension(
      image.fileName?.split('.').pop()?.toLowerCase() ??
        image.mimeType?.split('/').pop() ??
        'jpg'
    );
  }

  async function chooseFromGallery() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'EventSpark needs access to your photos so you can select a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Could not open your photo gallery.');
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera permission required',
          'EventSpark needs camera access so you can take a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Could not open the camera.');
    }
  }

  async function uploadPhoto() {
    if (!imageUri) {
      Alert.alert('Photo required', 'Please choose or take a profile photo.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/signup');
        return;
      }

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const filePath = `${user.id}/profile.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ photo_path: filePath })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      Alert.alert('Profile complete', 'Your profile photo has been saved.');
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Photo upload error:', error);
      Alert.alert(
        'Upload failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong while uploading your photo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile photo',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>ONE LAST STEP</Text>
          <Text style={styles.title}>Add a recognizable photo</Text>
          <Text style={styles.subtitle}>
            A clear portrait helps people recognize you at the event.
          </Text>
        </View>

        <View
          style={[styles.photoFrame, { width: previewWidth }]}
          accessibilityLabel={imageUri ? 'Selected profile photo preview' : 'No profile photo selected'}
        >
          {imageUri ? (
            <Image
              source={imageUri}
              style={styles.photo}
              contentFit="cover"
              transition={180}
              accessible
              accessibilityLabel="Selected profile photo"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderAvatarText}>+</Text>
              </View>
              <Text style={styles.photoPlaceholderTitle}>Choose your best photo</Text>
              <Text style={styles.photoPlaceholderText}>Portrait photos work best.</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
              loading && styles.disabledButton,
            ]}
            onPress={() => void takePhoto()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Take a profile photo"
          >
            <Text style={styles.secondaryButtonText}>Take photo</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
              loading && styles.disabledButton,
            ]}
            onPress={() => void chooseFromGallery()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Choose a profile photo from your gallery"
          >
            <Text style={styles.secondaryButtonText}>Choose from gallery</Text>
          </Pressable>

          {imageUri ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.primaryButtonPressed,
                loading && styles.disabledButton,
              ]}
              onPress={() => void uploadPhoto()}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Save profile photo and continue"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.textPrimary} />
                  <Text style={styles.primaryButtonText}>Uploading…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Save and continue</Text>
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={styles.privacyCard}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>✓</Text>
          </View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Your photo stays private</Text>
            <Text style={styles.privacyText}>
              EventSpark only displays it according to your event participation settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[6],
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing[4],
  },
  intro: { gap: spacing[2] },
  eyebrow: { ...typography.label, color: colors.secondary, letterSpacing: 1.4 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  photoFrame: {
    aspectRatio: 4 / 5,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[6],
    backgroundColor: colors.secondarySoft,
  },
  placeholderAvatar: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  placeholderAvatarText: { fontSize: 34, lineHeight: 40, color: colors.secondary },
  photoPlaceholderTitle: { ...typography.bodyEmphasized, color: colors.textPrimary, textAlign: 'center' },
  photoPlaceholderText: { ...typography.supporting, color: colors.textSecondary, textAlign: 'center' },
  actions: { gap: spacing[3] },
  secondaryButton: {
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  secondaryButtonPressed: { borderColor: colors.borderStrong, backgroundColor: colors.surfacePressed },
  secondaryButtonText: { ...typography.button, color: colors.textPrimary },
  primaryButton: {
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: { ...typography.button, color: colors.textPrimary },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  disabledButton: { opacity: 0.65 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.secondarySoft,
  },
  lockBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  lockText: { ...typography.label, color: colors.success },
  privacyCopy: { flex: 1, gap: spacing[1] },
  privacyTitle: { ...typography.label, color: colors.textPrimary },
  privacyText: { ...typography.caption, color: colors.textSecondary },
});
