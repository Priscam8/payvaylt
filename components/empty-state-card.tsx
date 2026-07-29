import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export function EmptyStateCard({
  icon,
  title,
  description,
  lightColor = '#ffffff',
  darkColor = '#10213a',
}: {
  icon: string;
  title: string;
  description: string;
  lightColor?: string;
  darkColor?: string;
}) {
  const iconShell = useThemeColor({ light: '#edf4fb', dark: '#183255' }, 'surfaceMuted');
  const iconColor = useThemeColor({ light: '#0b66da', dark: '#d6e8ff' }, 'tint');

  return (
    <ThemedView lightColor={lightColor} darkColor={darkColor} style={styles.card}>
      <View style={[styles.iconShell, { backgroundColor: iconShell }]}>
        <MaterialIcons name={icon as any} size={24} color={iconColor as string} />
      </View>
      <ThemedText type="cardTitle">{title}</ThemedText>
      <ThemedText style={styles.copy}>{description}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(11, 102, 218, 0.08)',
  },
  iconShell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
