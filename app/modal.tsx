import { Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { BrandHeroCard } from '@/components/brand-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';

export default function ModalScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        compact
        eyebrow="Product direction"
        title="PayVaylt blueprint"
        description="This version of the app is now shaped around your real idea: a digital lay-by platform that helps customers work towards the goal without losing control of their money."
      />

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.container}>

        <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.block}>
          <ThemedText type="subtitle">Included in this scaffold</ThemedText>
          {payvayltData.mvpScope.map((item) => (
            <ThemedText key={item} style={styles.bullet}>
              - {item}
            </ThemedText>
          ))}
        </ThemedView>

        <ThemedView lightColor="#f8fbf5" darkColor="#15311b" style={styles.block}>
          <ThemedText type="subtitle">Next implementation steps</ThemedText>
          {payvayltData.nextSteps.map((item) => (
            <ThemedText key={item} style={styles.bullet}>
              - {item}
            </ThemedText>
          ))}
        </ThemedView>

        <Link href="/" dismissTo style={styles.link}>
          <ThemedText type="link">Back to dashboard</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  container: {
    borderRadius: 28,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  copy: {
    lineHeight: 22,
  },
  block: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  bullet: {
    lineHeight: 22,
  },
  link: {
    marginTop: 4,
    paddingVertical: 10,
  },
});
