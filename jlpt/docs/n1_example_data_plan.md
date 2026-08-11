# N1 예문 데이터 추가 계획

## 1. 범위

### 목표

`data/translated/n1.csv`의 2,698개 단어에 대표 의미 하나를 보여 주는 일본어 예문, 예문 전체 히라가나, 한국어 번역을 추가하고 기존 오프라인 SQLite 적재 경로까지 연결한다.

포함 범위:

- N1 예문 2,698개 작성 및 검수
- CSV → `imported.ts` → SQLite → `CurrentCard` 데이터 전달 코드 1회 변경
- 기존 설치 앱을 위한 SQLite 스키마 마이그레이션 1회 변경
- 샘플 20개 검증 후 100개 단위 예문 작성과 검수

제외 범위:

- N2~N5 예문 작성
- 품사·다중 의미·복수 예문 추가
- 외부 사전 API, 웹 크롤링, 새 라이브러리 도입
- 학습 화면 배치와 공개 동작 변경: `study_card_example_ui_plan.md`에서 처리

## 2. 예문 작성 규칙

CSV 열은 기존 열 뒤에 아래 순서로 추가한다.

```csv
expression,reading,meaning,tags,guid,example_jp,example_reading_hiragana,example_ko
```

각 행은 다음 규칙을 모두 만족해야 한다.

- `meaning`의 첫 번째 또는 가장 대표적인 의미 하나만 사용한다.
- `example_jp`는 자연스러운 일본어 한 문장으로 작성한다.
- 표제어를 그대로 포함하거나 동사·형용사는 문맥에 맞게 자연스럽게 활용한다.
- 문맥으로 표제어의 의미를 유추할 수 있게 하되 한국어 뜻을 직접 암시하지 않는다.
- 모바일 카드에서 읽기 쉽도록 불필요한 수식어와 고유명사를 피하고 45자 이내를 목표로 한다.
- `example_reading_hiragana`는 `example_jp` 전체의 발음을 히라가나로 적고 문장부호를 유지한다.
- `example_ko`는 `example_jp`와 같은 의미의 자연스러운 한국어 한 문장으로 작성한다.
- 동일한 예문을 여러 단어에 재사용하지 않는다.
- 기존 `expression`, `reading`, `meaning`, `tags`, `guid` 값과 행 순서는 변경하지 않는다.

예시:

```csv
うんざり,うんざり,진절머리가 남·싫증이 남,JLPT_1 JLPT,[guid],同じ話を何度も聞かされて、もううんざりだ。,おなじはなしをなんどもきかされて、もううんざりだ。,같은 이야기를 몇 번이나 들어서 이제 진절머리가 난다.
```

예문은 별도 플러그인이나 웹 자료 수집 없이 작성한다.

**선택 이유:** 외부 예문을 섞으면 저작권과 문체 일관성 문제가 생긴다. 현재 CSV의 한국어 의미를 기준으로 직접 작성하는 편이 데이터 계약도 단순하다.

## 3. 데이터 흐름과 계약

```text
data/translated/n1.csv
  → scripts/generate-app-translated-data.mjs
  → app/src/data/imported.ts
  → initializeDatabase()
  → words
  → getCurrentCardForSession()/handleQueueAction()
  → CurrentCard
```

```ts
type WordSeed = {
  exampleJp?: string;
  exampleReadingHiragana?: string;
  exampleKo?: string;
};

type CurrentCard = {
  exampleJp: string | null;
  exampleReadingHiragana: string | null;
  exampleKo: string | null;
};
```

SQLite `words`에 아래 열을 추가한다.

```sql
example_reading_hiragana TEXT
```

- `SCHEMA_VERSION`을 `4`로 올린다.
- `migrateSchema()`는 `words`의 실제 열을 확인하고 없을 때만 `ALTER TABLE`을 실행한다.
- `upsertWordSeeds()`는 예문 3개 필드를 함께 삽입·갱신한다.
- 현재 카드 조회 SQL 두 곳은 `example_reading_hiragana AS exampleReadingHiragana`를 반환한다.
- 생성기는 새 CSV 열을 읽어 `WordSeed`에 그대로 기록한다.
- 생성기는 `--expected-examples <count>`를 받아 CSV 처음부터 연속으로 완성된 예문 수를 검사한다.
- 생성기는 매 실행마다 CSV 전체의 행 수, 헤더, 예문 누락, 중복 `example_jp`, 기존 5개 필드 변경 여부를 검사하고 실패 시 `imported.ts`를 쓰기 전에 종료한다.
- 기존 5개 필드는 작업 시작 전에 계산한 기준 체크섬과 비교한다. 체크섬 계산에는 Node.js 표준 `node:crypto`만 사용한다.
- `--expected-examples` 범위 안의 행은 예문 3개가 모두 있어야 하고, 이후 행은 3개가 모두 비어 있어야 한다. 중간 누락이나 부분 작성 행은 실패 처리한다.

**선택 이유:** 기존 타입·테이블·조회 흐름이 이미 예문을 운반하므로 별도 예문 테이블이나 저장소 상태를 추가할 이유가 없다.

API와 네트워크 상태는 없다. 모든 콘텐츠는 빌드 시 생성되고 앱 시작 시 로컬 SQLite에 동기화된다.

## 4. 파일별 작업

### 수정

| 파일 | 책임 |
| --- | --- |
| `data/translated/n1.csv` | 2,698개 행의 예문 3개 필드 원본 |
| `scripts/generate-app-translated-data.mjs` | CSV 필드 읽기, 검증, `WordSeed` 생성 |
| `app/src/data/imported.ts` | 생성 결과물; 직접 편집 금지 |
| `app/src/types/study.ts` | `exampleReadingHiragana` 타입 추가 |
| `app/src/db/schema.ts` | `words.example_reading_hiragana` 선언 |
| `app/src/db/init.ts` | 스키마 v4 마이그레이션과 예문 upsert |
| `app/src/features/study/engine.ts` | 현재 카드 조회 두 곳에 예문 읽기 추가 |
| `docs/jlpt_sqlite_schema.md` | 실제 데이터 흐름과 새 열 반영 |
| `docs/jlpt_sqlite_schema.sql` | 문서용 SQL에 새 열 반영 |
| `docs/jlpt_queue_engine.md` | 현재 카드 표시 데이터에 새 필드 반영 |

기존 문서에 적힌 N1 단어 수 `2,699`와 마지막 프리셋 범위는 실제 CSV 기준 `2,698`, `2401-2698`, `1-2698`로 바로잡는다.

### 변경하지 않음

| 파일 | 이유 |
| --- | --- |
| `app/src/store/useAppStore.ts` | 현재 카드 전체를 이미 전달하며 새 상태가 필요 없음 |
| `app/src/features/study/engine.ts`의 큐 처리 | 예문은 정적 콘텐츠이며 회독 규칙에 영향 없음 |
| `app/src/data/seed.ts`의 샘플 데이터 | 실제 앱은 생성된 N1 데이터를 사용하며 이번 범위는 N1 CSV임 |

## 5. 구현 순서

1. CSV를 수정하기 전에 기존 5개 필드의 기준 체크섬을 기록한다.
2. 생성기·타입·SQLite 계약과 `study_card_example_ui_plan.md`의 화면 코드를 한 번만 구현한다.
3. 명사·동사·형용사·부사·복수 의미 표제어를 포함한 처음 20개 예문을 작성한다.
4. 20개 모두의 대표 의미, 일본어 자연스러움, 전체 히라가나, 한국어 번역을 검수한다.
5. `--expected-examples 20`으로 전체 CSV를 검사하고 앱에서 일본어 즉시 표시와 두 버튼 공개 흐름을 테스트한다.
6. 이후 CSV 순서대로 100개씩 작성한다. 마지막 배치는 남은 78개다.
7. 배치마다 새로 작성한 100개만 의미와 히라가나를 전수 검수하고, 증가한 누적 개수로 전체 CSV 자동 검사를 실행한다.
8. 작성 규칙이 바뀌지 않는 한 이미 검수한 이전 배치는 다시 전수 확인하지 않는다. 규칙이 바뀌면 영향을 받는 이전 배치만 재검수한다.
9. 2,698개 완료 후 전체 데이터를 생성하고 신규 설치와 기존 DB 마이그레이션에서 최종 앱 테스트를 수행한다.

**선택 이유:** DB와 화면 코드는 데이터 배치마다 바뀌지 않는다. 데이터만 작은 단위로 추가하고 새 배치에 검수 범위를 한정해야 반복 비용 없이 오류 위치를 좁힐 수 있다.

## 6. 검증

```bash
node scripts/generate-app-translated-data.mjs --in data/translated --out app/src/data/imported.ts --expected-examples 20
cd app && npm exec tsc -- --noEmit
```

100개 배치마다 `--expected-examples`를 `120`, `220`, `320`처럼 현재 누적 완료 수로 바꾼다. 최종 실행 값은 `2698`이다.

- [ ] 매 실행에서 CSV 전체의 헤더와 2,698개 행이 유지된다.
- [ ] 매 실행에서 기존 5개 필드와 행 순서가 기준 체크섬과 일치한다.
- [ ] 완료 범위에는 예문 3개가 모두 있고 이후 범위에는 부분 작성 행이 없다.
- [ ] 완료 범위 전체에 중복 일본어 예문이 없다.
- [ ] 최초 20개는 전체 흐름을 검수하고, 이후 매번 새로 작성한 100개는 대표 의미와 전체 히라가나를 전수 확인한다.
- [ ] 최종 실행에서는 2,698개 모든 행의 예문 3개 필드가 비어 있지 않다.
- [ ] 생성된 `IMPORTED_WORD_SEEDS`에 예문 3개 값이 들어간다.
- [ ] 기존 DB는 재설치 없이 스키마 v4로 올라가고 학습 기록을 유지한다.
- [ ] 비행기 모드에서도 예문 데이터가 표시된다.

## 7. 후속 작업

- N2~N5 데이터가 실제로 추가될 때 같은 CSV 계약을 적용한다.
- 복수 의미·복수 예문·음성은 사용 요구가 생기기 전까지 추가하지 않는다.
