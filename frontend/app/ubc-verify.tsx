import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

type Step = 'email' | 'code';

export default function UBCVerifyScreen() {
  const insets = useSafeAreaInsets();
  const { fetchUser } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isUBCEmail = (addr: string) => {
    const domain = addr.toLowerCase().split('@').pop() || '';
    return domain === 'ubc.ca' || domain.endsWith('.ubc.ca');
  };

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isUBCEmail(trimmed)) {
      setError('Please enter a UBC email address (*.ubc.ca)');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.sendUBCVerifyOTP(trimmed);
      setStep('code');
      setResendCooldown(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.confirmUBCVerify(email.trim().toLowerCase(), code);
      await fetchUser();
      Alert.alert(
        'UBC Verified!',
        'Your UBC email has been verified. You now have a verified badge on your profile.',
        [{ text: 'Awesome!', onPress: () => router.back() }],
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.sendUBCVerifyOTP(email.trim().toLowerCase());
      setResendCooldown(60);
      setCode('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={20} color={Brand.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Verify UBC Email</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.content}>
          <View style={s.iconWrap}>
            <Feather name="shield" size={32} color={Brand.accent} />
          </View>

          {step === 'email' ? (
            <>
              <Text style={s.title}>Get your verified badge</Text>
              <Text style={s.subtitle}>
                Verify your UBC email to show others you're a confirmed UBC student
              </Text>

              <View style={s.field}>
                <Text style={s.label}>UBC Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="you@student.ubc.ca"
                  placeholderTextColor={Brand.secondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                disabled={!email.includes('@')}
                style={{ width: '100%', marginTop: Spacing.md }}
              />
            </>
          ) : (
            <>
              <Text style={s.title}>Enter verification code</Text>
              <Text style={s.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={s.email}>{email.trim().toLowerCase()}</Text>
              </Text>

              <TextInput
                style={s.codeInput}
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={Surfaces.border}
                autoFocus
              />

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Button
                title="Verify"
                variant="primary"
                size="lg"
                onPress={handleVerify}
                loading={isLoading}
                disabled={code.length !== 6}
                style={{ width: '100%', marginTop: Spacing.lg }}
              />

              <TouchableOpacity style={s.resendBtn} onPress={handleResend} disabled={resendCooldown > 0}>
                <Text style={[s.resendText, resendCooldown > 0 && s.resendDisabled]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Surfaces.background },
  container: { flex: 1, backgroundColor: Surfaces.background, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  iconWrap: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: `${Brand.accent}10`, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary, marginBottom: Spacing.sm },
  subtitle: {
    fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
  email: { fontFamily: Typography.fonts.h4, color: Brand.primary },
  field: { gap: 6, width: '100%' },
  label: { fontFamily: Typography.fonts.h4, fontSize: 13, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontFamily: Typography.fonts.body, fontSize: 16, color: Brand.primary,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16, height: 48,
  },
  codeInput: {
    fontFamily: Typography.fonts.code, fontSize: 32, color: Brand.primary,
    textAlign: 'center', letterSpacing: 12, width: '100%',
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16, height: 64,
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md, width: '100%', marginTop: Spacing.md },
  errorText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.error, textAlign: 'center' },
  resendBtn: { marginTop: Spacing.lg },
  resendText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.accent },
  resendDisabled: { color: Brand.secondary },
});
