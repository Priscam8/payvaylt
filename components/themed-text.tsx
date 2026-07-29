import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'hero'
    | 'eyebrow'
    | 'sectionTitle'
    | 'cardTitle'
    | 'cardLabel'
    | 'cardAmount'
    | 'balance'
    | 'chipLabel'
    | 'chipValue';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'hero' ? styles.hero : undefined,
        type === 'eyebrow' ? styles.eyebrow : undefined,
        type === 'sectionTitle' ? styles.sectionTitle : undefined,
        type === 'cardTitle' ? styles.cardTitle : undefined,
        type === 'cardLabel' ? styles.cardLabel : undefined,
        type === 'cardAmount' ? styles.cardAmount : undefined,
        type === 'balance' ? styles.balance : undefined,
        type === 'chipLabel' ? styles.chipLabel : undefined,
        type === 'chipValue' ? styles.chipValue : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '700',
  },
  hero: {
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    opacity: 0.64,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.15,
    opacity: 0.62,
  },
  cardAmount: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  balance: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.65,
  },
  chipValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
});
