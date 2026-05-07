import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { api, type ConnectionResponse } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';

function userForConnection(connection: ConnectionResponse, myUserId?: string) {
  if (!myUserId) return connection.receiver;
  return connection.requester.id === myUserId ? connection.receiver : connection.requester;
}

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<ConnectionResponse[]>([]);
  const [accepted, setAccepted] = useState<ConnectionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | undefined>(undefined);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, pendingRes, acceptedRes] = await Promise.all([
        api.getMe(),
        api.listPendingConnections(),
        api.listConnections(),
      ]);
      setMyUserId(me.id);
      setPending(pendingRes.connections);
      setAccepted(acceptedRes.connections);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metConnections = useMemo(
    () => accepted.filter((connection) => !!connection.met_at_landmark),
    [accepted],
  );

  const accept = async (connectionId: string) => {
    setActionLoadingId(connectionId);
    try {
      await api.acceptConnection(connectionId);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const decline = async (connectionId: string) => {
    setActionLoadingId(connectionId);
    try {
      await api.declineConnection(connectionId);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Connections</Text>
        <Text style={s.sub}>Manage requests, chats, and people you have met.</Text>
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionTitle}>Pending Requests</Text>
        {pending.length === 0 ? (
          <Card><Text style={s.empty}>No pending requests.</Text></Card>
        ) : pending.map((connection) => {
          const person = userForConnection(connection, myUserId);
          return (
            <Card key={connection.id} style={s.card}>
              <View style={s.row}>
                <View style={s.nameWrap}>
                  <Text style={s.name}>{person.full_name}</Text>
                  <Text style={s.meta}>{person.major || 'Undeclared'} {person.year_standing ? `· Year ${person.year_standing}` : ''}</Text>
                </View>
                <View style={s.actions}>
                  <Button
                    title="Accept"
                    size="sm"
                    onPress={() => accept(connection.id)}
                    loading={actionLoadingId === connection.id}
                  />
                  <Button
                    title="Decline"
                    size="sm"
                    variant="secondary"
                    onPress={() => decline(connection.id)}
                    disabled={actionLoadingId === connection.id}
                  />
                </View>
              </View>
            </Card>
          );
        })}

        <Text style={s.sectionTitle}>All Connections</Text>
        {accepted.length === 0 ? (
          <Card><Text style={s.empty}>No accepted connections yet.</Text></Card>
        ) : accepted.map((connection) => {
          const person = userForConnection(connection, myUserId);
          return (
            <TouchableOpacity
              key={connection.id}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/connection-detail', params: { connectionId: connection.id } })}
            >
              <Card style={s.card}>
                <View style={s.row}>
                  <View style={s.nameWrap}>
                    <Text style={s.name}>{person.full_name}</Text>
                    <Text style={s.meta}>
                      {person.major || 'Undeclared'}
                      {connection.met_at_landmark ? ` · Met at ${connection.met_at_landmark}` : ''}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Brand.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <Text style={s.sectionTitle}>People Met</Text>
        {metConnections.length === 0 ? (
          <Card><Text style={s.empty}>No meetups marked yet.</Text></Card>
        ) : metConnections.map((connection) => {
          const person = userForConnection(connection, myUserId);
          return (
            <Card key={`${connection.id}-met`} style={s.card}>
              <Text style={s.name}>{person.full_name}</Text>
              <Text style={s.meta}>Met at {connection.met_at_landmark}</Text>
            </Card>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.default },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Surfaces.background,
    borderBottomWidth: 1,
    borderBottomColor: Surfaces.border,
  },
  title: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  sub: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionTitle: { fontFamily: Typography.fonts.h3, fontSize: 17, color: Brand.primary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  card: { marginBottom: Spacing.sm },
  empty: { fontFamily: Typography.fonts.body, color: Brand.secondary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  nameWrap: { flex: 1 },
  name: { fontFamily: Typography.fonts.h3, fontSize: 15, color: Brand.primary },
  meta: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.secondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
});
