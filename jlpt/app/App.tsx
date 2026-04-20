import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  applyQueueAction,
  createSessionForPreset,
  getActiveSession,
  getLevels,
  getPresetsByLevel,
  getSessionSnapshot,
} from "./src/features/study/engine";
import { initializeDatabase } from "./src/db/init";
import { useAppStore } from "./src/store/useAppStore";
import type { JlptLevel, PresetRow, SessionSnapshot } from "./src/types/study";

function AppShell() {
  const db = useSQLiteContext();
  const {
    currentLevel,
    currentSessionId,
    openLevel,
    openStudy,
    goHome,
    goPresets,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<JlptLevel[]>([]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [activeSession, setActiveSession] = useState<SessionSnapshot | null>(null);
  const [studySnapshot, setStudySnapshot] = useState<SessionSnapshot | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showReading, setShowReading] = useState(false);

  const screen = useMemo(() => {
    if (currentSessionId) {
      return "study";
    }
    if (currentLevel) {
      return "presets";
    }
    return "levels";
  }, [currentLevel, currentSessionId]);

  const refreshHome = async () => {
    const [nextLevels, nextActiveSession] = await Promise.all([
      getLevels(db),
      getActiveSession(db),
    ]);
    setLevels(nextLevels);
    setActiveSession(nextActiveSession);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        await refreshHome();
      } catch (error) {
        console.error(error);
        Alert.alert("초기화 오류", "앱 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [db]);

  useEffect(() => {
    if (!currentLevel || screen !== "presets") {
      return;
    }

    const loadPresets = async () => {
      try {
        setLoading(true);
        const rows = await getPresetsByLevel(db, currentLevel);
        setPresets(rows);
      } catch (error) {
        console.error(error);
        Alert.alert("세트 로드 실패", "프리셋 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, [currentLevel, db, screen]);

  useEffect(() => {
    if (!currentSessionId || screen !== "study") {
      return;
    }

    const loadSession = async () => {
      try {
        setLoading(true);
        const snapshot = await getSessionSnapshot(db, currentSessionId);
        setStudySnapshot(snapshot);
        setShowMeaning(false);
        setShowReading(false);
      } catch (error) {
        console.error(error);
        Alert.alert("세션 로드 실패", "학습 세션을 열지 못했습니다.");
        setStudySnapshot(null);
        goPresets();
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [currentSessionId, db, screen]);

  const handleStartPreset = async (presetId: number) => {
    try {
      setLoading(true);
      const sessionId = await createSessionForPreset(db, presetId);
      openStudy(sessionId);
      const snapshot = await getSessionSnapshot(db, sessionId);
      setStudySnapshot(snapshot);
      setShowMeaning(false);
      setShowReading(false);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message === "EMPTY_SESSION"
          ? "이 세트에는 아직 남아 있는 카드가 없습니다."
          : "세션을 시작하지 못했습니다.";
      Alert.alert("세션 시작 실패", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeSession) {
      return;
    }
    try {
      openStudy(activeSession.session.id);
      setLoading(true);
      const snapshot = await getSessionSnapshot(db, activeSession.session.id);
      setStudySnapshot(snapshot);
      setShowMeaning(false);
      setShowReading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("세션 복원 실패", "이어하던 세션을 복원하지 못했습니다.");
      setStudySnapshot(null);
      goHome();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "study" | "know") => {
    if (!currentSessionId) {
      return;
    }

    try {
      setLoading(true);
      const result = await applyQueueAction(db, currentSessionId, action);

      if (result.completed) {
        Alert.alert("회독 완료", "남아 있는 카드가 없습니다.");
        setStudySnapshot(null);
        goPresets();
        await refreshHome();
        return;
      }

      const snapshot = await getSessionSnapshot(db, currentSessionId);
      setStudySnapshot(snapshot);
      setShowMeaning(false);
      setShowReading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("학습 처리 실패", "현재 카드를 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !levels.length && screen === "levels") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>JLPT 단어장을 준비하는 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === "levels" ? (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Text style={styles.eyebrow}>Offline First JLPT</Text>
          <Text style={styles.title}>회독 큐 학습</Text>
          <Text style={styles.subtitle}>
            처음 들어올 때 단어를 내려받고, 이후에는 비행기 모드에서도 계속 회독합니다.
          </Text>

          {activeSession ? (
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>이어할 세션</Text>
              <Text style={styles.panelTitle}>
                {activeSession.session.jlptLevel} {activeSession.preset.label}
              </Text>
              <Text style={styles.panelBody}>
                남은 카드 {activeSession.pendingCount}개 · 현재 패스 {activeSession.session.currentPassNo}
              </Text>
              <Pressable style={styles.primaryButton} onPress={handleResume}>
                <Text style={styles.primaryButtonText}>이어하기</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>레벨 선택</Text>
          </View>

          {levels.map((level) => (
            <Pressable
              key={level.jlptLevel}
              style={styles.levelCard}
              onPress={() => openLevel(level.jlptLevel)}
            >
              <View>
                <Text style={styles.levelTitle}>{level.jlptLevel}</Text>
                <Text style={styles.levelMeta}>{level.wordCount}개 샘플 단어</Text>
              </View>
              <Text style={styles.levelChevron}>열기</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {screen === "presets" && currentLevel ? (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.headerRow}>
            <Pressable onPress={goHome}>
              <Text style={styles.backButton}>뒤로</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{currentLevel} 세트</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.subtitle}>
            세트에 들어갈 때마다 시작 순서를 셔플합니다. 한 패스가 끝나면 남은 모르는 카드만 다시 셔플합니다.
          </Text>

          {presets.map((preset) => (
            <Pressable
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handleStartPreset(preset.id)}
            >
              <Text style={styles.presetTitle}>{preset.label}</Text>
              <Text style={styles.presetMeta}>
                {preset.roundType.toUpperCase()} · 범위 {preset.rangeStart}-{preset.rangeEnd}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {screen === "study" && studySnapshot ? (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={async () => {
                goPresets();
                await refreshHome();
              }}
            >
              <Text style={styles.backButton}>나가기</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {studySnapshot.session.jlptLevel} {studySnapshot.preset.label}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progressPanel}>
            <Text style={styles.progressText}>
              패스 {studySnapshot.session.currentPassNo} · 남은 카드 {studySnapshot.pendingCount}
            </Text>
            <Text style={styles.progressSubtext}>
              현재 패스 미확인 {studySnapshot.unseenCount}개
            </Text>
          </View>

          <View style={styles.studyCard}>
            <Text style={styles.kanji}>{studySnapshot.currentCard.kanji}</Text>
            <Text style={styles.partOfSpeech}>{studySnapshot.currentCard.partOfSpeech ?? "단어"}</Text>

            {showMeaning ? (
              <View style={styles.revealBox}>
                <Text style={styles.revealLabel}>한국어</Text>
                <Text style={styles.revealText}>{studySnapshot.currentCard.meaningKo}</Text>
              </View>
            ) : null}

            {showReading ? (
              <View style={styles.revealBox}>
                <Text style={styles.revealLabel}>히라가나</Text>
                <Text style={styles.revealText}>
                  {studySnapshot.currentCard.readingHiragana ?? studySnapshot.currentCard.kana ?? "-"}
                </Text>
              </View>
            ) : null}

            <View style={styles.toggleRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowMeaning((value) => !value)}
              >
                <Text style={styles.secondaryButtonText}>한국어</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowReading((value) => !value)}
              >
                <Text style={styles.secondaryButtonText}>히라가나</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.studyButton]}
                onPress={() => handleAction("study")}
              >
                <Text style={styles.actionButtonText}>공부하겠음</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.knowButton]}
                onPress={() => handleAction("know")}
              >
                <Text style={styles.actionButtonText}>알고있음</Text>
              </Pressable>
            </View>

            {studySnapshot.currentCard.exampleJp ? (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>예문</Text>
                <Text style={styles.exampleText}>{studySnapshot.currentCard.exampleJp}</Text>
                {studySnapshot.currentCard.exampleKo ? (
                  <Text style={styles.exampleSubtext}>{studySnapshot.currentCard.exampleKo}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      {loading && screen !== "levels" ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="jlpt.db" onInit={initializeDatabase}>
        <AppShell />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f4",
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7f4",
    gap: 12,
  },
  loadingText: {
    color: "#37514d",
    fontSize: 15,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#0f766e",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#12312d",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4f6662",
  },
  panel: {
    backgroundColor: "#dff6ef",
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  panelLabel: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#12312d",
  },
  panelBody: {
    color: "#385551",
    fontSize: 15,
  },
  sectionHeader: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#12312d",
  },
  levelCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#12312d",
  },
  levelMeta: {
    color: "#5a706b",
    fontSize: 14,
    marginTop: 4,
  },
  levelChevron: {
    color: "#0f766e",
    fontWeight: "800",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#12312d",
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "700",
  },
  presetCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    gap: 6,
  },
  presetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#12312d",
  },
  presetMeta: {
    color: "#5a706b",
  },
  progressPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#12312d",
  },
  progressSubtext: {
    color: "#5a706b",
  },
  studyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 30,
    padding: 24,
    gap: 16,
  },
  kanji: {
    fontSize: 52,
    fontWeight: "800",
    color: "#12312d",
    textAlign: "center",
    marginTop: 12,
  },
  partOfSpeech: {
    textAlign: "center",
    color: "#6a7c78",
    fontSize: 13,
  },
  revealBox: {
    backgroundColor: "#eef7f2",
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  revealLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f766e",
    textTransform: "uppercase",
  },
  revealText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#12312d",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cde1d8",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#12312d",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  studyButton: {
    backgroundColor: "#12312d",
  },
  knowButton: {
    backgroundColor: "#0f766e",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  exampleBox: {
    backgroundColor: "#f8fbf9",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f766e",
  },
  exampleText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#12312d",
  },
  exampleSubtext: {
    color: "#5a706b",
    lineHeight: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(244,247,244,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#0f766e",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
