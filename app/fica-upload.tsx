import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function FicaUploadScreen() {
  const router = useRouter();
  const { ficaDocuments } = payvayltData;
  const {
    ficaDocuments: uploaded,
    verificationChecks,
    toggleFicaDocument,
    finalizeFicaReview,
    completeHomeAffairsCheck,
  } = useAuth();
  const subtleBackground = useThemeColor({ light: '#f6f9fc', dark: '#16315a' }, 'surfaceMuted');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const borderColor = useThemeColor({}, 'border');

  const completedCount = useMemo(
    () => ficaDocuments.filter((item) => uploaded[item.title]).length,
    [ficaDocuments, uploaded]
  );
  const documentsReady = ficaDocuments.every((item) => uploaded[item.title]);

  async function handlePrimaryAction() {
    if (!verificationChecks.ficaUploaded) {
      if (!documentsReady) return;
      await finalizeFicaReview();
      router.replace('/(tabs)/activity');
      return;
    }

    if (!verificationChecks.homeAffairsMatched) {
      router.replace('/(tabs)/activity');
      return;
    }

    router.replace('/(tabs)');
  }

  async function handleHomeAffairsMatch() {
    await completeHomeAffairsCheck();
    router.replace('/(tabs)/activity');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="FICA upload"
        title="Complete verification before full access."
        description="New accounts move through document upload, verification questions, and identity matching before the full PayVaylt dashboard is unlocked."
      />

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.statusCard}>
        <ThemedText type="cardLabel">Verification progress</ThemedText>
        <ThemedText type="balance">
          {completedCount} / {ficaDocuments.length}
        </ThemedText>
        <ThemedText style={styles.supportText}>
          {verificationChecks.ficaUploaded
            ? 'Your FICA pack is marked as submitted. The next step is the Home Affairs identity match.'
            : 'This screen acts as the entry point for ID, proof of address, selfie match, and question verification in the current prototype.'}
        </ThemedText>
      </ThemedView>

      {ficaDocuments.map((item) => {
        const done = uploaded[item.title];

        return (
          <ThemedView
            key={item.title}
            style={[
              styles.documentCard,
              {
                backgroundColor: done ? subtleBackground : inputBackground,
                borderColor,
              },
              verificationChecks.ficaUploaded ? styles.documentCardDisabled : undefined,
            ]}>
            <InfoRow
              icon={
                item.title.includes('ID')
                  ? 'badge'
                  : item.title.includes('address')
                    ? 'home-work'
                    : item.title.includes('Selfie')
                      ? 'photo-camera-front'
                      : 'quiz'
              }
              title={item.title}
              detail={item.detail}
              tone={done ? 'success' : 'neutral'}
            />
            <View style={styles.documentActionRow}>
              <StatusChip label={done ? 'Uploaded' : 'Pending'} tone={done ? 'success' : 'neutral'} />
              {!verificationChecks.ficaUploaded ? (
                <AppButton
                  label={done ? 'Remove' : 'Mark as uploaded'}
                  onPress={() => toggleFicaDocument(item.title)}
                  variant={done ? 'ghost' : 'secondary'}
                />
              ) : null}
            </View>
          </ThemedView>
        );
      })}

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.actionPanel}>
        <ThemedText type="sectionTitle">What happens next</ThemedText>
        <ThemedText style={styles.supportText}>
          {verificationChecks.ficaUploaded
            ? 'Your documents can now feed into Home Affairs matching and the final account-review step.'
            : 'Once these steps are complete, PayVaylt can continue to review documents, identity questions, and the remaining account checks.'}
        </ThemedText>

        <AppButton
          label={
            !verificationChecks.ficaUploaded
              ? 'Submit documents for review'
              : verificationChecks.homeAffairsMatched
                ? 'Open full dashboard'
                : 'Continue to account review'
          }
          onPress={handlePrimaryAction}
          disabled={!verificationChecks.ficaUploaded && !documentsReady}
        />

        {verificationChecks.ficaUploaded && !verificationChecks.homeAffairsMatched ? (
          <AppButton label="Run Home Affairs match now" onPress={handleHomeAffairsMatch} variant="secondary" />
        ) : (
          <AppButton label="Review account progress" onPress={() => router.replace('/(tabs)/activity')} variant="secondary" />
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 120,
    gap: 18,
  },
  statusCard: {
    borderRadius: 28,
    padding: 20,
    gap: 10,
  },
  documentCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  documentCardDisabled: {
    opacity: 0.7,
  },
  documentCopy: {
    flex: 1,
    gap: 4,
  },
  documentActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  actionPanel: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.76,
  },
});
