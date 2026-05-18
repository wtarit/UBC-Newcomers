import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { Feather } from '@expo/vector-icons';
import * as firebase from '@/services/firebase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.includes('@') && password.length > 0;

  const handleLogin = async () => {
    clearError();
    const normalizedEmail = email.trim();
    const success = await login(normalizedEmail, password);
    if (success && !firebase.isEmailVerified()) {
      router.replace({ pathname: '/(auth)/verify', params: { email: normalizedEmail } });
    }
    // Navigation is handled by the root layout guard
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[s.container, { paddingTop: insets.top }]}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Brand.primary} />
        </TouchableOpacity>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Log in to your UBC Newcomers account</Text>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@student.ubc.ca"
              placeholderTextColor={Brand.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0 }]}
                placeholder="Your password"
                placeholderTextColor={Brand.secondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Brand.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Log In"
            variant="primary"
            size="lg"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!canSubmit}
            style={{ width: '100%', marginTop: Spacing.md }}
          />

          <TouchableOpacity style={s.forgotBtn} onPress={() => {}}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
            <Text style={s.footerLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Surfaces.background },
  container: { flex: 1, backgroundColor: Surfaces.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl,
  },
  title: { fontFamily: Typography.fonts.h1, fontSize: 26, color: Brand.primary, marginBottom: Spacing.xs },
  subtitle: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, marginBottom: Spacing.xl },
  form: { gap: Spacing.lg },
  field: { gap: 6 },
  label: { fontFamily: Typography.fonts.h4, fontSize: 13, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontFamily: Typography.fonts.body, fontSize: 16, color: Brand.primary,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16, height: 48,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16,
  },
  eyeBtn: { padding: 8 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md },
  errorText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.error },
  forgotBtn: { alignSelf: 'center', marginTop: Spacing.sm },
  forgotText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.accent },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  footerLink: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.accent },
});
