/**
 * ExploreMap — Web version
 *
 * Uses an iframe with Leaflet + CartoDB Dark Matter tiles as the real map base.
 * React markers are absolutely positioned on top using the same lat/lng bounds,
 * synced to Leaflet's fixed zoom level (14) with scroll/zoom disabled.
 *
 * Marker pixel positions are calculated using the Mercator projection at zoom 14
 * to match exactly where Leaflet places each coordinate in the iframe.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Brand, Surfaces, Typography, Spacing, Radius, Shadows } from '@/constants/Colors';
import { EXPLORE_ZONES, CATEGORY_COLORS, type ExploreZone } from '@/constants/Zones';
import { useExploreStore } from '@/stores/useExploreStore';

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

// Convert a lat/lng to pixel offset from the center of the viewport
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
    html, body { width: 100%; height: 100%; background: #0B0F1A; overflow: hidden; }
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

  const cardVisible = !!selectedZone;

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

      {/* ── ZONE MARKERS overlay (positioned to match Leaflet projection) ── */}
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

          // Radius circle size: scale radiusMeters to pixels at zoom 14
          // At zoom 14, 1 meter ≈ 0.093 pixels (at 49° lat)
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
                borderColor: unlocked ? `${Brand.accent}50` : `${catColor}40`,
                backgroundColor: unlocked ? 'rgba(52,211,153,0.1)' : `${catColor}08`,
              }]} />

              {/* Marker bubble */}
              <View style={[
                s.marker,
                isSelected && s.markerSel,
                unlocked && s.markerDone,
                { borderColor: isSelected ? Brand.primary : unlocked ? Brand.accent : `${catColor}90` },
              ]}>
                <Text style={s.markerE}>{zone.emoji}</Text>
                {unlocked && (
                  <View style={s.chk}><Text style={s.chkT}>✓</Text></View>
                )}
              </View>

              {/* Label pill */}
              <View style={[s.labelWrap, isSelected && s.labelWrapSel]}>
                <Text style={[s.labelT, isSelected && s.labelTSel]} numberOfLines={1}>
                  {zone.name}
                </Text>
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
            <Text style={[s.sv, { color: Brand.warm }]}>{totalPoints}</Text>
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
      <View style={[s.filterC, { top: insetTop + 64 }]}>
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
        <View style={[s.btmCard, { paddingBottom: Math.max(insetBottom, 12) + 12 }]}>
          <View style={s.handleBar} />

          <View style={s.cardH}>
            <View style={[s.cardIcon, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}20` }]}>
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
            <View style={[s.catTag, { backgroundColor: `${CATEGORY_COLORS[selectedZone.category]}20` }]}>
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
              <TouchableOpacity
                style={s.detBtn}
                onPress={() => router.push({ pathname: '/zone-detail', params: { zoneId: selectedZone.id } })}
                activeOpacity={0.8}
              >
                <Text style={s.detBtnT}>View Details</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.actRow}>
                <TouchableOpacity style={s.ulkBtn} onPress={handleUnlock} activeOpacity={0.8}>
                  <LinearGradient colors={[Brand.accent, Brand.accentDark]} style={s.ulkG}>
                    <Text style={s.ulkBT}>🔓 Unlock Zone</Text>
                  </LinearGradient>
                </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#0B0F1A' },

  // Markers
  markerWrap: { position: 'absolute', alignItems: 'center', zIndex: 5 },
  radiusRing: { position: 'absolute', borderWidth: 1.5 },
  marker: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(17,24,39,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
  },
  markerSel: { backgroundColor: 'rgba(79,142,247,0.3)', transform: [{ scale: 1.2 }] },
  markerDone: { backgroundColor: 'rgba(52,211,153,0.25)' },
  markerE: { fontSize: 24 },
  chk: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center' },
  chkT: { fontSize: 9, color: '#fff', fontWeight: '800' },
  labelWrap: { marginTop: 4, backgroundColor: 'rgba(11,15,26,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, maxWidth: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  labelWrapSel: { backgroundColor: `${Brand.primary}35`, borderColor: `${Brand.primary}50` },
  labelT: { fontSize: 10, color: Typography.secondary, fontWeight: '600', textAlign: 'center' },
  labelTSel: { color: Brand.primaryLight },

  // Top stats bar
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,15,26,0.92)',
    borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  si: { flex: 1, alignItems: 'center' },
  sv: { fontSize: 18, fontWeight: '800', color: Brand.primary },
  slb: { fontSize: 10, color: Typography.tertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Filters
  filterC: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
  filterR: { paddingHorizontal: 16, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(11,15,26,0.88)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 5,
  },
  pillA: { backgroundColor: `${Brand.primary}35`, borderColor: `${Brand.primary}70` },
  pillE: { fontSize: 13 },
  pillL: { fontSize: 12, fontWeight: '600', color: Typography.secondary },
  pillLA: { color: Brand.primaryLight },

  // Bottom card
  btmCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(11,15,26,0.97)',
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
    zIndex: 20,
  },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 14 },
  cardH: { flexDirection: 'row', gap: 14 },
  cardIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardNR: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardN: { fontSize: 17, fontWeight: '700', color: Typography.primary },
  expB: { backgroundColor: `${Brand.accent}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  expBT: { fontSize: 11, fontWeight: '700', color: Brand.accent },
  cardDesc: { fontSize: 13, color: Typography.secondary, marginTop: 4, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  catTT: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  radT: { fontSize: 12, color: Typography.tertiary },
  ptBadge: { backgroundColor: `${Brand.warm}20`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, marginLeft: 'auto' },
  ptText: { fontSize: 12, fontWeight: '800', color: Brand.warm },
  acts: { marginTop: 14 },
  actRow: { flexDirection: 'row', gap: 10 },
  ulkBtn: { flex: 1, borderRadius: Radius.full, overflow: 'hidden' },
  ulkG: { paddingVertical: 13, alignItems: 'center', borderRadius: Radius.full },
  ulkBT: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Surfaces.glass, borderWidth: 1, borderColor: Surfaces.glassBorder, alignItems: 'center', justifyContent: 'center' },
  detBtn: { backgroundColor: `${Brand.primary}20`, borderWidth: 1, borderColor: `${Brand.primary}50`, paddingVertical: 13, borderRadius: Radius.full, alignItems: 'center' },
  detBtnT: { color: Brand.primary, fontSize: 15, fontWeight: '700' },
  unlkMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  unlkMT: { fontSize: 16, fontWeight: '800', color: Brand.accent },
});
