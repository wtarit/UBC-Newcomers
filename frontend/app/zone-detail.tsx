/**
 * Zone Detail Modal — Shows zone info and unlock action (Verdana Health)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { router as expoRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { EXPLORE_ZONES, CATEGORY_COLORS } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ZoneDetailScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>();
  const insets = useSafeAreaInsets();
  const { unlockZone, isZoneUnlocked } = useExploreStore();
  const [justUnlocked, setJustUnlocked] = useState(false);

  const zone = EXPLORE_ZONES.find(z => z.id === zoneId);
  if (!zone) return <View style={s.container}><Text style={s.err}>Zone not found</Text></View>;

  const unlocked = isZoneUnlocked(zone.id);
  const catColor = CATEGORY_COLORS[zone.category];

  const handleUnlock = () => {
    unlockZone(zone.id);
    setJustUnlocked(true);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Close button */}
      <TouchableOpacity style={s.closeBtn} onPress={() => expoRouter.back()}>
        <Text style={s.closeTxt}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: `${catColor}15` }]}>
          <Text style={s.emoji}>{zone.emoji}</Text>
          <Text style={s.name}>{zone.name}</Text>
          <View style={[s.catTag, { backgroundColor: `${catColor}25` }]}>
            <Text style={[s.catTxt, { color: catColor }]}>{zone.category}</Text>
          </View>
        </View>

        {/* Description */}
        <Card variant="elevated" style={s.card}>
          <Text style={s.secTitle}>About this place</Text>
          <Text style={s.desc}>{zone.description}</Text>
        </Card>

        {/* Fun Fact */}
        <Card style={[s.card, { backgroundColor: `${Brand.warning}10`, borderColor: Brand.warning }]}>
          <Text style={s.factLabel}>💡 Fun Fact</Text>
          <Text style={s.fact}>{zone.funFact}</Text>
        </Card>

        {/* Details */}
        <Card variant="elevated" style={s.card}>
          <View style={s.detailRow}>
            <Text style={s.detailIcon}>📍</Text>
            <Text style={s.detailLabel}>Radius</Text>
            <Text style={s.detailVal}>{zone.radiusMeters}m</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailIcon}>⭐</Text>
            <Text style={s.detailLabel}>Points</Text>
            <Text style={[s.detailVal, { color: Brand.warning }]}>+{zone.points}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailIcon}>📌</Text>
            <Text style={s.detailLabel}>Coordinates</Text>
            <Text style={s.detailVal}>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</Text>
          </View>
        </Card>

        {/* Unlock / Status */}
        <View style={s.actionArea}>
          {justUnlocked ? (
            <View style={s.unlockedMsg}>
              <Text style={s.unlockedEmoji}>🎉</Text>
              <Text style={s.unlockedTitle}>Zone Unlocked!</Text>
              <Text style={s.unlockedSub}>+{zone.points} points earned</Text>
            </View>
          ) : unlocked ? (
            <Card style={s.exploredCard}>
              <Text style={s.exploredTxt}>✅ You've explored this zone!</Text>
            </Card>
          ) : (
            <View>
              <Button
                title="Unlock This Zone"
                variant="primary"
                icon="🔓"
                size="lg"
                onPress={handleUnlock}
              />
              <Text style={s.hint}>
                In the full app, you'll need to physically visit this location to unlock it!
              </Text>
            </View>
          )}
        </View>

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
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  emoji: { fontSize: 72, marginBottom: Spacing.md },
  name: { fontFamily: Typography.fonts.h1, fontSize: 26, color: Brand.primary, textAlign: 'center' },
  catTag: { marginTop: Spacing.sm, paddingHorizontal: 14, paddingVertical: 4, borderRadius: Radius.full },
  catTxt: { fontFamily: Typography.fonts.caption, fontSize: 13, textTransform: 'capitalize' },
  card: { marginTop: Spacing.md },
  secTitle: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary, marginBottom: 8 },
  desc: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, lineHeight: 24 },
  factLabel: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.warning, marginBottom: 6 },
  fact: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, lineHeight: 22, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  detailIcon: { fontSize: 16, width: 28 },
  detailLabel: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  detailVal: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary },
  actionArea: { marginTop: Spacing.xl, alignItems: 'center' },
  unlockedMsg: { alignItems: 'center' },
  unlockedEmoji: { fontSize: 56 },
  unlockedTitle: { fontFamily: Typography.fonts.h2, fontSize: 24, color: Brand.success, marginTop: Spacing.sm },
  unlockedSub: { fontFamily: Typography.fonts.h4, fontSize: 16, color: Brand.warning, marginTop: 4 },
  exploredCard: { alignItems: 'center', paddingVertical: Spacing.lg, width: '100%' },
  exploredTxt: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.success },
  hint: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
});
