/**
 * MatchBadge — Animated compatibility score badge with circular progress
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Brand, Radius, Typography } from '@/constants/Colors';
import { ProgressRing } from './ProgressRing';

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
  const sizeConfig = {
    sm: { size: 40, strokeWidth: 4, fontSize: 10 },
    md: { size: 56, strokeWidth: 5, fontSize: 13 },
    lg: { size: 72, strokeWidth: 6, fontSize: 16 },
  };
  const config = sizeConfig[size];

  return (
    <View style={styles.container}>
      <ProgressRing
        progress={score}
        size={config.size}
        strokeWidth={config.strokeWidth}
        color={color}
        label={`${score}%`}
        fontSize={config.fontSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
