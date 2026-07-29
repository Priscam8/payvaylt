import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandLockup } from '@/components/brand-lockup';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type BrandHeroCardProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
  compact?: boolean;
  showTagline?: boolean;
}>;

export function BrandHeroCard({
  eyebrow,
  title,
  description,
  align = 'left',
  compact = false,
  showTagline = false,
  children,
}: BrandHeroCardProps) {
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const accentColor = useThemeColor({}, 'accent');
  const primarySoft = useThemeColor({}, 'primarySoft');
  const highlight = useThemeColor({}, 'highlight');

  return (
    <ThemedView
      lightColor="#ffffff"
      darkColor="#10213a"
      style={[
        styles.card,
        {
          borderColor,
        },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.topOrb,
          { backgroundColor: `${tintColor}10` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.bottomOrb,
          { backgroundColor: `${accentColor}16` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.highlightBlock,
          { backgroundColor: primarySoft },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.highlightPill,
          { backgroundColor: highlight },
        ]}
      />

      <View style={[styles.content, align === 'center' ? styles.center : undefined]}>
        <BrandLockup
          align={align}
          size={compact ? 'section' : 'hero'}
          showTagline={showTagline}
        />

        {eyebrow ? (
          <ThemedText
            type="eyebrow"
            style={align === 'center' ? styles.textCenter : undefined}>
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText
          type="hero"
          style={[
            compact ? styles.compactTitle : undefined,
            align === 'center' ? styles.textCenter : undefined,
          ]}>
          {title}
        </ThemedText>
        <ThemedText
          style={[
            styles.description,
            align === 'center' ? styles.textCenter : undefined,
          ]}>
          {description}
        </ThemedText>

        {children}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  topOrb: {
    width: 210,
    height: 210,
    top: -98,
    right: -64,
  },
  bottomOrb: {
    width: 170,
    height: 170,
    bottom: -82,
    left: -42,
  },
  highlightBlock: {
    position: 'absolute',
    width: 156,
    height: 88,
    borderBottomLeftRadius: 34,
    bottom: 0,
    right: 0,
    opacity: 0.42,
  },
  highlightPill: {
    position: 'absolute',
    width: 128,
    height: 30,
    top: 18,
    right: 18,
    borderRadius: 999,
    opacity: 0.5,
  },
  content: {
    gap: 12,
    padding: 24,
  },
  center: {
    alignItems: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 30,
    lineHeight: 34,
  },
  description: {
    maxWidth: 560,
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.78,
  },
});
