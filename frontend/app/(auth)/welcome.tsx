import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const handleGoogle = async () => {
    await signInWithGoogle();
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.hero}>
        <View style={s.iconWrap}>
          <Feather name="map-pin" size={48} color={Brand.accent} />
        </View>
        <Text style={s.title}>UBC Newcomers</Text>
        <Text style={s.subtitle}>
          Explore campus, meet people nearby, and build your community at UBC.
        </Text>
      </View>

      <View style={s.features}>
        <FeatureRow icon="map" text="Discover 12+ campus zones and earn points" />
        <FeatureRow icon="users" text="Find people nearby with shared interests" />
        <FeatureRow icon="zap" text="AI-powered matching based on your profile" />
      </View>

      <View style={s.actions}>
        {error && (
          <Text style={s.error} onPress={clearError}>{error}</Text>
        )}
        <Button
          title="Continue with Google"
          variant="primary"
          size="lg"
          onPress={handleGoogle}
          loading={isLoading}
          style={{ width: '100%' }}
        />
        <Button
          title="Continue with Email"
          variant="ghost"
          size="lg"
          onPress={() => router.push('/(auth)/email-login')}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.featureRow}>
      <View style={s.featureIcon}>
        <Feather name={icon as any} size={20} color={Brand.accent} />
      </View>
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background, paddingHorizontal: Spacing.lg },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  iconWrap: {
    width: 96, height: 96, borderRadius: Radius.xl,
    backgroundColor: `${Brand.accent}10`, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontFamily: Typography.fonts.h1, fontSize: 28, color: Brand.primary, marginBottom: Spacing.sm },
  subtitle: {
    fontFamily: Typography.fonts.body, fontSize: 16, color: Brand.secondary,
    textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.lg,
  },
  features: { gap: Spacing.lg, marginBottom: 'auto' as any },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: `${Brand.accent}08`, alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.primary, lineHeight: 22 },
  error: {
    fontFamily: Typography.fonts.body, fontSize: 14, color: '#E53935',
    textAlign: 'center', paddingHorizontal: Spacing.md,
  },
  actions: { gap: Spacing.sm, alignItems: 'center' },
});
