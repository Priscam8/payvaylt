import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { payvayltData } from '@/constants/payvaylt-data';
import { useThemeColor } from '@/hooks/use-theme-color';

type BrandLockupProps = {
  align?: 'left' | 'center';
  size?: 'hero' | 'section' | 'compact';
  showTagline?: boolean;
};

const sizeMap = {
  hero: {
    symbol: 112,
    pay: 40,
    vaylt: 40,
    tagline: 15,
    gap: 10,
  },
  section: {
    symbol: 84,
    pay: 32,
    vaylt: 32,
    tagline: 14,
    gap: 8,
  },
  compact: {
    symbol: 58,
    pay: 24,
    vaylt: 24,
    tagline: 12,
    gap: 6,
  },
} as const;

export function BrandLockup({
  align = 'left',
  size = 'section',
  showTagline = true,
}: BrandLockupProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const metrics = sizeMap[size];

  return (
    <View
      style={[
        styles.wrapper,
        align === 'center' ? styles.center : undefined,
      ]}>
      <View
        style={[
          styles.symbolShell,
          {
            width: metrics.symbol,
            height: metrics.symbol,
          },
        ]}>
        <Image
          source={require('@/assets/images/payvaylt-symbol-transparent.png')}
          contentFit="contain"
          style={{ width: metrics.symbol, height: metrics.symbol }}
        />
      </View>

      <View style={[styles.textGroup, align === 'center' ? styles.center : undefined]}>
        <View style={[styles.wordmarkRow, align === 'center' ? styles.wordmarkCenter : undefined]}>
          <ThemedText
            style={[
              styles.wordmarkText,
              {
                fontSize: metrics.pay,
                lineHeight: metrics.pay,
                color: tintColor,
              },
            ]}>
            Pay
          </ThemedText>
          <ThemedText
            style={[
              styles.wordmarkText,
              {
                fontSize: metrics.vaylt,
                lineHeight: metrics.vaylt,
                color: textColor,
              },
            ]}>
            Vaylt
          </ThemedText>
        </View>

        {showTagline ? (
          <ThemedText
            style={[
              styles.tagline,
              {
                fontSize: metrics.tagline,
                lineHeight: metrics.tagline + 4,
              },
            ]}>
            {payvayltData.brand.tagline}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  center: {
    alignItems: 'center',
  },
  symbolShell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  textGroup: {
    gap: 5,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  wordmarkCenter: {
    justifyContent: 'center',
  },
  wordmarkText: {
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  tagline: {
    opacity: 0.68,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
