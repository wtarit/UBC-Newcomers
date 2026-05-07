/**
 * ExploreMap — Native (iOS/Android) version using react-native-maps
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { router } from 'expo-router';

import { Brand, Surfaces, Typography, Spacing, Radius, Shadows } from '@/constants/Colors';
import { EXPLORE_ZONES, CATEGORY_COLORS, UBC_CENTER, type ExploreZone } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type CategoryFilter = ExploreZone['category'] | 'all';
const CATEGORIES: { key: CategoryFilter; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🗺️' },
  { key: 'nature', label: 'Nature', emoji: '🌿' },
  { key: 'academic', label: 'Academic', emoji: '📚' },
  { key: 'social', label: 'Social', emoji: '🤝' },
  { key: 'culture', label: 'Culture', emoji: '🎭' },
  { key: 'athletics', label: 'Athletics', emoji: '⚡' },
];

interface ExploreMapProps {
  insetTop: number;
  insetBottom: number;
}

export default function ExploreMapNative({ insetTop, insetBottom }: ExploreMapProps) {
  const mapRef = useRef<MapView>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedZone, setSelectedZone] = useState<ExploreZone | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const { zones, isZoneUnlocked, getProgress, totalPoints, unlockZone } = useExploreStore();
  const progress = getProgress();

  const filteredZones = activeCategory === 'all' ? zones : zones.filter(z => z.category === activeCategory);

  const handleMarkerPress = useCallback((zone: ExploreZone) => {
    setSelectedZone(zone);
    setJustUnlocked(null);
    mapRef.current?.animateToRegion({
      latitude: zone.latitude - 0.003,
      longitude: zone.longitude,
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
        onPress={() => setSelectedZone(null)}
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
                fillColor={unlocked ? 'rgba(34,197,94,0.15)' : `${catColor}15`}
                strokeColor={unlocked ? 'rgba(34,197,94,0.4)' : `${catColor}40`}
                strokeWidth={isSelected ? 2.5 : 1}
              />
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                onPress={() => handleMarkerPress(zone)}
              >
                <View style={[s.marker, isSelected && s.markerSel, unlocked && s.markerDone]}>
                  <Text style={s.markerE}>{zone.emoji}</Text>
                  {unlocked && <View style={s.chk}><Text style={s.chkT}>✓</Text></View>}
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Top stats */}
      <View style={[s.topBar, { top: insetTop + 8 }]}>
        <View style={s.stats}>
          <View style={s.si}><Text style={s.sv}>{progress.percentage}%</Text><Text style={s.sl}>Explored</Text></View>
          <View style={s.div} />
          <View style={s.si}><Text style={[s.sv, { color: Brand.warning }]}>{totalPoints}</Text><Text style={s.sl}>Points</Text></View>
          <View style={s.div} />
          <View style={s.si}><Text style={[s.sv, { color: Brand.accent }]}>{progress.unlocked}/{progress.total}</Text><Text style={s.sl}>Zones</Text></View>
        </View>
      </View>

      {/* Filters */}
      <View style={[s.filterC, { top: insetTop + 68 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterR}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key} onPress={() => setActiveCategory(cat.key)} activeOpacity={0.7}>
              <View style={[s.pill, activeCategory === cat.key && s.pillA]}>
                <Text style={s.pillE}>{cat.emoji}</Text>
                <Text style={[s.pillL, activeCategory === cat.key && s.pillLA]}>{cat.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recenter */}
      <TouchableOpacity style={[s.recenter, { bottom: selectedZone ? 260 : 100 }]} onPress={() => mapRef.current?.animateToRegion(UBC_CENTER, 500)} activeOpacity={0.8}>
        <Text style={{ fontSize: 20 }}>📍</Text>
      </TouchableOpacity>

      {/* Bottom card */}
      {selectedZone && (
        <View style={[s.btmWrap, { paddingBottom: insetBottom + 12 }]}>
          <Card variant="elevated" style={s.btmCard} noPadding>
            <View style={s.handle} />
            <View style={{ padding: Spacing.lg }}>
              <View style={s.cardH}>
                <View style={[s.cardE, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Text style={{ fontSize: 26 }}>{selectedZone.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardNR}>
                    <Text style={s.cardN}>{selectedZone.name}</Text>
                    {isZoneUnlocked(selectedZone.id) && <View style={s.expB}><Text style={s.expBT}>✓ Explored</Text></View>}
                  </View>
                  <Text style={s.cardD} numberOfLines={2}>{selectedZone.description}</Text>
                </View>
              </View>
              <View style={s.cardM}>
                <View style={[s.catTag, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Text style={[s.catTT, { color: CATEGORY_COLORS[selectedZone.category] }]}>{selectedZone.category}</Text>
                </View>
                <Text style={s.radT}>📍 {selectedZone.radiusMeters}m</Text>
                <View style={s.ptB}><Text style={s.ptT}>+{selectedZone.points} pts</Text></View>
              </View>
              <View style={s.acts}>
                {justUnlocked === selectedZone.id ? (
                  <View style={s.unlockMsg}><Text style={{ fontSize: 24 }}>🎉</Text><Text style={s.unlockMT}>Zone Unlocked! +{selectedZone.points} pts</Text></View>
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
                      icon="🔓"
                      onPress={handleUnlock} 
                    />
                    <TouchableOpacity style={s.infoBtn} onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })} activeOpacity={0.8}>
                      <Text style={{ fontSize: 20 }}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  marker: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Surfaces.default, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border, ...Shadows.sm },
  markerSel: { borderColor: Brand.primary, borderWidth: 2, transform: [{ scale: 1.15 }], ...Shadows.md },
  markerDone: { borderColor: Brand.success, backgroundColor: '#F0FDF4' },
  markerE: { fontSize: 22 },
  chk: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
  chkT: { fontSize: 9, color: '#fff', fontWeight: '800' },
  
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  stats: { flexDirection: 'row', backgroundColor: Surfaces.default, borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: Surfaces.border, ...Shadows.DEFAULT },
  si: { flex: 1, alignItems: 'center' },
  sv: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  sl: { fontFamily: Typography.fonts.caption, fontSize: 10, color: Brand.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  div: { width: 1, height: 28, backgroundColor: Surfaces.border },
  
  filterC: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  filterR: { paddingHorizontal: 16, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border, gap: 5, ...Shadows.sm },
  pillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillE: { fontSize: 13 },
  pillL: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.primary },
  pillLA: { color: Surfaces.default },
  
  recenter: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: Surfaces.default, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Surfaces.border, zIndex: 10, ...Shadows.DEFAULT },
  
  btmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  btmCard: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Surfaces.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  cardH: { flexDirection: 'row', gap: 14 },
  cardE: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardNR: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardN: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  expB: { backgroundColor: `${Brand.success}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  expBT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.success },
  cardD: { fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary, marginTop: 4, lineHeight: 20 },
  cardM: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  catTT: { fontFamily: Typography.fonts.caption, fontSize: 11, textTransform: 'capitalize' },
  radT: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.secondary },
  ptB: { backgroundColor: `${Brand.warning}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm, marginLeft: 'auto' },
  ptT: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.warning },
  acts: { marginTop: 16 },
  actRow: { flexDirection: 'row', gap: 10 },
  infoBtn: { width: 42, height: 42, borderRadius: Radius.DEFAULT, backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  unlockMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  unlockMT: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.success },
});
