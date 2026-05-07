/**
 * User Detail Modal — Nearby user profile + connect (UBC-Navigate)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useNearbyStore } from '@/stores/useNearbyStore';
import { Card } from '@/components/ui/Card';
import { MatchBadge } from '@/components/ui/MatchBadge';
import { Button } from '@/components/ui/Button';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { nearbyUsers, matchedUsers, sendConnectionRequest, getIntroForUser, pendingConnections, acceptConnectionRequest } = useNearbyStore();
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const nearbyUser = nearbyUsers.find((u) => u.id === userId);
  const matchedUser = matchedUsers.find((u) => u.id === userId);
  const user = nearbyUser
    ? {
        ...nearbyUser,
        matchScore: matchedUser?.matchScore ?? nearbyUser.matchScore,
        matchReason: matchedUser?.matchReason ?? nearbyUser.matchReason,
      }
    : matchedUser;
  if (!user) return <View style={s.container}><Text style={s.err}>User not found</Text></View>;

  const existingIntro = getIntroForUser(user.id);
  const incomingRequest = pendingConnections.find(c => c.requester.id === userId);

  const handleConnect = async () => {
    setSending(true);
    setConnectError(null);
    const ok = await sendConnectionRequest(user.id);
    if (!ok) setConnectError('Unable to send request. It may already exist.');
    setSending(false);
  };

  const handleAcceptIncoming = async () => {
    if (!incomingRequest) return;
    setSending(true);
    const success = await acceptConnectionRequest(incomingRequest.id);
    if (success) setAccepted(true);
    setSending(false);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Feather name="x" size={20} color={Brand.primary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.avatarWrap}>
            <Ionicons name="person" size={48} color={Brand.secondary} />
          </View>
          <Text style={s.name}>{user.displayName}</Text>
          <Text style={s.prog}>{user.program} · Year {user.year}</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <MatchBadge score={user.matchScore} size="lg" />
          </View>
        </View>

        <Card style={s.card}>
          <Text style={s.secTitle}>About</Text>
          <Text style={s.bio}>{user.bio || 'No bio yet.'}</Text>
          {user.matchReason ? <Text style={s.reason}>Why you match: {user.matchReason}</Text> : null}
        </Card>

        <Card style={s.card}>
          <View style={s.detRow}>
            <Feather name="map-pin" size={16} color={Brand.secondary} style={s.detIcon} />
            <Text style={s.detLabel}>Distance</Text>
            <Text style={[s.detVal, { color: Brand.primary }]}>{user.distanceMeters}m away</Text>
          </View>
          {user.origin ? (
            <View style={s.detRow}>
              <Feather name="flag" size={16} color={Brand.secondary} style={s.detIcon} />
              <Text style={s.detLabel}>From</Text>
              <Text style={s.detVal}>{user.origin}</Text>
            </View>
          ) : null}
          <View style={[s.detRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Feather name="users" size={16} color={Brand.secondary} style={s.detIcon} />
            <Text style={s.detLabel}>Connections</Text>
            <Text style={[s.detVal, { color: Brand.primary }]}>{user.connectionsCount}</Text>
          </View>
        </Card>

        {user.interests.length > 0 && (
          <Card style={s.card}>
            <Text style={s.secTitle}>Interests</Text>
            <View style={s.tags}>
              {user.interests.map(i => (
                <View key={i} style={s.tag}><Text style={s.tagT}>{i}</Text></View>
              ))}
            </View>
          </Card>
        )}

        <View style={s.section}>
          {accepted ? (
            <Card style={{ backgroundColor: '#F0FDF4', borderColor: Brand.success }}>
              <View style={s.sentRow}>
                <Feather name="check-circle" size={18} color={Brand.success} />
                <Text style={s.sentLabel}>Connected!</Text>
              </View>
            </Card>
          ) : incomingRequest ? (
            <Button
              title={sending ? 'Accepting...' : 'Accept Connection'}
              variant="primary"
              size="lg"
              onPress={handleAcceptIncoming}
            />
          ) : existingIntro ? (
            <Card style={{ backgroundColor: '#F0FDF4', borderColor: Brand.success }}>
              <View style={s.sentRow}>
                <Feather name="check-circle" size={18} color={Brand.success} />
                <Text style={s.sentLabel}>Connection request sent</Text>
              </View>
            </Card>
          ) : (
            <>
              <Button
                title={sending ? 'Sending...' : 'Connect'}
                variant="primary"
                size="lg"
                onPress={handleConnect}
              />
              {connectError ? <Text style={s.error}>{connectError}</Text> : null}
            </>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.default },
  scroll: { paddingHorizontal: Spacing.lg },
  err: { fontFamily: Typography.fonts.body, color: Brand.primary, fontSize: 16, textAlign: 'center', marginTop: 100 },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Surfaces.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, backgroundColor: Surfaces.background, borderBottomWidth: 1, borderBottomColor: Surfaces.border, gap: Spacing.xs },
  avatarWrap: { width: 88, height: 88, borderRadius: Radius.full, backgroundColor: Surfaces.default, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border, marginBottom: Spacing.sm },
  name: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  prog: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary },
  card: { marginTop: Spacing.md },
  secTitle: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary, marginBottom: 8 },
  bio: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, lineHeight: 22 },
  reason: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.primary, marginTop: 10 },
  detRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  detIcon: { width: 28 },
  detLabel: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  detVal: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Surfaces.default, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Surfaces.border },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: Spacing.xl },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sentLabel: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.success },
  error: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.error, marginTop: 8 },
});
