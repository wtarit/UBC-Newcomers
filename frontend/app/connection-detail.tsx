import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { api, type ConnectionMessageResponse, type ConnectionResponse, type ConnectionLocationPairResponse } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';

function peerForConnection(connection: ConnectionResponse, myUserId?: string) {
  if (!myUserId) return connection.receiver;
  return connection.requester.id === myUserId ? connection.receiver : connection.requester;
}

export default function ConnectionDetailScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const insets = useSafeAreaInsets();
  const [connection, setConnection] = useState<ConnectionResponse | null>(null);
  const [myUserId, setMyUserId] = useState<string | undefined>(undefined);
  const [locations, setLocations] = useState<ConnectionLocationPairResponse | null>(null);
  const [messages, setMessages] = useState<ConnectionMessageResponse[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [markingMet, setMarkingMet] = useState(false);

  const load = async () => {
    if (!connectionId) return;
    const me = await api.getMe();
    setMyUserId(me.id);
    const list = await api.listConnections();
    const conn = list.connections.find((c) => c.id === connectionId) || null;
    setConnection(conn);
    if (!conn) return;
    const [locRes, msgRes] = await Promise.all([
      api.getConnectionLocations(connectionId),
      api.listConnectionMessages(connectionId),
    ]);
    setLocations(locRes);
    setMessages(msgRes.messages);
  };

  useEffect(() => {
    load();
  }, [connectionId]);

  const peer = useMemo(() => (connection ? peerForConnection(connection, myUserId) : null), [connection, myUserId]);

  const send = async () => {
    if (!connectionId) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.sendConnectionMessage(connectionId, text);
      setDraft('');
      const msgRes = await api.listConnectionMessages(connectionId);
      setMessages(msgRes.messages);
    } finally {
      setSending(false);
    }
  };

  const markMet = async () => {
    if (!connectionId) return;
    setMarkingMet(true);
    try {
      await api.markConnectionMet(connectionId, 'UBC Campus');
      await load();
    } finally {
      setMarkingMet(false);
    }
  };

  if (!connection || !peer) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={Brand.primary} />
        </TouchableOpacity>
        <View style={s.emptyWrap}><Text style={s.empty}>Connection not found.</Text></View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Feather name="x" size={20} color={Brand.primary} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{peer.full_name}</Text>
        <Text style={s.sub}>{peer.major || 'Undeclared'}</Text>

        <Card style={s.card}>
          <Text style={s.sectionTitle}>Live Location</Text>
          <Text style={s.line}>You: {locations?.mine.latitude ?? '-'}, {locations?.mine.longitude ?? '-'}</Text>
          <Text style={s.line}>{peer.full_name}: {locations?.theirs.latitude ?? '-'}, {locations?.theirs.longitude ?? '-'}</Text>
        </Card>

        <Card style={s.card}>
          <View style={s.row}>
            <Text style={s.sectionTitle}>People Met</Text>
            <Button
              title={connection.met_at_landmark ? `Met at ${connection.met_at_landmark}` : 'Mark Met'}
              size="sm"
              variant={connection.met_at_landmark ? 'secondary' : 'primary'}
              onPress={markMet}
              disabled={!!connection.met_at_landmark}
              loading={markingMet}
            />
          </View>
        </Card>

        <Card style={s.card}>
          <Text style={s.sectionTitle}>Messages</Text>
          {messages.length === 0 ? <Text style={s.empty}>No messages yet.</Text> : messages.map((msg) => {
            const mine = msg.sender.id === myUserId;
            return (
              <View key={msg.id} style={[s.msg, mine ? s.msgMine : s.msgPeer]}>
                <Text style={s.msgBody}>{msg.body}</Text>
                <Text style={s.msgMeta}>{mine ? 'You' : msg.sender.full_name}</Text>
              </View>
            );
          })}
          <View style={s.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={s.input}
              placeholder="Send a message"
              placeholderTextColor={Brand.secondary}
            />
            <Button title="Send" size="sm" onPress={send} loading={sending} />
          </View>
        </Card>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.default },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Surfaces.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Surfaces.border,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  title: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  sub: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, marginTop: 2, marginBottom: Spacing.md },
  card: { marginTop: Spacing.sm },
  sectionTitle: { fontFamily: Typography.fonts.h3, fontSize: 15, color: Brand.primary, marginBottom: 8 },
  line: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  msg: { borderRadius: Radius.md, padding: 10, marginBottom: 8, maxWidth: '88%' },
  msgMine: { backgroundColor: '#E8F1FF', alignSelf: 'flex-end' },
  msgPeer: { backgroundColor: Surfaces.default, alignSelf: 'flex-start', borderWidth: 1, borderColor: Surfaces.border },
  msgBody: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.primary },
  msgMeta: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.secondary, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  input: {
    flex: 1,
    backgroundColor: Surfaces.background,
    borderWidth: 1,
    borderColor: Surfaces.border,
    borderRadius: Radius.md,
    height: 40,
    paddingHorizontal: 12,
    fontFamily: Typography.fonts.body,
    fontSize: 14,
    color: Brand.primary,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
});
