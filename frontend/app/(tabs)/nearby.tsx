/**
 * Nearby Tab — Proximity-based matching & discovery (UBC-Navigate)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useNearbyStore, type NearbyUser } from '@/stores/useNearbyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { MatchBadge } from '@/components/ui/MatchBadge';
import { Ionicons, Feather } from '@expo/vector-icons';

function fmtDist(m: number) {
  if (m < 50) return '< 50m away';
  if (m < 100) return '< 100m away';
  if (m < 500) return '< 500m away';
  if (m < 1000) return '< 1km away';
  return `${Math.round(m / 500) * 0.5}km away`;
}

function UserCard({ user, onPress }: { user: NearbyUser; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={{ marginBottom: Spacing.md }}>
        <View style={cc.row}>
          <View>
            <View style={cc.avatarWrap}>
              <Ionicons name="person" size={32} color={Brand.secondary} />
            </View>
            {user.isAvailableToMeet && <View style={cc.dot} />}
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
        </View>
        <View style={cc.foot}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={cc.meta}>{user.origin || 'Nearby'}</Text>
            {user.matchReason ? <Text style={cc.reason}>{user.matchReason}</Text> : null}
          </View>
          <MatchBadge score={user.matchScore} size="sm" />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: { width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Brand.success, borderWidth: 2, borderColor: Surfaces.background },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary },
  dist: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary },
  prog: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.secondary, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: Surfaces.default, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Surfaces.border },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Surfaces.border },
  meta: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary },
  reason: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.primary, marginTop: 2 },
});

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const { nearbyUsers, matchedUsers, fetchNearbyUsers, fetchMatchedUsers, isLoading, locationPermissionDenied } = useNearbyStore();
  const { accessToken } = useAuthStore();
  const [sortBy, setSortBy] = useState<'match'|'distance'>('match');
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (accessToken) {
      api.getMe().then(user => setIsAvailable(user.is_available_to_meet));
      fetchNearbyUsers();
      fetchMatchedUsers();
    }
  }, [accessToken]);

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await api.updateAvailability(value);
    } catch {
      setIsAvailable(!value);
    }
  };

  const users = sortBy === 'match' && matchedUsers.length > 0 ? matchedUsers : nearbyUsers;
  const sorted = [...users].sort((a,b) => sortBy==='match' ? b.matchScore-a.matchScore : a.distanceMeters-b.distanceMeters);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>People Nearby</Text>
        <Text style={s.sub}>{isLoading ? 'Scanning...' : `${sorted.length} people around you`}</Text>
        <View style={s.toggleRow}>
          <Feather name="eye" size={16} color={isAvailable ? Brand.accent : Brand.secondary} />
          <Text style={[s.toggleLabel, isAvailable && s.toggleLabelActive]}>Visible to others</Text>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: Surfaces.border, true: Brand.accent }}
            thumbColor={Surfaces.background}
          />
        </View>
        <View style={s.sortRow}>
          {(['match','distance'] as const).map(k => (
            <TouchableOpacity key={k} onPress={() => setSortBy(k)}
              style={[s.sortPill, sortBy===k && s.sortPillA]}>
              <Text style={[s.sortT, sortBy===k && s.sortTA]}>
                {k==='match' ? 'Best Match' : 'Closest'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {locationPermissionDenied ? (
        <View style={s.permMsg}>
          <Ionicons name="location-outline" size={48} color={Brand.secondary} />
          <Text style={s.permTitle}>Location Access Needed</Text>
          <Text style={s.permDesc}>
            Enable location permissions in your device settings to discover people nearby.
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchNearbyUsers()}>
            <Text style={s.retryT}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {sorted.map(u => (
            <UserCard key={u.id} user={u} onPress={() => router.push({ pathname:'/user-detail', params:{ userId:u.id } })} />
          ))}
          <View style={{ height:32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.default },
  hdr: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Surfaces.background, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Surfaces.border, marginBottom: Spacing.md },
  title: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  sub: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, marginTop: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, backgroundColor: Surfaces.default, borderRadius: Radius.md, borderWidth: 1, borderColor: Surfaces.border },
  toggleLabel: { flex: 1, fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary },
  toggleLabelActive: { color: Brand.primary },
  sortRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sortPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border },
  sortPillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  sortT: { fontFamily: Typography.fonts.h4, fontSize: 13, color: Brand.primary },
  sortTA: { color: Surfaces.background },
  list: { paddingHorizontal: Spacing.lg },
  permMsg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  permTitle: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary, marginTop: Spacing.md },
  permDesc: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, textAlign: 'center', marginTop: Spacing.sm },
  retryBtn: { marginTop: Spacing.lg, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full, backgroundColor: Brand.accent },
  retryT: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Surfaces.background },
});
