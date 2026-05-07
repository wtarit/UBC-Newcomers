import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { api, type ConnectionLocationResponse } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Ionicons, Feather } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

const UBC_CENTER = { lat: 49.2606, lng: -123.2460 };
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapSize, setMapSize] = useState({ w: SCREEN_W, h: 300 });

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

  const connectionsWithLocation = connections.filter(c => c.latitude != null && c.longitude != null);
  const mapHTML = buildMapHTML(UBC_CENTER.lat, UBC_CENTER.lng, ZOOM);
  const iframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(mapHTML)}`;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Connections</Text>
        <Text style={s.sub}>
          {isLoading ? 'Loading...' : `${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
        </Text>
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Feather name="list" size={16} color={viewMode === 'list' ? Surfaces.background : Brand.primary} />
            <Text style={[s.viewBtnT, viewMode === 'list' && s.viewBtnTA]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'map' && s.viewBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Feather name="map" size={16} color={viewMode === 'map' ? Surfaces.background : Brand.primary} />
            <Text style={[s.viewBtnT, viewMode === 'map' && s.viewBtnTA]}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'map' && (
        <View
          style={s.mapContainer}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setMapSize({ w: width, h: height });
          }}
        >
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {Platform.OS === 'web' &&
              React.createElement('iframe', {
                src: iframeSrc,
                style: { width: '100%', height: '100%', border: 'none', display: 'block' },
                scrolling: 'no',
                title: 'Connections Map',
              })
            }
          </View>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {connectionsWithLocation.map(conn => {
              const { x, y } = latLngToOffset(
                conn.latitude!, conn.longitude!,
                UBC_CENTER.lat, UBC_CENTER.lng,
                ZOOM, mapSize.w, mapSize.h,
              );
              return (
                <View key={conn.id} style={[s.mapMarker, { left: x - 18, top: y - 18 }]}>
                  <View style={[s.mapPin, conn.is_available_to_meet && s.mapPinActive]}>
                    <Ionicons name="person" size={16} color={conn.is_available_to_meet ? Surfaces.background : Brand.secondary} />
                  </View>
                  <Text style={s.mapLabel} numberOfLines={1}>{conn.full_name.split(' ')[0]}</Text>
                </View>
              );
            })}
          </View>
          {connectionsWithLocation.length === 0 && (
            <View style={s.mapEmpty}>
              <Text style={s.mapEmptyT}>No connections with location data</Text>
            </View>
          )}
        </View>
      )}

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
  viewToggle: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Surfaces.background, borderWidth: 1, borderColor: Surfaces.border },
  viewBtnActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  viewBtnT: { fontFamily: Typography.fonts.h4, fontSize: 13, color: Brand.primary },
  viewBtnTA: { color: Surfaces.background },
  mapContainer: { height: 260, position: 'relative', borderBottomWidth: 1, borderBottomColor: Surfaces.border },
  mapMarker: { position: 'absolute', alignItems: 'center', zIndex: 5 },
  mapPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Surfaces.background, borderWidth: 2, borderColor: Surfaces.border, alignItems: 'center', justifyContent: 'center' },
  mapPinActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  mapLabel: { fontFamily: Typography.fonts.caption, fontSize: 10, color: Brand.primary, marginTop: 2, maxWidth: 60, textAlign: 'center' },
  mapEmpty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  mapEmptyT: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
  listContainer: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  emptyDesc: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
