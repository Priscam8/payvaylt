import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function InfoRow({
  icon,
  title,
  detail,
  tone = 'neutral',
}: {
  icon: string;
  title: string;
  detail: string;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
}) {
  const neutral = useThemeColor({ light: '#edf4fb', dark: '#183255' }, 'surfaceMuted');
  const success = useThemeColor({ light: '#eef8e7', dark: '#17321d' }, 'accentSoft');
  const warning = useThemeColor({ light: '#fff4cf', dark: '#4b3b11' }, 'highlight');
  const info = useThemeColor({ light: '#e7f1ff', dark: '#14345f' }, 'primarySoft');
  const iconColor = useThemeColor({ light: '#18407c', dark: '#d6e8ff' }, 'text');

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.iconShell,
          {
            backgroundColor:
              tone === 'neutral' ? neutral : tone === 'success' ? success : tone === 'warning' ? warning : info,
          },
        ]}>
        <MaterialIcons name={icon as any} size={18} color={iconColor as string} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="cardTitle">{title}</ThemedText>
        <ThemedText style={styles.detail}>{detail}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  detail: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
