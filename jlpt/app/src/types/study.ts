export type JlptValue = "N5" | "N4" | "N3" | "N2" | "N1";

export type JlptLevel = {
  jlptLevel: JlptValue;
  wordCount: number;
};

export type WordSeed = {
  id: string;
  jlptLevel: JlptValue;
  sequenceInLevel: number;
  kanji: string;
  kana: string;
  readingHiragana: string;
  meaningKo: string;
  partOfSpeech?: string;
  exampleJp?: string;
  exampleKo?: string;
  isCommonLife?: boolean;
};

export type PresetSeed = {
  jlptLevel: JlptValue;
  sequenceNo: number;
  presetCode: string;
  label: string;
  roundType: "micro" | "block" | "merge";
  rangeStart: number;
  rangeEnd: number;
};

export type PresetRow = {
  id: number;
  jlptLevel: JlptValue;
  sequenceNo: number;
  presetCode: string;
  label: string;
  roundType: "micro" | "block" | "merge";
  rangeStart: number;
  rangeEnd: number;
  completedStudyCount: number;
  roundRecords: StudyRoundRecord[];
};

export type SessionRow = {
  id: string;
  jlptLevel: JlptValue;
  currentPassNo: number;
  presetId: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  totalWords: number;
  knownWords: number;
  studyWords: number;
  isCompleted: number;
  elapsedSeconds: number;
  elapsedMilliseconds: number;
  timerStartedAt: string | null;
};

export type StudyRoundRecord = {
  id: number;
  presetId: number;
  sessionId: string;
  roundNo: number;
  elapsedSeconds: number;
  elapsedMilliseconds: number;
  completedAt: string;
};

export type CurrentCard = {
  wordId: string;
  kanji: string;
  kana: string | null;
  readingHiragana: string | null;
  meaningKo: string;
  partOfSpeech: string | null;
  exampleJp: string | null;
  exampleKo: string | null;
};

export type SessionSnapshot = {
  session: SessionRow;
  preset: PresetRow;
  currentCard: CurrentCard;
  pendingCount: number;
  unseenCount: number;
};

export type HomeActiveSessionSummary = {
  sessionId: string;
  jlptLevel: JlptValue;
  presetLabel: string;
  pendingCount: number;
  nextRoundNo: number;
};
