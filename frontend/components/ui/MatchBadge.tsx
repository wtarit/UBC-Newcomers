/**
 * MatchBadge — Animated compatibility score badge
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Brand, Radius, Typography } from '@/constants/Colors';

interface MatchBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 85) return Brand.accent;
  if (score >= 70) return Brand.primary;
  if (score >= 50) return Brand.warning;
  return Brand.error;
}

export function MatchBadge({ score, size = 'md' }: MatchBadgeProps) {
  const color = getScoreColor(score);
  const sizeStyles = {
    sm: { width: 36, height: 36, fontSize: 12 },
    md: { width: 48, height: 48, fontSize: 16 },
    lg: { width: 64, height: 64, fontSize: 22 },
  };
  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          width: s.width,
          height: s.height,
          backgroundColor: `${color}20`,
          borderColor: `${color}60`,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: s.fontSize, color }]}>
        {score}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Typography.fonts.h3,
  },
});
