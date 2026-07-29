import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
    documentUploads,
    verificationChecks,
    uploadFicaDocument,
    completeVerificationQuestions,
    completeHomeAffairsCheck,
  } = useAuth();
  const subtleBackground = useThemeColor({ light: '#f6f9fc', dark: '#16315a' }, 'surfaceMuted');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const [uploadingTitle, setUploadingTitle] = useState('');

  const completedCount = useMemo(
    () => ficaDocuments.filter((item) => uploaded[item.title]).length,
    [ficaDocuments, uploaded]
  );
  const latestUploadsByTitle = useMemo(() => {
    return documentUploads.reduce<Record<string, (typeof documentUploads)[number]>>((accumulator, documentUpload) => {
      if (!accumulator[documentUpload.title]) {
        accumulator[documentUpload.title] = documentUpload;
      }
      return accumulator;
    }, {});
  }, [documentUploads]);

  async function handlePrimaryAction() {
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

  async function handleDocumentAction(title: string) {
    if (title === 'Verification questions') {
      await completeVerificationQuestions();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setUploadingTitle(title);
    try {
      await uploadFicaDocument(title, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        file: asset.file ?? null,
      });
    } finally {
      setUploadingTitle('');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="FICA upload"
        title="Upload documents before full access."
        description="Each required item is now backed by a real file upload flow. Complete the verification questions in-app, then finish with the Home Affairs match."
      />

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.statusCard}>
        <ThemedText type="cardLabel">Verification progress</ThemedText>
        <ThemedText type="balance">
          {completedCount} / {ficaDocuments.length}
        </ThemedText>
        <ThemedText style={styles.supportText}>
          {verificationChecks.ficaUploaded
            ? 'Your FICA pack is complete. The next step is the Home Affairs identity match.'
            : 'Upload each required document and complete the question step to unlock your final identity review.'}
        </ThemedText>
      </ThemedView>

      {ficaDocuments.map((item) => {
        const done = uploaded[item.title];
        const documentUpload = latestUploadsByTitle[item.title];
        const isQuestionStep = item.title === 'Verification questions';

        return (
          <ThemedView
            key={item.title}
            style={[
              styles.documentCard,
              {
                backgroundColor: done ? subtleBackground : inputBackground,
                borderColor,
              },
            ]}>
            <View style={styles.documentCopy}>
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
              {documentUpload ? (
                <ThemedText style={styles.metaText}>
                  {documentUpload.originalName} · {Math.max(Math.round(documentUpload.sizeBytes / 1024), 1)} KB
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.documentActionRow}>
              <StatusChip
                label={done ? (documentUpload?.status ?? 'Uploaded') : 'Pending'}
                tone={done ? 'success' : 'neutral'}
              />
              <AppButton
                label={
                  uploadingTitle === item.title
                    ? 'Uploading...'
                    : isQuestionStep
                      ? done
                        ? 'Questions saved'
                        : 'Complete questions'
                      : done
                        ? 'Replace file'
                        : 'Upload file'
                }
                onPress={() => handleDocumentAction(item.title)}
                variant={done ? 'ghost' : 'secondary'}
                disabled={uploadingTitle === item.title || (isQuestionStep && done)}
              />
            </View>
          </ThemedView>
        );
      })}

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.actionPanel}>
        <ThemedText type="sectionTitle">What happens next</ThemedText>
        <ThemedText style={styles.supportText}>
          {verificationChecks.ficaUploaded
            ? 'Your uploaded documents and question step are ready for the final Home Affairs identity match.'
            : 'Once all required files are uploaded and questions are completed, PayVaylt can move you into the final account review.'}
        </ThemedText>

        <AppButton
          label={
            verificationChecks.homeAffairsMatched
              ? 'Open full dashboard'
              : verificationChecks.ficaUploaded
                ? 'Continue to account review'
                : 'Review account progress'
          }
          onPress={handlePrimaryAction}
        />

        {verificationChecks.ficaUploaded && !verificationChecks.homeAffairsMatched ? (
          <AppButton
            label="Run Home Affairs match now"
            onPress={handleHomeAffairsMatch}
            variant="secondary"
          />
        ) : (
          <AppButton
            label="Review account progress"
            onPress={() => router.replace('/(tabs)/activity')}
            variant="secondary"
          />
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
    gap: 14,
  },
  documentCopy: {
    gap: 8,
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
  metaText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.68,
  },
});
