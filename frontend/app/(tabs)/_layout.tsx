/**
 * Tab Layout — Bottom tab bar with 3 main tabs
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Brand, Surfaces, Typography, Spacing } from '@/constants/Colors';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, props.focused && styles.iconWrapActive]}>
      <FontAwesome size={22} {...props} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.accent,
        tabBarInactiveTintColor: Brand.secondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="map" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="users" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Surfaces.default,
    borderTopWidth: 1,
    borderTopColor: Surfaces.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  tabLabel: {
    fontFamily: Typography.fonts.caption,
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  tabItem: {
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    borderRadius: 15,
  },
  iconWrapActive: {
    backgroundColor: `${Brand.accent}15`,
  },
});
