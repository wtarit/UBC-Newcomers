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

export default function EmailLoginScreen() {
  const insets = useSafeAreaInsets();
  const { sendOTP, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');

  const canSubmit = email.includes('@') && email.includes('.');

  const handleSendCode = async () => {
    clearError();
    const success = await sendOTP(email.trim().toLowerCase());
    if (success) {
      router.push({ pathname: '/(auth)/otp-verify', params: { email: email.trim().toLowerCase() } });
    }
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

        <Text style={s.title}>Continue with email</Text>
        <Text style={s.subtitle}>We'll send a verification code to your email</Text>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor={Brand.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />
          </View>

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Send Code"
            variant="primary"
            size="lg"
            onPress={handleSendCode}
            loading={isLoading}
            disabled={!canSubmit}
            style={{ width: '100%', marginTop: Spacing.md }}
          />
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
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md },
  errorText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.error },
});
