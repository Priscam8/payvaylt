import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
}) {
  const neutral = useThemeColor({ light: '#edf4fb', dark: '#183255' }, 'surfaceMuted');
  const success = useThemeColor({ light: '#eef8e7', dark: '#17321d' }, 'accentSoft');
  const warning = useThemeColor({ light: '#fff4cf', dark: '#4b3b11' }, 'highlight');
  const info = useThemeColor({ light: '#e7f1ff', dark: '#14345f' }, 'primarySoft');

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: tone === 'neutral' ? neutral : tone === 'success' ? success : tone === 'warning' ? warning : info },
      ]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
