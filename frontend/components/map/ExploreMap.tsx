/**
 * ExploreMap — Web version (Flat Theme)
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Dimensions, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Brand, Radius, Spacing, Surfaces, Typography } from '@/constants/Colors';
import { CATEGORY_COLORS, type ExploreZone } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CENTER = { lat: 49.2606, lng: -123.2460 };
const ZOOM = 14;

function lngToX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * 256;
}
function latToY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256;
}

function latLngToOffset(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  zoom: number,
  viewW: number, viewH: number
): { x: number; y: number } {
  const cx = lngToX(centerLng, zoom);
  const cy = latToY(centerLat, zoom);
  const px = lngToX(lng, zoom);
  const py = latToY(lat, zoom);
  return {
    x: viewW / 2 + (px - cx),
    y: viewH / 2 + (py - cy),
  };
}

function buildMapHTML(centerLat: number, centerLng: number, zoom: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #FFFFFF; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  </script>
</body>
</html>`;
}

type CategoryFilter = ExploreZone['category'] | 'all';
const CATEGORIES: { key: CategoryFilter; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'map' },
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

export default function ExploreMapWeb({ insetTop, insetBottom }: ExploreMapProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedZone, setSelectedZone] = useState<ExploreZone | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState({ w: SCREEN_W, h: SCREEN_H - 88 });
  const { zones, isZoneUnlocked, getProgress, totalPoints, unlockZone } = useExploreStore();
  const progress = getProgress();

  const filteredZones = activeCategory === 'all'
    ? zones
    : zones.filter(z => z.category === activeCategory);

  const handleMarkerPress = useCallback((zone: ExploreZone) => {
    setSelectedZone(zone);
    setJustUnlocked(null);
  }, []);

  const handleUnlock = useCallback(() => {
    if (!selectedZone) return;
    unlockZone(selectedZone.id);
    setJustUnlocked(selectedZone.id);
  }, [selectedZone, unlockZone]);

  const mapHTML = buildMapHTML(CENTER.lat, CENTER.lng, ZOOM);
  const iframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(mapHTML)}`;

  return (
    <View
      style={s.container}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ w: width, h: height });
      }}
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Platform.OS === 'web' &&
          React.createElement('iframe', {
            src: iframeSrc,
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            },
            scrolling: 'no',
            title: 'UBC Campus Map',
          })
        }
      </View>

      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {filteredZones.map(zone => {
          const { x, y } = latLngToOffset(
            zone.latitude, zone.longitude,
            CENTER.lat, CENTER.lng,
            ZOOM,
            mapSize.w, mapSize.h
          );
          const unlocked = isZoneUnlocked(zone.id);
          const catColor = CATEGORY_COLORS[zone.category];
          const isSelected = selectedZone?.id === zone.id;

          const ringPx = 50 // Math.max(zone.radiusMeters * 0.093 * 2, 44);

          return (
            <TouchableOpacity
              key={zone.id}
              activeOpacity={0.85}
              onPress={() => handleMarkerPress(zone)}
              style={[s.markerWrap, { left: x - 24, top: y - 24 }]}
            >
              <View style={[s.radiusRing, {
                width: ringPx,
                height: ringPx,
                borderRadius: ringPx / 2,
                left: 22 - ringPx / 2,
                top: 22 - ringPx / 2,
                borderColor: unlocked ? Brand.success : `${catColor}40`,
                backgroundColor: unlocked ? 'rgba(52,199,89,0.1)' : `${catColor}15`,
              }]} />

              <View style={[
                s.marker,
                isSelected && s.markerSel,
                unlocked && s.markerDone,
              ]}>
                <Feather 
                  name={zone.icon as any} 
                  size={20} 
                  color={isSelected ? Brand.accent : unlocked ? Brand.success : Brand.primary} 
                />
                {unlocked && (
                  <View style={s.chk}><Feather name="check" size={10} color="#fff" /></View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.topBar, { top: insetTop + 8 }]}>
        <View style={s.stats}>
          <View style={s.si}>
            <Text style={s.sv}>{progress.percentage}%</Text>
            <Text style={s.slb}>Explored</Text>
          </View>
          <View style={s.divider} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.primary }]}>{totalPoints}</Text>
            <Text style={s.slb}>Points</Text>
          </View>
          <View style={s.divider} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.accent }]}>{progress.unlocked}/{progress.total}</Text>
            <Text style={s.slb}>Zones</Text>
          </View>
        </View>
      </View>

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

      {selectedZone && (
        <View style={[s.btmWrap, { paddingBottom: Math.max(insetBottom, 12) + 12 }]}>
          <Card style={s.btmCard} noPadding>
            <View style={s.handleBar} />
            <View style={{ padding: Spacing.lg }}>
              <View style={s.cardH}>
                <View style={[s.cardIcon, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
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
                  <Text style={s.cardDesc} numberOfLines={2}>{selectedZone.description}</Text>
                </View>
              </View>

              <View style={s.cardMeta}>
                <View style={[s.catTag, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Text style={[s.catTT, { color: CATEGORY_COLORS[selectedZone.category] }]}>
                    {selectedZone.category}
                  </Text>
                </View>
                <Text style={s.radT}><Feather name="map-pin" size={10}/> {selectedZone.radiusMeters}m radius</Text>
                <View style={s.ptBadge}>
                  <Text style={s.ptText}>+{selectedZone.points} pts</Text>
                </View>
              </View>

              <View style={s.acts}>
                {justUnlocked === selectedZone.id ? (
                  <View style={s.unlkMsg}>
                    <Feather name="check-circle" size={24} color={Brand.success} />
                    <Text style={s.unlkMT}>Zone Unlocked! +{selectedZone.points} pts</Text>
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
                    <TouchableOpacity
                      style={s.infoBtn}
                      onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })}
                      activeOpacity={0.8}
                    >
                      <Feather name="info" size={20} color={Brand.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {selectedZone && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { zIndex: -1 }]}
          activeOpacity={1}
          onPress={() => setSelectedZone(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surfaces.background },

  markerWrap: { position: 'absolute', alignItems: 'center', zIndex: 5 },
  radiusRing: { position: 'absolute', borderWidth: 2.5 },
  marker: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Surfaces.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Surfaces.border,
  },
  markerSel: { borderColor: Brand.accent, borderWidth: 2, transform: [{ scale: 1.15 }] },
  markerDone: { borderColor: Brand.success, backgroundColor: '#F0FDF4' },
  chk: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
  
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  stats: {
    flexDirection: 'row', backgroundColor: Surfaces.background,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Surfaces.border,
  },
  si: { flex: 1, alignItems: 'center' },
  sv: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  slb: { fontFamily: Typography.fonts.caption, fontSize: 10, color: Brand.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  divider: { width: 1, height: 28, backgroundColor: Surfaces.border },

  filterC: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  filterR: { paddingHorizontal: 16, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Surfaces.background,
    borderWidth: 1, borderColor: Surfaces.border, gap: 6,
  },
  pillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillL: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.primary },
  pillLA: { color: Surfaces.background },

  btmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  btmCard: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: Surfaces.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  cardH: { flexDirection: 'row', gap: 14 },
  cardIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardNR: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardN: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  expB: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  expBT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.success },
  cardDesc: { fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary, marginTop: 4, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  catTT: { fontFamily: Typography.fonts.caption, fontSize: 11, textTransform: 'capitalize' },
  radT: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.secondary },
  ptBadge: { backgroundColor: Surfaces.default, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, marginLeft: 'auto', borderWidth: 1, borderColor: Surfaces.border },
  ptText: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.primary },
  acts: { marginTop: 16 },
  actRow: { flexDirection: 'row', gap: 10 },
  infoBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  unlkMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  unlkMT: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.success },
});
