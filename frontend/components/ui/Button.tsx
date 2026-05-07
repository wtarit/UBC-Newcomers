/**
 * Button — Clean clinical button component for Verdana Health
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle, ActivityIndicator } from 'react-native';
import { Brand, Typography, Radius, Shadows } from '@/constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive';

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 14, fontSize: 14, height: 32 },
    md: { paddingVertical: 10, paddingHorizontal: 22, fontSize: 14, height: 42 },
    lg: { paddingVertical: 12, paddingHorizontal: 28, fontSize: 16, height: 48 },
  };
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          paddingHorizontal: s.paddingHorizontal,
          height: s.height,
          opacity: disabled ? 0.4 : 1,
        },
        variant === 'primary' && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDestructive && styles.destructive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? Brand.primary : '#fff'} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: s.fontSize },
            variant === 'primary' && styles.primaryText,
            isSecondary && styles.secondaryText,
            isGhost && styles.ghostText,
            isDestructive && styles.destructiveText,
          ]}
        >
          {icon ? `${icon}  ${title}` : title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontFamily: Typography.fonts.h4,
    letterSpacing: 0.3,
  },
  primary: {
    backgroundColor: Brand.primary,
    ...Shadows.sm,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  secondaryText: {
    color: Brand.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Brand.secondary,
  },
  destructive: {
    backgroundColor: Brand.error,
    ...Shadows.sm,
  },
  destructiveText: {
    color: '#FFFFFF',
  },
});
