import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { Feather } from '@expo/vector-icons';
import * as firebase from '@/services/firebase';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const insets = useSafeAreaInsets();
  const { error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleContinue = async () => {
    clearError();
    setIsLoading(true);
    try {
      const user = firebase.getCurrentUser();
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          router.replace('/(auth)/login');
          return;
        }
      }
      useAuthStore.setState({ error: 'Email not verified yet. Please check your inbox and click the link.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await firebase.resendVerificationEmail();
      setResent(true);
    } catch {
      useAuthStore.setState({ error: 'Failed to resend verification email' });
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
        <Text style={s.title}>Check your email</Text>
        <Text style={s.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={s.email}>{email}</Text>
          {'\n\n'}Click the link to verify your account, then tap Continue below.
        </Text>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title="Continue"
          variant="primary"
          size="lg"
          onPress={handleContinue}
          loading={isLoading}
          style={{ width: '100%', marginTop: Spacing.lg }}
        />

        <TouchableOpacity style={s.resendBtn} onPress={handleResend}>
          <Text style={s.resendText}>
            {resent ? 'Verification email resent!' : "Didn't receive it? Resend"}
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
  subtitle: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  email: { fontFamily: Typography.fonts.h4, color: Brand.primary },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: Spacing.md, width: '100%' },
  errorText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.error, textAlign: 'center' },
  resendBtn: { marginTop: Spacing.lg },
  resendText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.accent },
});
