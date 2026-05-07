/**
 * Event Detail Modal — Shows event info (UBC-Navigate)
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { router as expoRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useExploreStore } from '@/stores/useExploreStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { events } = useExploreStore();

  const event = events.find(e => e.id === eventId);
  if (!event) return <View style={s.container}><Text style={s.err}>Event not found</Text></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.closeBtn} onPress={() => expoRouter.back()}>
        <Feather name="x" size={20} color={Brand.primary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { backgroundColor: Surfaces.background }]}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={s.heroImg} />
          ) : (
            <View style={[s.iconWrap, { backgroundColor: `${Brand.accent}15`, borderColor: `${Brand.accent}30` }]}>
              <Feather name="calendar" size={48} color={Brand.accent} />
            </View>
          )}
          <Text style={s.name}>{event.title}</Text>
          <View style={[s.catTag, { backgroundColor: `${Brand.accent}10`, borderColor: `${Brand.accent}30` }]}>
            <Text style={[s.catTxt, { color: Brand.accent }]}>{event.club_name || 'Campus Event'}</Text>
          </View>
        </View>

        <Card style={s.card}>
          <Text style={s.secTitle}>About this event</Text>
          <Text style={s.desc}>{event.description}</Text>
        </Card>

        <Card style={s.card}>
          {event.event_date && (
            <View style={s.detailRow}>
              <Feather name="calendar" size={16} color={Brand.secondary} style={s.detailIcon} />
              <Text style={s.detailLabel}>Date</Text>
              <Text style={s.detailVal}>{new Date(event.event_date).toLocaleDateString()}</Text>
            </View>
          )}
          {event.location_name && (
            <View style={s.detailRow}>
              <Feather name="map-pin" size={16} color={Brand.secondary} style={s.detailIcon} />
              <Text style={s.detailLabel}>Location</Text>
              <Text style={s.detailVal}>{event.location_name}</Text>
            </View>
          )}
          {event.source_url && (
            <View style={[s.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Feather name="link" size={16} color={Brand.secondary} style={s.detailIcon} />
              <Text style={s.detailLabel}>Source</Text>
              <Text style={s.detailVal} numberOfLines={1}>{event.source_url}</Text>
            </View>
          )}
        </Card>

        <View style={s.actionArea}>
          <Button
            title="Join Event Chat"
            variant="primary"
            size="lg"
            onPress={() => {}}
          />
          <Text style={s.hint}>
            Join other students attending this event!
          </Text>
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
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  heroImg: { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md },
  iconWrap: { width: 96, height: 96, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 1 },
  name: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary, textAlign: 'center' },
  catTag: { marginTop: Spacing.sm, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  catTxt: { fontFamily: Typography.fonts.caption, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { marginTop: Spacing.md },
  secTitle: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.primary, marginBottom: 8 },
  desc: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, lineHeight: 24 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  detailIcon: { width: 28 },
  detailLabel: { flex: 1, fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  detailVal: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary },
  actionArea: { marginTop: Spacing.xl, alignItems: 'center' },
  hint: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
});
