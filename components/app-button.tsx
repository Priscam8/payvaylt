import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: AppButtonProps) {
  const secondaryBackground = useThemeColor({ light: 'rgba(105, 198, 61, 0.12)', dark: '#17321d' }, 'accentSoft');
  const ghostBackground = useThemeColor({ light: '#edf4fb', dark: '#183255' }, 'surfaceMuted');
  const ghostBorder = useThemeColor({ light: 'rgba(11, 102, 218, 0.08)', dark: '#2d4b72' }, 'border');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : undefined,
        variant === 'secondary'
          ? {
              ...styles.secondary,
              backgroundColor: secondaryBackground,
              borderColor: 'rgba(105, 198, 61, 0.18)',
            }
          : undefined,
        variant === 'ghost'
          ? {
              ...styles.ghost,
              backgroundColor: ghostBackground,
              borderColor: ghostBorder,
            }
          : undefined,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
      ]}>
      <ThemedText
        type="defaultSemiBold"
        lightColor={variant === 'primary' ? '#ffffff' : undefined}
        darkColor={
          variant === 'primary' ? '#091427' : variant === 'secondary' || variant === 'ghost' ? '#f5f8ff' : undefined
        }>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#0b66da',
    shadowColor: '#0b66da',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  secondary: {
    borderWidth: 1,
  },
  ghost: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
});
