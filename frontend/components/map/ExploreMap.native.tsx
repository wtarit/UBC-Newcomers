/**
 * ExploreMap — Native (iOS/Android) version using react-native-maps
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { EXPLORE_ZONES, CATEGORY_COLORS, UBC_CENTER, type ExploreZone } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { type EventResponse } from '@/services/api';

type CategoryFilter = ExploreZone['category'] | 'all' | 'events';
const CATEGORIES: { key: CategoryFilter; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'map' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'nature', label: 'Nature', icon: 'feather' },
  { key: 'academic', label: 'Academic', icon: 'book-open' },
  { key: 'social', label: 'Social', icon: 'users' },
  { key: 'culture', label: 'Culture', icon: 'globe' },
  { key: 'athletics', label: 'Athletics', icon: 'activity' },
];

interface ExploreMapProps {
  insetTop: number;
  insetBottom: number;
}

export default function ExploreMapNative({ insetTop, insetBottom }: ExploreMapProps) {
  const mapRef = useRef<MapView>(null);
  const markerPressInFlight = useRef(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedZone, setSelectedZone] = useState<ExploreZone | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const { zones, events, fetchEvents, isZoneUnlocked, getProgress, totalPoints, unlockZone } = useExploreStore();
  const progress = getProgress();

  React.useEffect(() => {
    fetchEvents();
  }, []);

  const filteredZones = (activeCategory === 'all')
    ? zones
    : (activeCategory === 'events' ? [] : zones.filter(z => z.category === activeCategory));
  
  const filteredEvents = (activeCategory === 'all' || activeCategory === 'events')
    ? events
    : [];

  const handleMarkerPress = useCallback((zone: ExploreZone) => {
    markerPressInFlight.current = true;
    setSelectedZone(zone);
    setSelectedEvent(null);
    setJustUnlocked(null);
    mapRef.current?.animateToRegion({
      latitude: zone.latitude - 0.003,
      longitude: zone.longitude,
      latitudeDelta: 0.012, longitudeDelta: 0.012,
    }, 400);

    // iOS MapKit may fire map onPress right after marker press.
    // Keep this window small so normal map taps still clear selection.
    setTimeout(() => {
      markerPressInFlight.current = false;
    }, 150);
  }, []);

  const handleEventMarkerPress = useCallback((event: EventResponse) => {
    if (!event.latitude || !event.longitude) return;
    setSelectedEvent(event);
    setSelectedZone(null);
    setJustUnlocked(null);
    mapRef.current?.animateToRegion({
      latitude: event.latitude - 0.003,
      longitude: event.longitude,
      latitudeDelta: 0.012, longitudeDelta: 0.012,
    }, 400);
  }, []);

  const handleUnlock = useCallback(() => {
    if (!selectedZone) return;
    unlockZone(selectedZone.id);
    setJustUnlocked(selectedZone.id);
  }, [selectedZone, unlockZone]);

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={UBC_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => {
          if (markerPressInFlight.current) return;
          setSelectedZone(null);
          setSelectedEvent(null);
        }}
      >
        {filteredZones.map(zone => {
          const unlocked = isZoneUnlocked(zone.id);
          const catColor = CATEGORY_COLORS[zone.category];
          const isSelected = selectedZone?.id === zone.id;
          return (
            <React.Fragment key={zone.id}>
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radiusMeters}
                fillColor={unlocked ? 'rgba(52,199,89,0.1)' : `${catColor}15`}
                strokeColor={unlocked ? Brand.success : `${catColor}40`}
                strokeWidth={isSelected ? 2 : 1}
              />
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                onPress={() => handleMarkerPress(zone)}
                onSelect={() => handleMarkerPress(zone)}
                tracksViewChanges={false}
              >
                <View style={[s.marker, isSelected && s.markerSel, unlocked && s.markerDone]}>
                  <Feather 
                    name={zone.icon as any} 
                    size={20} 
                    color={isSelected ? Brand.accent : unlocked ? Brand.success : Brand.primary} 
                  />
                  {unlocked && (
                    <View style={s.chk}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {filteredEvents.map(event => {
          if (!event.latitude || !event.longitude) return null;
          const isSelected = selectedEvent?.id === event.id;
          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              onPress={() => handleEventMarkerPress(event)}
            >
              <View style={[
                s.marker,
                { borderColor: Brand.accent, backgroundColor: '#FFF9F0' },
                isSelected && s.markerSel,
              ]}>
                <Feather 
                  name="calendar" 
                  size={20} 
                  color={isSelected ? Brand.accent : Brand.primary} 
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top stats */}
      <View style={[s.topBar, { top: insetTop + 8 }]}>
        <View style={s.stats}>
          <View style={s.si}>
            <Text style={s.sv}>{progress.percentage}%</Text>
            <Text style={s.sl}>Explored</Text>
          </View>
          <View style={s.div} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.primary }]}>{totalPoints}</Text>
            <Text style={s.sl}>Points</Text>
          </View>
          <View style={s.div} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.accent }]}>{progress.unlocked}/{progress.total}</Text>
            <Text style={s.sl}>Zones</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={[s.filterC, { top: insetTop + 68 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterR}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key} onPress={() => setActiveCategory(cat.key)} activeOpacity={0.7}>
              <View style={[s.pill, activeCategory === cat.key && s.pillA]}>
                <Feather 
                  name={cat.icon as any} 
                  size={14} 
                  color={activeCategory === cat.key ? '#fff' : Brand.primary} 
                />
                <Text style={[s.pillL, activeCategory === cat.key && s.pillLA]}>{cat.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recenter */}
      <TouchableOpacity style={[s.recenter, { bottom: (selectedZone || selectedEvent) ? 260 : 100 }]} onPress={() => mapRef.current?.animateToRegion(UBC_CENTER, 500)} activeOpacity={0.8}>
        <Feather name="navigation" size={20} color={Brand.primary} />
      </TouchableOpacity>

      {/* Bottom card for Zone */}
      {selectedZone && (
        <View style={[s.btmWrap, { paddingBottom: insetBottom + 12 }]}>
          <Card style={s.btmCard} noPadding>
            <View style={s.handle} />
            <View style={{ padding: Spacing.lg }}>
              <View style={s.cardH}>
                <View style={[s.cardE, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Feather name={selectedZone.icon as any} size={24} color={CATEGORY_COLORS[selectedZone.category]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardNR}>
                    <Text style={s.cardN}>{selectedZone.name}</Text>
                    {isZoneUnlocked(selectedZone.id) && (
                      <View style={s.expB}>
                        <Feather name="check" size={12} color={Brand.success} />
                        <Text style={s.expBT}>Explored</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardD} numberOfLines={2}>{selectedZone.description}</Text>
                </View>
              </View>
              <View style={s.cardM}>
                <View style={[s.catTag, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Text style={[s.catTT, { color: CATEGORY_COLORS[selectedZone.category] }]}>{selectedZone.category}</Text>
                </View>
                <Text style={s.radT}><Feather name="map-pin" size={10}/> {selectedZone.radiusMeters}m</Text>
                <View style={s.ptB}>
                  <Text style={s.ptT}>+{selectedZone.points} pts</Text>
                </View>
              </View>
              <View style={s.acts}>
                {justUnlocked === selectedZone.id ? (
                  <View style={s.unlockMsg}>
                    <Feather name="check-circle" size={24} color={Brand.success} />
                    <Text style={s.unlockMT}>Zone Unlocked! +{selectedZone.points} pts</Text>
                  </View>
                ) : isZoneUnlocked(selectedZone.id) ? (
                  <Button 
                    title="View Details" 
                    variant="secondary" 
                    onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })} 
                  />
                ) : (
                  <View style={s.actRow}>
                    <Button 
                      title="Unlock Zone" 
                      variant="primary" 
                      style={{ flex: 1 }}
                      onPress={handleUnlock} 
                    />
                    <TouchableOpacity style={s.infoBtn} onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })} activeOpacity={0.8}>
                      <Feather name="info" size={20} color={Brand.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Bottom card for Event */}
      {selectedEvent && (
        <View style={[s.btmWrap, { paddingBottom: insetBottom + 12 }]}>
          <Card style={s.btmCard} noPadding>
            <View style={s.handle} />
            <View style={{ padding: Spacing.lg }}>
              <View style={s.cardH}>
                <View style={[s.cardE, { backgroundColor: '#FFF9F0' }]}>
                  <Feather name="calendar" size={24} color={Brand.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardNR}>
                    <Text style={s.cardN}>{selectedEvent.title}</Text>
                  </View>
                  <Text style={s.cardD} numberOfLines={2}>{selectedEvent.description}</Text>
                </View>
              </View>
              <View style={s.cardM}>
                <View style={[s.catTag, { backgroundColor: `${Brand.accent}15` }]}>
                  <Text style={[s.catTT, { color: Brand.accent }]}>{selectedEvent.club_name || 'Event'}</Text>
                </View>
                {selectedEvent.event_date && (
                  <Text style={s.radT}>
                    <Feather name="clock" size={10}/> {new Date(selectedEvent.event_date).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={s.acts}>
                <Button 
                  title="View Event Details" 
                  variant="primary" 
                  onPress={() => router.push({ pathname: '/event-detail', params: { eventId: selectedEvent.id } })} 
                />
              </View>
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background },
  marker: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Surfaces.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border },
  markerSel: { borderColor: Brand.accent, borderWidth: 2, transform: [{ scale: 1.15 }] },
  markerDone: { borderColor: Brand.success, backgroundColor: '#F0FDF4' },
  chk: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
  
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  stats: { flexDirection: 'row', backgroundColor: Surfaces.background, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: Surfaces.border },
  si: { flex: 1, alignItems: 'center' },
  sv: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  sl: { fontFamily: Typography.fonts.caption, fontSize: 10, color: Brand.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  div: { width: 1, height: 28, backgroundColor: Surfaces.border },
  
  filterC: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  filterR: { paddingHorizontal: 16, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border, gap: 6 },
  pillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillL: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.primary },
  pillLA: { color: Surfaces.background },
  
  recenter: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Surfaces.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border, zIndex: 10 },
  
  btmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  btmCard: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Surfaces.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  cardH: { flexDirection: 'row', gap: 14 },
  cardE: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardNR: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardN: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  expB: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  expBT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.success },
  cardD: { fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary, marginTop: 4, lineHeight: 20 },
  cardM: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  catTT: { fontFamily: Typography.fonts.caption, fontSize: 11, textTransform: 'capitalize' },
  radT: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.secondary },
  ptB: { backgroundColor: Surfaces.default, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, marginLeft: 'auto', borderWidth: 1, borderColor: Surfaces.border },
  ptT: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.primary },
  acts: { marginTop: 16 },
  actRow: { flexDirection: 'row', gap: 10 },
  infoBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  unlockMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  unlockMT: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.success },
});
