/**
 * Profile Tab — User profile & exploration stats (Verdana Health)
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useExploreStore } from '@/stores/useExploreStore';
import { useNearbyStore } from '@/stores/useNearbyStore';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CATEGORY_COLORS } from '@/constants/Zones';

// Mock user profile
const MY_PROFILE = {
  displayName: 'Alex M.',
  avatar: '🧑🏽‍💻',
  program: 'Computer Science',
  year: 2,
  interests: ['Coding', 'Hiking', 'Photography', 'Coffee', 'Music'],
  languages: ['English', 'French'],
  nationality: 'Canada',
  bio: 'CS major exploring UBC one zone at a time. Love building apps and finding hidden gems on campus.',
  joinedDate: 'September 2025',
};

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={rs.row}>
      <Text style={rs.icon}>{icon}</Text>
      <Text style={rs.label}>{label}</Text>
      <Text style={[rs.value, { color }]}>{value}</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  icon: { fontSize: 18, width: 32 },
  label: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  value: { fontFamily: Typography.fonts.h4, fontSize: 14 },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { totalPoints, getProgress, zones, isZoneUnlocked } = useExploreStore();
  const { introductions } = useNearbyStore();
  const progress = getProgress();

  // Category stats
  const categories = ['nature', 'academic', 'social', 'culture', 'athletics'] as const;
  const catStats = categories.map(cat => {
    const total = zones.filter(z => z.category === cat).length;
    const unlocked = zones.filter(z => z.category === cat && isZoneUnlocked(z.id)).length;
    return { cat, total, unlocked };
  });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Profile Header */}
        <View style={s.hdrWrap}>
          <View style={s.avatarWrap}>
            <Text style={s.avatar}>{MY_PROFILE.avatar}</Text>
          </View>
          <Text style={s.name}>{MY_PROFILE.displayName}</Text>
          <Text style={s.program}>{MY_PROFILE.program} · Year {MY_PROFILE.year}</Text>
          <Text style={s.bio}>{MY_PROFILE.bio}</Text>
          <View style={s.tags}>
            {MY_PROFILE.interests.map(i => (
              <View key={i} style={s.tag}><Text style={s.tagT}>{i}</Text></View>
            ))}
          </View>
        </View>

        {/* Exploration Stats */}
        <View style={s.section}>
          <Text style={s.secTitle}>Exploration Progress</Text>
          <Card variant="elevated" style={s.progressCard}>
            <View style={s.progressRow}>
              <ProgressRing progress={progress.percentage} size={100} strokeWidth={6} />
              <View style={s.progressInfo}>
                <StatRow icon="🗺️" label="Zones Explored" value={`${progress.unlocked}/${progress.total}`} color={Brand.accent} />
                <StatRow icon="⭐" label="Total Points" value={`${totalPoints}`} color={Brand.warning} />
                <StatRow icon="💬" label="Intros Sent" value={`${introductions.length}`} color={Brand.info} />
              </View>
            </View>
          </Card>
        </View>

        {/* Category Breakdown */}
        <View style={s.section}>
          <Text style={s.secTitle}>By Category</Text>
          {catStats.map(({ cat, total, unlocked }) => {
            const color = CATEGORY_COLORS[cat];
            const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
            return (
              <Card key={cat} style={s.catCard}>
                <View style={s.catRow}>
                  <View style={[s.catDot, { backgroundColor: color }]} />
                  <Text style={s.catName}>{cat}</Text>
                  <Text style={[s.catPct, { color }]}>{pct}%</Text>
                  <Text style={s.catCount}>{unlocked}/{total}</Text>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
              </Card>
            );
          })}
        </View>

        {/* Account Info */}
        <View style={s.section}>
          <Text style={s.secTitle}>Account</Text>
          <Card variant="elevated">
            <StatRow icon="🌐" label="Languages" value={MY_PROFILE.languages.join(', ')} color={Brand.primary} />
            <StatRow icon="🏳️" label="Nationality" value={MY_PROFILE.nationality} color={Brand.primary} />
            <StatRow icon="📅" label="Joined" value={MY_PROFILE.joinedDate} color={Brand.secondary} />
          </Card>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background },
  scroll: { paddingHorizontal: Spacing.lg },
  hdrWrap: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Surfaces.default, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: Surfaces.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Brand.primary, marginBottom: Spacing.md },
  avatar: { fontSize: 48 },
  name: { fontFamily: Typography.fonts.h2, fontSize: 24, color: Brand.primary },
  program: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, marginTop: 4 },
  bio: { fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22, paddingHorizontal: Spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md, justifyContent: 'center' },
  tag: { backgroundColor: `${Brand.primary}10`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: Spacing.xl },
  secTitle: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary, marginBottom: Spacing.md },
  progressCard: { padding: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  progressInfo: { flex: 1 },
  catCard: { marginBottom: Spacing.sm, paddingVertical: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  catDot: { width: 10, height: 10, borderRadius: Radius.full },
  catName: { flex: 1, fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary, textTransform: 'capitalize' },
  catPct: { fontFamily: Typography.fonts.h4, fontSize: 14 },
  catCount: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary, width: 32, textAlign: 'right' },
  barBg: { height: 6, backgroundColor: Surfaces.background, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: Radius.full },
});
