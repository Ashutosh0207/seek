import { useState } from 'react';

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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    if (!firstName.trim()) {
      Alert.alert('Missing information', 'Please enter your first name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing information', 'Please enter your email.');
      return;
    }
    if (!password) {
      Alert.alert('Missing information', 'Please enter your password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { first_name: firstName.trim() } },
      });

      if (error) {
        Alert.alert('Sign up failed', error.message);
        return;
      }
      if (!data.user) {
        Alert.alert('Something went wrong', 'The account could not be created.');
        return;
      }

      Alert.alert('Account created', 'Your EventSpark account has been created.');
      router.replace('/profile-setup');
    } catch (error) {
      console.error(error);
      Alert.alert('Unexpected error', 'Something went wrong while creating your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing[6]) }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>JOIN THE ROOM</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start with the essentials. You’ll build your profile next.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="What should people call you?"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              editable={!loading}
              accessibilityLabel="First name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              editable={!loading}
              accessibilityLabel="Email address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void createAccount()}
              editable={!loading}
              accessibilityLabel="Password, at least 6 characters"
            />
            <Text style={styles.helperText}>Use 6 or more characters.</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, loading && styles.buttonDisabled, pressed && !loading && styles.primaryButtonPressed]}
            onPress={() => void createAccount()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color={colors.textPrimary} />
                <Text style={styles.primaryButtonText}>Creating account…</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.alternateAction}>
          <Text style={styles.alternateText}>Already have an account?</Text>
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
            onPress={() => router.push('/login')}
            disabled={loading}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: layout.screenGutter, paddingTop: spacing[12] },
  heading: { marginBottom: spacing[8] },
  eyebrow: { marginBottom: spacing[3], color: colors.primary, ...typography.label, letterSpacing: 1.6 },
  title: { color: colors.textPrimary, ...typography.screenTitle, letterSpacing: -0.5 },
  subtitle: { marginTop: spacing[3], color: colors.textSecondary, ...typography.body },
  form: { gap: spacing[5] },
  fieldGroup: { gap: spacing[2] },
  label: { color: colors.textSecondary, ...typography.label },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing[4], paddingVertical: spacing[3], color: colors.textPrimary, ...typography.body },
  helperText: { color: colors.textMuted, ...typography.caption },
  primaryButton: { minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', marginTop: spacing[1], borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing[5] },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.68 },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  primaryButtonText: { color: colors.textPrimary, ...typography.button },
  alternateAction: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: spacing[8], gap: spacing[1] },
  alternateText: { color: colors.textMuted, ...typography.supporting },
  linkButton: { minHeight: layout.minimumTouchTarget, justifyContent: 'center', paddingHorizontal: spacing[1] },
  linkButtonPressed: { opacity: 0.7 },
  linkText: { color: colors.primary, ...typography.label },
});
