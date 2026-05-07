/**
 * ExploreMap — Web version (Light Theme)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform,
} from 'react-native';
import { router } from 'expo-router';

import { Brand, Surfaces, Typography, Spacing, Radius, Shadows } from '@/constants/Colors';
import { EXPLORE_ZONES, CATEGORY_COLORS, type ExploreZone } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// UBC campus center
const CENTER = { lat: 49.2606, lng: -123.2460 };
const ZOOM = 14;

// ── Mercator projection helpers (matches Leaflet at any zoom) ──────────────
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

// ── Leaflet map HTML injected into the iframe ──────────────────────────────
function buildMapHTML(centerLat: number, centerLng: number, zoom: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #F8FAFC; overflow: hidden; }
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

    // Light theme tiles for Verdana Health
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  </script>
</body>
</html>`;
}

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
      {/* ── IFRAME MAP (base layer) ── */}
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

      {/* ── ZONE MARKERS overlay ── */}
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

          const ringPx = Math.max(zone.radiusMeters * 0.093 * 2, 44);

          return (
            <TouchableOpacity
              key={zone.id}
              activeOpacity={0.85}
              onPress={() => handleMarkerPress(zone)}
              style={[s.markerWrap, { left: x - 24, top: y - 24 }]}
            >
              {/* Radius ring */}
              <View style={[s.radiusRing, {
                width: ringPx,
                height: ringPx,
                borderRadius: ringPx / 2,
                left: -(ringPx / 2) + 24,
                top: -(ringPx / 2) + 24,
                borderColor: unlocked ? 'rgba(34,197,94,0.4)' : `${catColor}40`,
                backgroundColor: unlocked ? 'rgba(34,197,94,0.15)' : `${catColor}15`,
              }]} />

              {/* Marker bubble */}
              <View style={[
                s.marker,
                isSelected && s.markerSel,
                unlocked && s.markerDone,
              ]}>
                <Text style={s.markerE}>{zone.emoji}</Text>
                {unlocked && (
                  <View style={s.chk}><Text style={s.chkT}>✓</Text></View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── FLOATING STATS BAR ── */}
      <View style={[s.topBar, { top: insetTop + 8 }]}>
        <View style={s.stats}>
          <View style={s.si}>
            <Text style={s.sv}>{progress.percentage}%</Text>
            <Text style={s.slb}>Explored</Text>
          </View>
          <View style={s.divider} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.warning }]}>{totalPoints}</Text>
            <Text style={s.slb}>Points</Text>
          </View>
          <View style={s.divider} />
          <View style={s.si}>
            <Text style={[s.sv, { color: Brand.accent }]}>{progress.unlocked}/{progress.total}</Text>
            <Text style={s.slb}>Zones</Text>
          </View>
        </View>
      </View>

      {/* ── CATEGORY FILTERS ── */}
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

      {/* ── BOTTOM ZONE CARD ── */}
      {selectedZone && (
        <View style={[s.btmWrap, { paddingBottom: Math.max(insetBottom, 12) + 12 }]}>
          <Card variant="elevated" style={s.btmCard} noPadding>
            <View style={s.handleBar} />
            <View style={{ padding: Spacing.lg }}>
              <View style={s.cardH}>
                <View style={[s.cardIcon, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}15` }]}>
                  <Text style={{ fontSize: 26 }}>{selectedZone.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.cardNR}>
                    <Text style={s.cardN}>{selectedZone.name}</Text>
                    {isZoneUnlocked(selectedZone.id) && (
                      <View style={s.expB}><Text style={s.expBT}>✓ Explored</Text></View>
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
                <Text style={s.radT}>📍 {selectedZone.radiusMeters}m radius</Text>
                <View style={s.ptBadge}><Text style={s.ptText}>+{selectedZone.points} pts</Text></View>
              </View>

              <View style={s.acts}>
                {justUnlocked === selectedZone.id ? (
                  <View style={s.unlkMsg}>
                    <Text style={{ fontSize: 24 }}>🎉</Text>
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
                      icon="🔓"
                      style={{ flex: 1 }}
                      onPress={handleUnlock}
                    />
                    <TouchableOpacity
                      style={s.infoBtn}
                      onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 20 }}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Tap-away to deselect */}
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
  radiusRing: { position: 'absolute', borderWidth: 1.5 },
  marker: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Surfaces.default,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Surfaces.border,
    ...Shadows.sm,
  },
  markerSel: { borderColor: Brand.primary, borderWidth: 2, transform: [{ scale: 1.15 }], ...Shadows.md },
  markerDone: { borderColor: Brand.success, backgroundColor: '#F0FDF4' },
  markerE: { fontSize: 22 },
  chk: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
  chkT: { fontSize: 9, color: '#fff', fontWeight: '800' },

  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  stats: {
    flexDirection: 'row', backgroundColor: Surfaces.default,
    borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Surfaces.border,
    ...Shadows.DEFAULT,
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
    borderRadius: Radius.full, backgroundColor: Surfaces.default,
    borderWidth: 1, borderColor: Surfaces.border, gap: 5, ...Shadows.sm,
  },
  pillA: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillE: { fontSize: 13 },
  pillL: { fontFamily: Typography.fonts.bodySm, fontSize: 13, color: Brand.primary },
  pillLA: { color: Surfaces.default },

  btmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  btmCard: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: Surfaces.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  cardH: { flexDirection: 'row', gap: 14 },
  cardIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardNR: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardN: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  expB: { backgroundColor: `${Brand.success}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  expBT: { fontFamily: Typography.fonts.caption, fontSize: 11, color: Brand.success },
  cardDesc: { fontFamily: Typography.fonts.bodySm, fontSize: 14, color: Brand.secondary, marginTop: 4, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  catTT: { fontFamily: Typography.fonts.caption, fontSize: 11, textTransform: 'capitalize' },
  radT: { fontFamily: Typography.fonts.bodySm, fontSize: 12, color: Brand.secondary },
  ptBadge: { backgroundColor: `${Brand.warning}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm, marginLeft: 'auto' },
  ptText: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.warning },
  acts: { marginTop: 16 },
  actRow: { flexDirection: 'row', gap: 10 },
  infoBtn: { width: 42, height: 42, borderRadius: Radius.DEFAULT, backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  unlkMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  unlkMT: { fontFamily: Typography.fonts.h3, fontSize: 16, color: Brand.success },
});
