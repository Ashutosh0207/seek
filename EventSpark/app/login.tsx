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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user was returned after login.');

      console.log('Logged in user:', data.user.id);
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : undefined;
      Alert.alert('Login failed', message ?? 'Please check your email and password.');
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
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Log in to your account</Text>
          <Text style={styles.subtitle}>Your next connection could already be at the event.</Text>
        </View>

        <View style={styles.form}>
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
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={() => void handleLogin()}
              editable={!loading}
              accessibilityLabel="Password"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, loading && styles.buttonDisabled, pressed && !loading && styles.primaryButtonPressed]}
            onPress={() => void handleLogin()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Log in"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color={colors.textPrimary} />
                <Text style={styles.primaryButtonText}>Logging in…</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Log in</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.alternateAction}>
          <Text style={styles.alternateText}>New to EventSpark?</Text>
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
            onPress={() => router.push('/signup')}
            disabled={loading}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>Create an account</Text>
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
