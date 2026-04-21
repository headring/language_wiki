import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { getLevels, getPresetsByLevel } from "./src/features/study/engine";
import { initializeDatabase } from "./src/db/init";
import { useAppStore } from "./src/store/useAppStore";
import type {
  JlptLevel,
  PresetRow,
  SessionRow,
  SessionSnapshot,
  StudyRoundRecord,
} from "./src/types/study";

const SHUFFLE_TRANSITION_MS = 280;

function AppShell() {
  const db = useSQLiteContext();
  const {
    currentLevel,
    currentSessionSnapshot,
    homeActiveSessionSummary,
    isSessionLoading,
    openLevel,
    goHome,
    syncHomeActiveSessionSummary,
    startPreset,
    resumeActiveSession,
    leaveStudy,
    handleQueueAction,
  } = useAppStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isPresetLoading, setIsPresetLoading] = useState(false);
  const [levels, setLevels] = useState<JlptLevel[]>([]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const [isReshuffling, setIsReshuffling] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [recordModalPreset, setRecordModalPreset] = useState<PresetRow | null>(
    null,
  );

  const screen = useMemo(() => {
    if (currentSessionSnapshot) {
      return "study";
    }
    if (currentLevel) {
      return "presets";
    }
    return "levels";
  }, [currentLevel, currentSessionSnapshot]);

  const getStudyProgressLabel = (snapshot: SessionSnapshot) =>
    `${snapshot.session.knownWords}/${snapshot.session.totalWords}`;

  const getRoundLabel = (roundNo: number) => `${roundNo}번째 회독`;
  const getPassLabel = (passNo: number) => `패스 ${passNo}`;
  const getCompletedRoundLabel = (completedStudyCount: number) =>
    completedStudyCount > 0
      ? `${getRoundLabel(completedStudyCount)} 완료`
      : "아직 회독 전";
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
    }

    return `${paddedMinutes}:${paddedSeconds}`;
  };
  const getRoundRecordLabel = (record: StudyRoundRecord) =>
    `${record.roundNo}회차 · ${formatDuration(record.elapsedSeconds)}`;
  const getElapsedSeconds = (session: SessionRow) => {
    if (!session.timerStartedAt) {
      return Math.floor(session.elapsedMilliseconds / 1000);
    }

    const startedAtMs = Date.parse(session.timerStartedAt);

    if (Number.isNaN(startedAtMs)) {
      return Math.floor(session.elapsedMilliseconds / 1000);
    }

    return Math.floor(
      (session.elapsedMilliseconds + Math.max(0, timerNow - startedAtMs)) / 1000,
    );
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setIsBootstrapping(true);
        const nextLevels = await getLevels(db);
        setLevels(nextLevels);
        await syncHomeActiveSessionSummary(db);
      } catch (error) {
        console.error(error);
        Alert.alert("초기화 오류", "앱 데이터를 불러오지 못했습니다.");
      } finally {
        setIsBootstrapping(false);
      }
    };
    void bootstrap();
  }, [db, syncHomeActiveSessionSummary]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const store = useAppStore.getState();

      if (!store.currentSessionId) {
        return;
      }

      if (nextAppState === "active") {
        void store.resumeCurrentSessionTimer(db);
        return;
      }

      if (nextAppState === "inactive" || nextAppState === "background") {
        void store.pauseCurrentSessionTimer(db);
      }
    });
    return () => subscription.remove();
  }, [db]);

  useEffect(() => {
    if (!currentLevel || screen !== "presets") {
      return;
    }

    const loadPresets = async () => {
      try {
        setIsPresetLoading(true);
        const rows = await getPresetsByLevel(db, currentLevel);
        setPresets(rows);
      } catch (error) {
        console.error(error);
        Alert.alert("세트 로드 실패", "프리셋 목록을 불러오지 못했습니다.");
      } finally {
        setIsPresetLoading(false);
      }
    };

    void loadPresets();
  }, [currentLevel, db, screen]);

  useEffect(() => {
    if (!currentSessionSnapshot) {
      return;
    }

    setShowMeaning(false);
    setShowReading(false);
  }, [
    currentSessionSnapshot?.currentCard.wordId,
    currentSessionSnapshot?.session.currentPassNo,
  ]);

  useEffect(() => {
    const isLiveTimer =
      screen === "study" && Boolean(currentSessionSnapshot?.session.timerStartedAt);

    if (!isLiveTimer) {
      return;
    }

    setTimerNow(Date.now());
    const timerId = setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, [
    screen,
    currentSessionSnapshot?.session.id,
    currentSessionSnapshot?.session.timerStartedAt,
  ]);

  const handleStartPreset = async (presetId: number) => {
    try {
      await startPreset(db, presetId);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message === "EMPTY_SESSION"
          ? "이 세트에는 아직 남아 있는 카드가 없습니다."
          : "세션을 시작하지 못했습니다.";
      Alert.alert("세션 시작 실패", message);
    }
  };

  const handleResume = async () => {
    if (!homeActiveSessionSummary) {
      return;
    }

    try {
      await resumeActiveSession(db);
    } catch (error) {
      console.error(error);
      Alert.alert("세션 복원 실패", "이어하던 세션을 복원하지 못했습니다.");
      goHome();
    }
  };

  const handleAction = async (action: "study" | "know") => {
    if (!currentSessionSnapshot) {
      return;
    }

    try {
      const result = await handleQueueAction(db, action);

      if (result.completed) {
        Alert.alert("회독 완료", "남아 있는 카드가 없습니다.");
        return;
      }

      if (result.reshuffled) {
        setIsReshuffling(true);
        await new Promise((resolve) =>
          setTimeout(resolve, SHUFFLE_TRANSITION_MS),
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert("학습 처리 실패", "현재 카드를 처리하지 못했습니다.");
    } finally {
      setIsReshuffling(false);
    }
  };

  if (isBootstrapping && !levels.length && screen === "levels") {
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
            처음 들어올 때 단어를 내려받고, 이후에는 비행기 모드에서도 계속
            회독합니다.
          </Text>

          {homeActiveSessionSummary ? (
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>이어할 세션</Text>
              <Text style={styles.panelTitle}>
                {homeActiveSessionSummary.presetLabel}
              </Text>
              <Text style={styles.panelBody}>
                남은 카드 {homeActiveSessionSummary.pendingCount}개 ·{" "}
                {getRoundLabel(homeActiveSessionSummary.nextRoundNo)}{" "}
                진행 중
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
                <Text style={styles.levelMeta}>
                  {level.wordCount}개 샘플 단어
                </Text>
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
            세트에 들어갈 때마다 시작 순서를 셔플합니다. 한 회독이 끝나면 남은
            모르는 카드만 다시 셔플합니다.
          </Text>

          {presets.map((preset) => (
            <Pressable
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handleStartPreset(preset.id)}
            >
              <View style={styles.presetCardRow}>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetTitle}>{preset.label}</Text>
                  <Text style={styles.presetMeta}>
                    {preset.roundType.toUpperCase()} · 범위 {preset.rangeStart}-
                    {preset.rangeEnd}
                  </Text>
                  <Text style={styles.presetProgress}>
                    {getCompletedRoundLabel(preset.completedStudyCount)}
                  </Text>
                </View>

                <Pressable
                  style={styles.recordButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    setRecordModalPreset(preset);
                  }}
                >
                  <Text style={styles.recordButtonLabel}>기록</Text>
                  <Text style={styles.recordButtonValue}>
                    {preset.roundRecords.length}개
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {screen === "study" && currentSessionSnapshot ? (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => void leaveStudy(db)}
            >
              <Text style={styles.backButton}>나가기</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {currentSessionSnapshot.preset.label}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progressPanel}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressText}>
                {getRoundLabel(
                  currentSessionSnapshot.preset.completedStudyCount + 1,
                )}{" "}
                진행 중
              </Text>
              <Text style={styles.progressBadge}>
                {getStudyProgressLabel(currentSessionSnapshot)}
              </Text>
            </View>
            <Text style={styles.progressSubtext}>
              현재 {getPassLabel(currentSessionSnapshot.session.currentPassNo)} ·
              남은 카드 {currentSessionSnapshot.pendingCount}개
            </Text>
            <Text style={styles.timerText}>
              회독 타이머{" "}
              {formatDuration(
                getElapsedSeconds(currentSessionSnapshot.session),
              )}
            </Text>
          </View>

          <View style={styles.studyCard}>
            <Text style={styles.kanji}>
              {currentSessionSnapshot.currentCard.kanji}
            </Text>
            <Text style={styles.partOfSpeech}>
              {currentSessionSnapshot.currentCard.partOfSpeech ?? "단어"}
            </Text>

            <View style={styles.revealBox}>
              <Text style={styles.revealLabel}>한국어</Text>
              <Text
                style={[
                  styles.revealText,
                  !showMeaning && styles.revealTextHidden,
                ]}
              >
                {showMeaning
                  ? currentSessionSnapshot.currentCard.meaningKo
                  : "뜻 미리보기"}
              </Text>
            </View>

            <View style={styles.revealBox}>
              <Text style={styles.revealLabel}>히라가나</Text>
              <Text
                style={[
                  styles.revealText,
                  !showReading && styles.revealTextHidden,
                ]}
              >
                {showReading
                  ? (currentSessionSnapshot.currentCard.readingHiragana ??
                    currentSessionSnapshot.currentCard.kana ??
                    "-")
                  : "히라가나 미리보기"}
              </Text>
            </View>

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

            {currentSessionSnapshot.currentCard.exampleJp ? (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>예문</Text>
                <Text style={styles.exampleText}>
                  {currentSessionSnapshot.currentCard.exampleJp}
                </Text>
                {currentSessionSnapshot.currentCard.exampleKo ? (
                  <Text style={styles.exampleSubtext}>
                    {currentSessionSnapshot.currentCard.exampleKo}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      {(isPresetLoading || isSessionLoading) &&
      screen !== "levels" &&
      !isReshuffling ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : null}

      {isReshuffling ? (
        <View style={styles.shuffleOverlay}>
          <View style={styles.shufflePanel}>
            <ActivityIndicator size="small" color="#0f766e" />
            <Text style={styles.shuffleTitle}>셔플 중...</Text>
            <Text style={styles.shuffleBody}>
              남아 있는 카드를 다음 회독 순서로 다시 섞고 있습니다.
            </Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={Boolean(recordModalPreset)}
        transparent
        animationType="fade"
        onRequestClose={() => setRecordModalPreset(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>
                  {recordModalPreset?.label ?? "기록"}
                </Text>
                <Text style={styles.modalSubtitle}>회독 시간 기록</Text>
              </View>
              <Pressable onPress={() => setRecordModalPreset(null)}>
                <Text style={styles.modalClose}>닫기</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
            >
              {recordModalPreset?.roundRecords.length ? (
                recordModalPreset.roundRecords.map((record) => (
                  <View key={record.id} style={styles.recordRow}>
                    <Text style={styles.recordRowTitle}>
                      {getRoundRecordLabel(record)}
                    </Text>
                    <Text style={styles.recordRowMeta}>
                      완료 {record.completedAt.replace("T", " ").slice(0, 16)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.recordEmptyState}>
                  <Text style={styles.recordEmptyText}>
                    아직 완료한 회독 기록이 없습니다.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  presetCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  presetInfo: {
    flex: 1,
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
  presetProgress: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  presetRecordPanel: {
    minWidth: 92,
    alignItems: "flex-end",
    gap: 4,
  },
  presetRecordLabel: {
    color: "#6b7f7a",
    fontSize: 12,
    fontWeight: "700",
  },
  presetRecordText: {
    color: "#12312d",
    fontSize: 13,
    fontWeight: "700",
  },
  presetRecordEmpty: {
    color: "#8ba09b",
    fontSize: 13,
  },
  recordButton: {
    minWidth: 74,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#eef7f2",
    alignItems: "center",
    gap: 2,
  },
  recordButtonLabel: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
  },
  recordButtonValue: {
    color: "#12312d",
    fontSize: 14,
    fontWeight: "800",
  },
  progressPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#12312d",
  },
  progressBadge: {
    backgroundColor: "#12312d",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressSubtext: {
    color: "#5a706b",
    lineHeight: 20,
  },
  timerText: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(18,49,45,0.28)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    maxHeight: "72%",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  modalTitleWrap: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#12312d",
  },
  modalSubtitle: {
    color: "#5a706b",
    fontSize: 14,
  },
  modalClose: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "800",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    gap: 10,
  },
  recordRow: {
    backgroundColor: "#f7faf8",
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  recordRowTitle: {
    color: "#12312d",
    fontSize: 16,
    fontWeight: "800",
  },
  recordRowMeta: {
    color: "#5a706b",
    fontSize: 13,
  },
  recordEmptyState: {
    backgroundColor: "#f7faf8",
    borderRadius: 18,
    padding: 18,
  },
  recordEmptyText: {
    color: "#5a706b",
    fontSize: 14,
    lineHeight: 20,
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
    minHeight: 86,
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
    minHeight: 28,
  },
  revealTextHidden: {
    opacity: 0,
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
  shuffleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,49,45,0.16)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  shufflePanel: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    gap: 10,
  },
  shuffleTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#12312d",
  },
  shuffleBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4f6662",
    textAlign: "center",
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
