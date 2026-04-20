import type { PresetSeed, WordSeed } from "../types/study";

export const WORD_SEEDS: WordSeed[] = [
  { id: "n5-1", jlptLevel: "N5", sequenceInLevel: 1, kanji: "学生", kana: "ガクセイ", readingHiragana: "がくせい", meaningKo: "학생", partOfSpeech: "명사", exampleJp: "彼は日本語学校の学生です。", exampleKo: "그는 일본어학교 학생입니다.", isCommonLife: true },
  { id: "n5-2", jlptLevel: "N5", sequenceInLevel: 2, kanji: "水", kana: "ミズ", readingHiragana: "みず", meaningKo: "물", partOfSpeech: "명사", exampleJp: "水をもう一杯ください。", exampleKo: "물 한 잔 더 주세요.", isCommonLife: true },
  { id: "n5-3", jlptLevel: "N5", sequenceInLevel: 3, kanji: "食べる", kana: "タベル", readingHiragana: "たべる", meaningKo: "먹다", partOfSpeech: "동사", exampleJp: "朝ご飯を食べる。", exampleKo: "아침밥을 먹다.", isCommonLife: true },
  { id: "n5-4", jlptLevel: "N5", sequenceInLevel: 4, kanji: "見る", kana: "ミル", readingHiragana: "みる", meaningKo: "보다", partOfSpeech: "동사", exampleJp: "映画を一緒に見る。", exampleKo: "영화를 함께 보다.", isCommonLife: true },
  { id: "n5-5", jlptLevel: "N5", sequenceInLevel: 5, kanji: "友達", kana: "トモダチ", readingHiragana: "ともだち", meaningKo: "친구", partOfSpeech: "명사", exampleJp: "友達と駅で会う。", exampleKo: "친구와 역에서 만나다.", isCommonLife: true },
  { id: "n5-6", jlptLevel: "N5", sequenceInLevel: 6, kanji: "行く", kana: "イク", readingHiragana: "いく", meaningKo: "가다", partOfSpeech: "동사", exampleJp: "明日スーパーに行く。", exampleKo: "내일 슈퍼에 가다.", isCommonLife: true },

  { id: "n4-1", jlptLevel: "N4", sequenceInLevel: 1, kanji: "準備", kana: "ジュンビ", readingHiragana: "じゅんび", meaningKo: "준비", partOfSpeech: "명사", exampleJp: "出発の準備をする。", exampleKo: "출발 준비를 하다.", isCommonLife: true },
  { id: "n4-2", jlptLevel: "N4", sequenceInLevel: 2, kanji: "遅れる", kana: "オクレル", readingHiragana: "おくれる", meaningKo: "늦다, 늦어지다", partOfSpeech: "동사", exampleJp: "電車が少し遅れている。", exampleKo: "전철이 조금 늦어지고 있다.", isCommonLife: true },
  { id: "n4-3", jlptLevel: "N4", sequenceInLevel: 3, kanji: "必要", kana: "ヒツヨウ", readingHiragana: "ひつよう", meaningKo: "필요", partOfSpeech: "명사", exampleJp: "予約には身分証が必要です。", exampleKo: "예약에는 신분증이 필요합니다.", isCommonLife: true },
  { id: "n4-4", jlptLevel: "N4", sequenceInLevel: 4, kanji: "忘れる", kana: "ワスレル", readingHiragana: "わすれる", meaningKo: "잊다", partOfSpeech: "동사", exampleJp: "傘を忘れないでね。", exampleKo: "우산 잊지 마.", isCommonLife: true },
  { id: "n4-5", jlptLevel: "N4", sequenceInLevel: 5, kanji: "説明", kana: "セツメイ", readingHiragana: "せつめい", meaningKo: "설명", partOfSpeech: "명사", exampleJp: "使い方を簡単に説明します。", exampleKo: "사용법을 간단히 설명하겠습니다.", isCommonLife: true },
  { id: "n4-6", jlptLevel: "N4", sequenceInLevel: 6, kanji: "約束", kana: "ヤクソク", readingHiragana: "やくそく", meaningKo: "약속", partOfSpeech: "명사", exampleJp: "今日は大事な約束がある。", exampleKo: "오늘은 중요한 약속이 있다.", isCommonLife: true },

  { id: "n3-1", jlptLevel: "N3", sequenceInLevel: 1, kanji: "通勤", kana: "ツウキン", readingHiragana: "つうきん", meaningKo: "통근", partOfSpeech: "명사", exampleJp: "毎朝一時間かけて通勤している。", exampleKo: "매일 아침 한 시간 걸려 통근하고 있다.", isCommonLife: true },
  { id: "n3-2", jlptLevel: "N3", sequenceInLevel: 2, kanji: "無理", kana: "ムリ", readingHiragana: "むり", meaningKo: "무리, 불가능", partOfSpeech: "명사", exampleJp: "今日は無理をしないでください。", exampleKo: "오늘은 무리하지 마세요.", isCommonLife: true },
  { id: "n3-3", jlptLevel: "N3", sequenceInLevel: 3, kanji: "確認", kana: "カクニン", readingHiragana: "かくにん", meaningKo: "확인", partOfSpeech: "명사", exampleJp: "予定をもう一度確認します。", exampleKo: "예정을 다시 한번 확인합니다.", isCommonLife: true },
  { id: "n3-4", jlptLevel: "N3", sequenceInLevel: 4, kanji: "増える", kana: "フエル", readingHiragana: "ふえる", meaningKo: "늘다", partOfSpeech: "동사", exampleJp: "最近、外国人のお客さんが増えた。", exampleKo: "최근 외국인 손님이 늘었다.", isCommonLife: true },
  { id: "n3-5", jlptLevel: "N3", sequenceInLevel: 5, kanji: "印象", kana: "インショウ", readingHiragana: "いんしょう", meaningKo: "인상", partOfSpeech: "명사", exampleJp: "彼は落ち着いた印象を与える。", exampleKo: "그는 차분한 인상을 준다.", isCommonLife: true },
  { id: "n3-6", jlptLevel: "N3", sequenceInLevel: 6, kanji: "支度", kana: "シタク", readingHiragana: "したく", meaningKo: "준비, 채비", partOfSpeech: "명사", exampleJp: "出かける支度はできた？", exampleKo: "나갈 준비는 됐어?", isCommonLife: true },

  { id: "n2-1", jlptLevel: "N2", sequenceInLevel: 1, kanji: "対応", kana: "タイオウ", readingHiragana: "たいおう", meaningKo: "대응", partOfSpeech: "명사", exampleJp: "急な変更にも柔軟に対応する。", exampleKo: "갑작스러운 변경에도 유연하게 대응하다.", isCommonLife: true },
  { id: "n2-2", jlptLevel: "N2", sequenceInLevel: 2, kanji: "改善", kana: "カイゼン", readingHiragana: "かいぜん", meaningKo: "개선", partOfSpeech: "명사", exampleJp: "サービスの改善が必要だ。", exampleKo: "서비스 개선이 필요하다.", isCommonLife: true },
  { id: "n2-3", jlptLevel: "N2", sequenceInLevel: 3, kanji: "締切", kana: "シメキリ", readingHiragana: "しめきり", meaningKo: "마감", partOfSpeech: "명사", exampleJp: "締切は金曜日の午後です。", exampleKo: "마감은 금요일 오후입니다.", isCommonLife: true },
  { id: "n2-4", jlptLevel: "N2", sequenceInLevel: 4, kanji: "影響", kana: "エイキョウ", readingHiragana: "えいきょう", meaningKo: "영향", partOfSpeech: "명사", exampleJp: "天候が売上に影響した。", exampleKo: "날씨가 매출에 영향을 주었다.", isCommonLife: true },
  { id: "n2-5", jlptLevel: "N2", sequenceInLevel: 5, kanji: "維持", kana: "イジ", readingHiragana: "いじ", meaningKo: "유지", partOfSpeech: "명사", exampleJp: "品質を維持するのは簡単ではない。", exampleKo: "품질을 유지하는 건 쉽지 않다.", isCommonLife: true },
  { id: "n2-6", jlptLevel: "N2", sequenceInLevel: 6, kanji: "共有", kana: "キョウユウ", readingHiragana: "きょうゆう", meaningKo: "공유", partOfSpeech: "명사", exampleJp: "情報をチームで共有してください。", exampleKo: "정보를 팀에서 공유해 주세요.", isCommonLife: true },

  { id: "n1-1", jlptLevel: "N1", sequenceInLevel: 1, kanji: "調整", kana: "チョウセイ", readingHiragana: "ちょうせい", meaningKo: "조정", partOfSpeech: "명사", exampleJp: "会議の日程を調整しています。", exampleKo: "회의 일정을 조정하고 있습니다.", isCommonLife: true },
  { id: "n1-2", jlptLevel: "N1", sequenceInLevel: 2, kanji: "検討", kana: "ケントウ", readingHiragana: "けんとう", meaningKo: "검토", partOfSpeech: "명사", exampleJp: "その案は前向きに検討します。", exampleKo: "그 안은 긍정적으로 검토하겠습니다.", isCommonLife: true },
  { id: "n1-3", jlptLevel: "N1", sequenceInLevel: 3, kanji: "納得", kana: "ナットク", readingHiragana: "なっとく", meaningKo: "납득", partOfSpeech: "명사", exampleJp: "説明を聞いて納得した。", exampleKo: "설명을 듣고 납득했다.", isCommonLife: true },
  { id: "n1-4", jlptLevel: "N1", sequenceInLevel: 4, kanji: "余裕", kana: "ヨユウ", readingHiragana: "よゆう", meaningKo: "여유", partOfSpeech: "명사", exampleJp: "今日は少し時間に余裕がある。", exampleKo: "오늘은 시간에 조금 여유가 있다.", isCommonLife: true },
  { id: "n1-5", jlptLevel: "N1", sequenceInLevel: 5, kanji: "手配", kana: "テハイ", readingHiragana: "てはい", meaningKo: "준비, 수배, 주선", partOfSpeech: "명사", exampleJp: "必要な資料はこちらで手配します。", exampleKo: "필요한 자료는 이쪽에서 준비하겠습니다.", isCommonLife: true },
  { id: "n1-6", jlptLevel: "N1", sequenceInLevel: 6, kanji: "気配", kana: "ケハイ", readingHiragana: "けはい", meaningKo: "기색, 낌새", partOfSpeech: "명사", exampleJp: "外に人の気配がする。", exampleKo: "밖에 사람 기척이 난다.", isCommonLife: true },
];

export const PRESET_SEEDS: PresetSeed[] = (["N5", "N4", "N3", "N2", "N1"] as const).flatMap(
  (level) => [
    {
      jlptLevel: level,
      sequenceNo: 1,
      presetCode: `${level}-0-3`,
      label: `${level} 0-3`,
      roundType: "micro",
      rangeStart: 0,
      rangeEnd: 3,
    },
    {
      jlptLevel: level,
      sequenceNo: 2,
      presetCode: `${level}-0-6`,
      label: `${level} 0-6`,
      roundType: "merge",
      rangeStart: 0,
      rangeEnd: 6,
    },
    {
      jlptLevel: level,
      sequenceNo: 3,
      presetCode: `${level}-3-6`,
      label: `${level} 3-6`,
      roundType: "block",
      rangeStart: 3,
      rangeEnd: 6,
    },
  ],
);
