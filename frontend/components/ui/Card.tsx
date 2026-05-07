/**
 * Card — Clean clinical card component for Verdana Health
 */
import React from 'react';
import { View, StyleSheet, type ViewProps, Text } from 'react-native';
import { Surfaces, Radius, Spacing, Shadows, Brand, Typography } from '@/constants/Colors';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
  noPadding?: boolean;
  headerLabel?: string; // Optional tinted header strip for Elevated cards
}

export function Card({ variant = 'default', noPadding, headerLabel, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        noPadding && styles.noPadding,
        headerLabel ? { paddingTop: 0 } : {}, // Remove top padding if header is present
        style,
      ]}
      {...props}
    >
      {headerLabel && variant === 'elevated' && (
        <View style={styles.headerStrip}>
          <Text style={styles.headerText}>{headerLabel}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Surfaces.default,
    borderWidth: 1,
    borderColor: Surfaces.border,
    borderRadius: Radius.DEFAULT,
    padding: Spacing.md, // 16px default
  },
  elevated: {
    borderWidth: 0,
    padding: Spacing.lg, // 24px padding for elevated
    ...Shadows.md,
  },
  noPadding: {
    padding: 0,
  },
  headerStrip: {
    backgroundColor: Brand.primary,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: Radius.DEFAULT,
    borderTopRightRadius: Radius.DEFAULT,
    marginBottom: Spacing.md,
  },
  headerText: {
    fontFamily: Typography.fonts.h4,
    fontSize: 14,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
