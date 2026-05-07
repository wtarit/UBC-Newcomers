/**
 * User Detail Modal — Nearby user profile + AI intro (Verdana Health)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useNearbyStore } from '@/stores/useNearbyStore';
import { MOCK_NEARBY_USERS } from '@/constants/MockUsers';
import { Card } from '@/components/ui/Card';
import { MatchBadge } from '@/components/ui/MatchBadge';
import { Button } from '@/components/ui/Button';

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { sendIntroduction, getIntroForUser, generateAIIntro } = useNearbyStore();
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const user = MOCK_NEARBY_USERS.find(u => u.id === userId);
  if (!user) return <View style={s.container}><Text style={s.err}>User not found</Text></View>;

  const existingIntro = getIntroForUser(user.id);

  const handleGenerateIntro = () => {
    const msg = generateAIIntro(user);
    setPreviewMsg(msg);
  };

  const handleSend = () => {
    sendIntroduction(user.id);
    setSent(true);
    setPreviewMsg(null);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Text style={s.closeTxt}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatarWrap}>
            <Text style={s.avatar}>{user.avatar}</Text>
          </View>
          <Text style={s.name}>{user.displayName}</Text>
          <Text style={s.prog}>{user.program} · Year {user.year}</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <MatchBadge score={user.matchScore} size="lg" />
          </View>
        </View>

        {/* Bio */}
        <Card variant="elevated" style={s.card}>
          <Text style={s.secTitle}>About</Text>
          <Text style={s.bio}>{user.bio}</Text>
        </Card>

        {/* Details */}
        <Card variant="elevated" style={s.card}>
          <View style={s.detRow}>
            <Text style={s.detIcon}>📍</Text>
            <Text style={s.detLabel}>Distance</Text>
            <Text style={[s.detVal, { color: Brand.primary }]}>{user.distanceMeters}m away</Text>
          </View>
          <View style={s.detRow}>
            <Text style={s.detIcon}>🌐</Text>
            <Text style={s.detLabel}>Languages</Text>
            <Text style={s.detVal}>{user.languages.join(', ')}</Text>
          </View>
          <View style={s.detRow}>
            <Text style={s.detIcon}>🏳️</Text>
            <Text style={s.detLabel}>From</Text>
            <Text style={s.detVal}>{user.nationality}</Text>
          </View>
          <View style={s.detRow}>
            <Text style={s.detIcon}>🗺️</Text>
            <Text style={s.detLabel}>Zones Explored</Text>
            <Text style={[s.detVal, { color: Brand.accent }]}>{user.zonesExplored}</Text>
          </View>
        </Card>

        {/* Interests */}
        <Card variant="elevated" style={s.card}>
          <Text style={s.secTitle}>Interests</Text>
          <View style={s.tags}>
            {user.interests.map(i => (
              <View key={i} style={s.tag}><Text style={s.tagT}>{i}</Text></View>
            ))}
          </View>
        </Card>

        {/* AI Introduction */}
        <View style={s.section}>
          <Text style={s.secTitle}>✨ AI Introduction</Text>
          {existingIntro || sent ? (
            <Card style={{ backgroundColor: '#F0FDF4', borderColor: Brand.success }}>
              <Text style={s.sentLabel}>✅ Introduction sent!</Text>
              <Text style={s.sentMsg}>{existingIntro?.message || 'Message sent successfully'}</Text>
            </Card>
          ) : previewMsg ? (
            <View>
              <Card style={{ backgroundColor: `${Brand.info}10`, borderColor: Brand.info }}>
                <Text style={s.previewLabel}>Preview</Text>
                <Text style={s.previewMsg}>{previewMsg}</Text>
              </Card>
              <View style={s.btnRow}>
                <Button title="Regenerate" variant="secondary" size="md" onPress={handleGenerateIntro} style={{ flex: 1 }} />
                <Button title="Send" variant="primary" icon="📨" size="md" onPress={handleSend} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View>
              <Text style={s.aiDesc}>
                Let our AI craft a personalized introduction based on your shared interests and profiles.
              </Text>
              <Button
                title="Generate AI Introduction"
                variant="primary"
                icon="🤖"
                size="lg"
                onPress={handleGenerateIntro}
              />
            </View>
          )}
        </View>

        {/* Action buttons */}
        {!existingIntro && !sent && (
          <View style={s.actions}>
            <Button title="Wave Hello 👋" variant="secondary" size="md" onPress={() => {}} />
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background },
  scroll: { paddingHorizontal: Spacing.lg },
  err: { fontFamily: Typography.fonts.body, color: Brand.primary, fontSize: 16, textAlign: 'center', marginTop: 100 },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: Surfaces.default, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border },
  closeTxt: { color: Brand.primary, fontSize: 16, fontWeight: '600' },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, backgroundColor: Surfaces.default, borderBottomWidth: 1, borderBottomColor: Surfaces.border, gap: Spacing.xs },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: Surfaces.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Brand.primary, marginBottom: Spacing.sm },
  avatar: { fontSize: 52 },
  name: { fontFamily: Typography.fonts.h1, fontSize: 26, color: Brand.primary },
  prog: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary },
  card: { marginTop: Spacing.md },
  secTitle: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary, marginBottom: 8 },
  bio: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, lineHeight: 22 },
  detRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  detIcon: { fontSize: 16, width: 28 },
  detLabel: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  detVal: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: `${Brand.primary}10`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: Spacing.xl },
  aiDesc: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, lineHeight: 22, marginBottom: Spacing.md },
  previewLabel: { fontFamily: Typography.fonts.h4, fontSize: 12, color: Brand.info, marginBottom: 6 },
  previewMsg: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.primary, lineHeight: 22 },
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  sentLabel: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.success, marginBottom: 6 },
  sentMsg: { fontFamily: Typography.fonts.body, fontSize: 13, color: Brand.secondary, lineHeight: 20 },
  actions: { marginTop: Spacing.xl, alignItems: 'center' },
});
