/**
 * Nearby Tab — Proximity-based matching & discovery (Verdana Health)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useNearbyStore } from '@/stores/useNearbyStore';
import { Card } from '@/components/ui/Card';
import { MatchBadge } from '@/components/ui/MatchBadge';
import type { NearbyUser } from '@/constants/MockUsers';

function ScanningPulse() {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkPulse = (a: Animated.Value, d: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(d),
        Animated.timing(a, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    const p1 = mkPulse(pulse1, 0); const p2 = mkPulse(pulse2, 800);
    p1.start(); p2.start();
    return () => { p1.stop(); p2.stop(); };
  }, [pulse1, pulse2]);

  return (
    <View style={sc.container}>
      {[pulse1, pulse2].map((p, i) => (
        <Animated.View key={i} style={[sc.ring, {
          opacity: p.interpolate({ inputRange: [0,1], outputRange: [0.6,0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0,1], outputRange: [0.8,2.5] }) }],
        }]} />
      ))}
      <View style={sc.center}><Text style={sc.icon}>📡</Text></View>
    </View>
  );
}

const sc = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 120, marginVertical: Spacing.lg },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: Brand.accent },
  center: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${Brand.accent}15`, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 28 },
});

function fmtDist(m: number) { return m<1000 ? `${m}m away` : `${(m/1000).toFixed(1)}km away`; }
function fmtTime(iso: string) {
  const mins = Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if (mins<1) return 'Just now'; if (mins<60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

function UserCard({ user, onPress }: { user: NearbyUser; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card variant="elevated" style={{ marginBottom: Spacing.md }}>
        <View style={cc.row}>
          <View>
            <Text style={cc.avatar}>{user.avatar}</Text>
            <View style={cc.dot} />
          </View>
          <View style={cc.info}>
            <View style={cc.nameRow}>
              <Text style={cc.name}>{user.displayName}</Text>
              <Text style={cc.dist}>{fmtDist(user.distanceMeters)}</Text>
            </View>
            <Text style={cc.prog}>{user.program} · Year {user.year}</Text>
            <View style={cc.tags}>
              {user.interests.slice(0,3).map(i => (
                <View key={i} style={cc.tag}><Text style={cc.tagT}>{i}</Text></View>
              ))}
            </View>
          </View>
          <MatchBadge score={user.matchScore} size="md" />
        </View>
        <View style={cc.foot}>
          <Text style={cc.meta}>🕐 {fmtTime(user.lastSeen)}</Text>
          <Text style={cc.meta}>🗺️ {user.zonesExplored} zones</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { fontSize: 40, width: 56, height: 56, textAlign: 'center', lineHeight: 56, backgroundColor: Surfaces.background, borderRadius: Radius.lg, overflow: 'hidden' },
  dot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Brand.success, borderWidth: 2, borderColor: Surfaces.default },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: Typography.fonts.h4, fontSize: 16, color: Brand.primary },
  dist: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.accent },
  prog: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.secondary, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: `${Brand.primary}10`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Surfaces.border },
  meta: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary },
});

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const { nearbyUsers } = useNearbyStore();
  const [sortBy, setSortBy] = useState<'match'|'distance'>('match');
  const sorted = [...nearbyUsers].sort((a,b) => sortBy==='match' ? b.matchScore-a.matchScore : a.distanceMeters-b.distanceMeters);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>People Nearby</Text>
        <Text style={s.sub}>{nearbyUsers.length} compatible people around you</Text>
        <ScanningPulse />
        <View style={s.sortRow}>
          {(['match','distance'] as const).map(k => (
            <TouchableOpacity key={k} onPress={() => setSortBy(k)}
              style={[s.sortPill, sortBy===k && s.sortPillA]}>
              <Text style={[s.sortT, sortBy===k && s.sortTA]}>
                {k==='match' ? '🎯 Best Match' : '📍 Closest'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {sorted.map(u => (
          <UserCard key={u.id} user={u} onPress={() => router.push({ pathname:'/user-detail', params:{ userId:u.id } })} />
        ))}
        <View style={{ height:32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background },
  hdr: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Surfaces.default, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Surfaces.border, marginBottom: Spacing.md },
  title: { fontFamily: Typography.fonts.h1, fontSize: 28, color: Brand.primary, letterSpacing: -0.5 },
  sub: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, marginTop: 4 },
  sortRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sortPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.DEFAULT, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border },
  sortPillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  sortT: { fontFamily: Typography.fonts.caption, fontSize: 13, color: Brand.primary },
  sortTA: { color: Surfaces.default },
  list: { paddingHorizontal: Spacing.lg },
});
