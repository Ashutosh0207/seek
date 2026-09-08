import { useEffect, useState } from 'react';

import { router, Stack } from 'expo-router';
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

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error);
      return;
    }

    if (!user) {
      Alert.alert('Not logged in', 'Please create an account or log in again.');
      router.replace('/signup');
      return;
    }

    setFirstName(user.user_metadata?.first_name ?? '');
  }

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadUser();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, []);

  async function saveProfile() {
    if (!firstName.trim()) {
      setValidationError('Enter your first name to continue.');
      return;
    }

    if (!dateOfBirth.trim()) {
      setValidationError('Enter your date of birth to continue.');
      return;
    }

    if (!gender) {
      setValidationError('Select your gender to continue.');
      return;
    }

    if (!interestedIn) {
      setValidationError('Select who you are interested in to continue.');
      return;
    }

    try {
      setLoading(true);
      setValidationError(null);

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

      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        first_name: firstName.trim(),
        date_of_birth: dateOfBirth.trim(),
        gender,
        interested_in: interestedIn,
        about_me: aboutMe.trim() || null,
      });

      if (error) {
        throw error;
      }

      Alert.alert('Profile created', 'Your profile information has been saved.');
      router.replace('/add-photo');
    } catch (error: unknown) {
      console.error('Profile error:', error);
      Alert.alert(
        'Profile creation failed',
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
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
            <Text style={styles.title}>Tell people who you are</Text>
            <Text style={styles.subtitle}>
              Your profile is reusable and becomes visible when you join an
              EventSpark Social Room.
            </Text>
          </View>

          {validationError ? (
            <View style={styles.validationCard} accessibilityLiveRegion="assertive">
              <Text selectable style={styles.validationText}>{validationError}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Alex"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoComplete="name-given"
                maxLength={50}
                accessibilityLabel="First name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of birth</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="2000-12-25"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="numeric"
                maxLength={10}
                accessibilityLabel="Date of birth"
                accessibilityHint="Enter your date in year month day format"
              />
              <Text style={styles.helper}>Use YYYY-MM-DD</Text>
            </View>

            <View style={styles.field} accessibilityRole="radiogroup">
              <Text style={styles.label}>Gender</Text>
              <View style={styles.optionsContainer}>
                <OptionButton label="Man" selected={gender === 'man'} onPress={() => setGender('man')} />
                <OptionButton label="Woman" selected={gender === 'woman'} onPress={() => setGender('woman')} />
                <OptionButton label="Non-binary" selected={gender === 'non_binary'} onPress={() => setGender('non_binary')} />
              </View>
            </View>

            <View style={styles.field} accessibilityRole="radiogroup">
              <Text style={styles.label}>Interested in</Text>
              <View style={styles.optionsContainer}>
                <OptionButton label="Men" selected={interestedIn === 'men'} onPress={() => setInterestedIn('men')} />
                <OptionButton label="Women" selected={interestedIn === 'women'} onPress={() => setInterestedIn('women')} />
                <OptionButton label="Everyone" selected={interestedIn === 'everyone'} onPress={() => setInterestedIn('everyone')} />
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
                placeholder="Share something that makes starting a conversation easy"
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
              styles.primaryButton,
              pressed && !loading && styles.primaryButtonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => void saveProfile()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue to profile photo"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: spacing[5],
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing[4],
  },
  intro: { gap: spacing[2] },
  eyebrow: { ...typography.label, color: colors.secondary, letterSpacing: 1.4 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  validationCard: {
    padding: spacing[4],
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
  },
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
  helper: { ...typography.caption, color: colors.textMuted },
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
  primaryButton: {
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { ...typography.button, color: colors.textPrimary },
});
