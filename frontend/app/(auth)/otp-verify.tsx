import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { Feather } from '@expo/vector-icons';

export default function OTPVerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const insets = useSafeAreaInsets();
  const { verifyOTP, sendOTP, isLoading, error, clearError, otpExpiresAt } = useAuthStore();
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (otpExpiresAt) {
        const remaining = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
      if (resendCooldown > 0) {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiresAt, resendCooldown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleVerify = useCallback(async () => {
    if (!email || code.length !== 6) return;
    clearError();
    const result = await verifyOTP(email, code);
    if (result.success) {
      if (result.ubcVerified) {
        Alert.alert(
          'UBC Verified!',
          'Your UBC email has been verified. You\'ll have a verified badge on your profile.',
          [{ text: 'Awesome!', onPress: () => {} }],
        );
      }
      if (result.isNewUser) {
        router.replace('/(auth)/onboarding');
      }
      // Returning user: root layout guard navigates to (tabs)
    }
  }, [email, code, clearError, verifyOTP]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    clearError();
    const success = await sendOTP(email);
    if (success) {
      setResendCooldown(60);
      setCode('');
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color={Brand.primary} />
      </TouchableOpacity>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Feather name="mail" size={32} color={Brand.accent} />
        </View>
        <Text style={s.title}>Enter verification code</Text>
        <Text style={s.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={s.email}>{email}</Text>
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

        {timeLeft > 0 && (
          <Text style={s.timer}>Code expires in {formatTime(timeLeft)}</Text>
        )}

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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background, paddingHorizontal: Spacing.lg },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md,
  },
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
  codeInput: {
    fontFamily: Typography.fonts.code, fontSize: 32, color: Brand.primary,
    textAlign: 'center', letterSpacing: 12, width: '100%',
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16, height: 64,
  },
  timer: {
    fontFamily: Typography.fonts.caption, fontSize: 13, color: Brand.secondary,
    marginTop: Spacing.sm,
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md, width: '100%', marginTop: Spacing.md },
  errorText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.error, textAlign: 'center' },
  resendBtn: { marginTop: Spacing.lg },
  resendText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.accent },
  resendDisabled: { color: Brand.secondary },
});
