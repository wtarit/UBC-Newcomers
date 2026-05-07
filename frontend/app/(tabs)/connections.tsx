import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { api, type ConnectionLocationResponse } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Ionicons, Feather } from '@expo/vector-icons';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ConnectionCard({ conn }: { conn: ConnectionLocationResponse }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/user-detail', params: { userId: conn.id, fromConnection: '1' } })}
    >
      <Card style={{ marginBottom: Spacing.sm }}>
        <View style={cc.row}>
          <View style={cc.avatarWrap}>
            <Ionicons name="person" size={24} color={Brand.secondary} />
            {conn.is_available_to_meet && <View style={cc.dot} />}
          </View>
          <View style={cc.info}>
            <Text style={cc.name}>{conn.full_name}</Text>
            <Text style={cc.sub}>
              {conn.major || 'Undeclared'}
              {conn.origin ? ` · ${conn.origin}` : ''}
            </Text>
          </View>
          <View style={cc.meta}>
            <Text style={cc.time}>{timeAgo(conn.connected_at)}</Text>
            {conn.latitude != null && (
              <View style={cc.locBadge}>
                <Feather name="map-pin" size={10} color={Brand.accent} />
              </View>
            )}
          </View>
        </View>
        {conn.interests && conn.interests.length > 0 && (
          <View style={cc.tags}>
            {conn.interests.slice(0, 3).map(i => (
              <View key={i} style={cc.tag}><Text style={cc.tagT}>{i}</Text></View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarWrap: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Brand.success, borderWidth: 2, borderColor: Surfaces.background },
  info: { flex: 1 },
  name: { fontFamily: Typography.fonts.h3, fontSize: 15, color: Brand.primary },
  sub: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.secondary, marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 4 },
  time: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.secondary },
  locBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm, flexWrap: 'wrap' },
  tag: { backgroundColor: Surfaces.default, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1, borderColor: Surfaces.border },
  tagT: { fontFamily: Typography.fonts.caption, fontSize: 10, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();
  const [connections, setConnections] = useState<ConnectionLocationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.listConnectionLocations();
      setConnections(data.connections);
    } catch {
      // silent
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, [accessToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Connections</Text>
        <Text style={s.sub}>
          {isLoading ? 'Loading...' : `${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      <ScrollView
        style={s.listContainer}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.accent} />
        }
      >
        {connections.length === 0 && !isLoading && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={Brand.secondary} />
            <Text style={s.emptyTitle}>No connections yet</Text>
            <Text style={s.emptyDesc}>
              Go to the Nearby tab to discover and connect with people around you.
            </Text>
          </View>
        )}
        {connections.map(conn => (
          <ConnectionCard key={conn.id} conn={conn} />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.default },
  hdr: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Surfaces.background, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  title: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  sub: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, marginTop: 4 },
  listContainer: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  emptyDesc: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
