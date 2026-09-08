import { useCallback, useEffect, useState } from 'react';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, layout, radii, spacing, typography } from '@/theme';

type Profile = {
  user_id: string;
  first_name: string;
  gender: string;
  interested_in: string | null;
  about_me: string | null;
  photo_path: string | null;
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const INTEREST_OPTIONS = ['Male', 'Female', 'Everyone'];

type OptionButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionButton,
        selected && styles.optionButtonSelected,
        pressed && !selected && styles.optionButtonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const loadSignedPhotoUrl = useCallback(async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(path, 300);

      if (error) {
        throw error;
      }

      setPhotoUrl(data.signedUrl);
    } catch (error) {
      console.error('Signed URL error:', error);
      setPhotoUrl(null);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('You must be logged in.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          gender,
          interested_in,
          about_me,
          photo_path
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      const profile = data as Profile;
      setFirstName(profile.first_name ?? '');
      setGender(profile.gender ?? '');
      setInterestedIn(profile.interested_in ?? '');
      setAboutMe(profile.about_me ?? '');
      setPhotoPath(profile.photo_path);

      if (profile.photo_path) {
        await loadSignedPhotoUrl(profile.photo_path);
      } else {
        setPhotoUrl(null);
      }
    } catch (error: unknown) {
      console.error('Load profile error:', error);
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loadSignedPhotoUrl]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [loadProfile]);

  async function chooseAndUploadPhoto() {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission required',
          'EventSpark needs access to your photos so you can choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      await uploadPhoto(
        result.assets[0].uri,
        result.assets[0].mimeType ?? 'image/jpeg'
      );
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Could not select the photo.');
    }
  }

  async function uploadPhoto(uri: string, mimeType: string) {
    try {
      setPhotoUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('You must be logged in.');
      }

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      let extension = 'jpg';

      if (mimeType === 'image/png') {
        extension = 'png';
      } else if (mimeType === 'image/webp') {
        extension = 'webp';
      }

      const newPhotoPath = `${user.id}/profile-${Date.now()}.${extension}`;
      const oldPhotoPath = photoPath;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(newPhotoPath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ photo_path: newPhotoPath })
        .eq('user_id', user.id);

      if (profileError) {
        await supabase.storage.from('profile-photos').remove([newPhotoPath]);
        throw profileError;
      }

      setPhotoPath(newPhotoPath);
      await loadSignedPhotoUrl(newPhotoPath);

      if (oldPhotoPath && oldPhotoPath !== newPhotoPath) {
        const { error: deleteOldError } = await supabase.storage
          .from('profile-photos')
          .remove([oldPhotoPath]);

        if (deleteOldError) {
          console.warn('Old photo delete error:', deleteOldError);
        }
      }

      Alert.alert('Photo updated', 'Your profile photo has been updated.');
    } catch (error) {
      console.error('Upload photo error:', error);
      Alert.alert('Upload failed', 'Could not update your profile photo.');
    } finally {
      setPhotoUploading(false);
    }
  }

  function confirmDeletePhoto() {
    if (!photoPath) {
      return;
    }

    Alert.alert('Delete photo?', 'Your profile photo will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deletePhoto(),
      },
    ]);
  }

  async function deletePhoto() {
    try {
      if (!photoPath) {
        return;
      }

      setPhotoDeleting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('You must be logged in.');
      }

      const pathToDelete = photoPath;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ photo_path: null })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      setPhotoPath(null);
      setPhotoUrl(null);

      const { error: storageError } = await supabase.storage
        .from('profile-photos')
        .remove([pathToDelete]);

      if (storageError) {
        console.warn('Photo Storage delete error:', storageError);
      }

      Alert.alert('Photo deleted', 'Your profile photo has been removed.');
    } catch (error) {
      console.error('Delete photo error:', error);
      Alert.alert('Delete failed', 'Could not delete your profile photo.');
    } finally {
      setPhotoDeleting(false);
    }
  }

  async function saveProfile() {
    const trimmedFirstName = firstName.trim();
    const trimmedAboutMe = aboutMe.trim();

    if (!trimmedFirstName) {
      setValidationError('First name is required.');
      return;
    }

    if (!gender) {
      setValidationError('Select your gender before saving.');
      return;
    }

    if (!interestedIn) {
      setValidationError('Select who you are interested in before saving.');
      return;
    }

    try {
      setSaving(true);
      setValidationError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('You must be logged in.');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: trimmedFirstName,
          gender,
          interested_in: interestedIn,
          about_me: trimmedAboutMe || null,
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  }

  const photoBusy = photoUploading || photoDeleting;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      {loading ? (
        <StateScreen
          bottomInset={insets.bottom}
          title="Loading your profile"
          message="Getting your details ready…"
          loading
        />
      ) : loadError ? (
        <StateScreen
          bottomInset={insets.bottom}
          title="Couldn’t load your profile"
          message={loadError}
          onRetry={() => void loadProfile()}
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[
              styles.container,
              { paddingBottom: insets.bottom + spacing[8] },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>YOUR PROFILE</Text>
              <Text style={styles.title}>Make a great first impression</Text>
              <Text style={styles.subtitle}>
                Update what people see when you join a Social Room.
              </Text>
            </View>

            <View style={styles.photoCard}>
              <Text style={styles.sectionTitle}>Profile photo</Text>
              {photoUrl ? (
                <Image
                  source={photoUrl}
                  style={styles.profilePhoto}
                  contentFit="cover"
                  cachePolicy="memory"
                  transition={180}
                  accessible
                  accessibilityLabel="Your current profile photo"
                />
              ) : (
                <View style={styles.photoPlaceholder} accessibilityLabel="No profile photo">
                  <Text style={styles.photoPlaceholderText}>
                    {firstName.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}

              <View style={styles.photoActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.photoButton,
                    pressed && !photoBusy && styles.secondaryButtonPressed,
                    photoBusy && styles.disabledButton,
                  ]}
                  disabled={photoBusy}
                  onPress={() => void chooseAndUploadPhoto()}
                  accessibilityRole="button"
                  accessibilityLabel={photoPath ? 'Replace profile photo' : 'Add profile photo'}
                  accessibilityState={{ disabled: photoBusy, busy: photoUploading }}
                >
                  {photoUploading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.photoButtonText}>
                      {photoPath ? 'Replace photo' : 'Add photo'}
                    </Text>
                  )}
                </Pressable>

                {photoPath ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.deletePhotoButton,
                      pressed && styles.deletePhotoButtonPressed,
                      photoBusy && styles.disabledButton,
                    ]}
                    disabled={photoBusy}
                    onPress={confirmDeletePhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Delete profile photo"
                    accessibilityState={{ disabled: photoBusy, busy: photoDeleting }}
                  >
                    {photoDeleting ? (
                      <ActivityIndicator color={colors.danger} />
                    ) : (
                      <Text style={styles.deletePhotoText}>Delete</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.photoPrivacyText}>
                Stored privately and displayed with a temporary secure link.
              </Text>
            </View>

            {validationError ? (
              <View style={styles.validationCard} accessibilityLiveRegion="assertive">
                <Text selectable style={styles.validationText}>{validationError}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Profile details</Text>
              <View style={styles.field}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoComplete="name-given"
                  maxLength={50}
                  accessibilityLabel="First name"
                />
              </View>

              <View style={styles.field} accessibilityRole="radiogroup">
                <Text style={styles.label}>Gender</Text>
                <View style={styles.optionsContainer}>
                  {GENDER_OPTIONS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option}
                      selected={gender === option}
                      onPress={() => setGender(option)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field} accessibilityRole="radiogroup">
                <Text style={styles.label}>Interested in</Text>
                <View style={styles.optionsContainer}>
                  {INTEREST_OPTIONS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option}
                      selected={interestedIn === option}
                      onPress={() => setInterestedIn(option)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>About me</Text>
                  <Text style={styles.characterCount}>{aboutMe.length}/500</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.aboutInput]}
                  value={aboutMe}
                  onChangeText={setAboutMe}
                  placeholder="Tell people a little about yourself"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  accessibilityLabel="About me"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !saving && !photoBusy && styles.saveButtonPressed,
                (saving || photoBusy) && styles.disabledButton,
              ]}
              onPress={() => void saveProfile()}
              disabled={saving || photoBusy}
              accessibilityRole="button"
              accessibilityLabel="Save profile changes"
              accessibilityState={{ disabled: saving || photoBusy, busy: saving }}
            >
              {saving ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving || photoBusy}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing profile"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

type StateScreenProps = {
  bottomInset: number;
  title: string;
  message: string;
  loading?: boolean;
  onRetry?: () => void;
};

function StateScreen({ bottomInset, title, message, loading = false, onRetry }: StateScreenProps) {
  return (
    <View style={[styles.stateScreen, { paddingBottom: bottomInset + spacing[6] }]} accessibilityLiveRegion="polite">
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Text style={styles.errorIconText}>!</Text>
        )}
      </View>
      <Text selectable style={styles.stateTitle}>{title}</Text>
      <Text selectable style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.saveButtonPressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading your profile again"
        >
          <Text style={styles.saveButtonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[5],
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing[4],
  },
  intro: { gap: spacing[2] },
  eyebrow: { ...typography.label, color: colors.secondary, letterSpacing: 1.4 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  sectionTitle: { ...typography.cardTitle, color: colors.textPrimary },
  photoCard: {
    alignItems: 'center',
    gap: spacing[4],
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  profilePhoto: { width: 176, height: 220, borderRadius: radii.lg },
  photoPlaceholder: {
    width: 176,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.secondarySoft,
  },
  photoPlaceholderText: { fontSize: 48, lineHeight: 56, fontWeight: '700', color: colors.textSecondary },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing[2] },
  photoButton: {
    minHeight: layout.compactButtonHeight,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  secondaryButtonPressed: { backgroundColor: colors.surfacePressed, borderColor: colors.borderStrong },
  photoButtonText: { ...typography.label, color: colors.textPrimary },
  deletePhotoButton: {
    minHeight: layout.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
  },
  deletePhotoButtonPressed: { backgroundColor: colors.primarySoft },
  deletePhotoText: { ...typography.label, color: colors.danger },
  photoPrivacyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  validationCard: { padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.primarySoft },
  validationText: { ...typography.supporting, color: colors.danger },
  formCard: {
    gap: spacing[6],
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  field: { gap: spacing[2] },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  label: { ...typography.label, color: colors.textPrimary },
  characterCount: { ...typography.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  input: {
    ...typography.body,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing[4],
    paddingVertical: 13,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  aboutInput: { minHeight: 128 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  optionButton: {
    minHeight: layout.compactButtonHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  optionButtonPressed: { backgroundColor: colors.surfacePressed },
  optionButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { ...typography.label, color: colors.textSecondary },
  optionTextSelected: { color: colors.primary },
  saveButton: {
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  saveButtonPressed: { backgroundColor: colors.primaryPressed },
  saveButtonText: { ...typography.button, color: colors.textPrimary },
  disabledButton: { opacity: 0.6 },
  cancelButton: { minHeight: layout.compactButtonHeight, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { ...typography.bodyEmphasized, color: colors.textSecondary },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.background,
  },
  stateIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  errorIconText: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.danger },
  stateTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  stateText: { ...typography.supporting, maxWidth: 360, color: colors.textSecondary, textAlign: 'center' },
  retryButton: {
    minWidth: 160,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: spacing[2],
  },
});
