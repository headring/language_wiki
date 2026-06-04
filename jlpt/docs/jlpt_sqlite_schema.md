# JLPT SQLite Schema

현재 앱의 실제 구현 기준 문서다. 이 프로젝트는 지금 시점에서 `N1` 번역 데이터만 포함한 오프라인 우선 Expo 앱이며, 앱 실행 중에는 SQLite만 읽는다.

## 현재 데이터 흐름

현재 데이터 적재 방향은 아래 한 가지다.

1. `data/translated/n1.csv`를 수정한다.
2. `scripts/generate-app-translated-data.mjs`를 실행한다.
3. `app/src/data/imported.ts`가 다시 생성된다.
4. 앱 시작 시 `initializeDatabase()`가 `imported.ts`를 SQLite에 넣는다.

즉 런타임에서 CSV를 직접 읽지 않는다. 앱이 실제로 읽는 저장소는 로컬 SQLite 파일 `jlpt.db`다.

## 현재 앱 범위

- 콘텐츠 범위: 현재 포함 데이터는 `N1`만 사용한다.
- 저장 방식: 단어/프리셋/진도는 모두 로컬 SQLite에 저장한다.
- 네트워크 의존성: 현재 앱 실행 시 별도 다운로드는 하지 않는다.
- 단어장 기능: 커스텀 단어장, 서버 manifest, pack 다운로드 흐름은 현재 구현에 없다.

## 현재 사용 테이블

현재 앱 스키마는 아래 일곱 개 테이블을 기준으로 동작한다.

- `content_versions`
  - 현재 적재된 앱 데이터 버전을 저장한다.
- `words`
  - 단어 본문과 예문 같은 정적 콘텐츠를 저장한다.
- `round_presets`
  - 학습 세트 범위를 저장한다.
- `study_progress`
  - 단어별 학습 결과를 저장한다.
- `study_sessions`
  - 세션 단위 진행 상태를 저장한다.
- `study_round_records`
  - 완료된 세션별 회독 기록과 소요 시간을 저장한다.
- `session_queue_items`
  - 현재 세션의 큐 순서와 회독 상태를 저장한다.

실제 SQL은 [app/src/db/schema.ts](/Users/shkim/Desktop/frontend/mine/language_wiki/jlpt/app/src/db/schema.ts)에 있다.

## 테이블 역할

### `content_versions`

- `schema_version`
  - 스키마 버전
- `word_pack_version`
  - 현재 `imported.ts` 기준 데이터 버전
- `downloaded_at`
  - 마지막 적재 시각

이 값이 바뀌면 앱 시작 시 콘텐츠 테이블이 다시 적재된다.

### `words`

- `id`
  - 앱 내부 단어 ID. 현재는 `n1-1`, `n1-2` 같은 형식이다.
- `jlpt_level`
  - 현재 데이터는 실질적으로 `N1`만 들어간다.
- `sequence_in_level`
  - 레벨 내 순번
- `kanji`
- `kana`
- `reading_hiragana`
- `meaning_ko`
- `part_of_speech`
- `example_jp`
- `example_ko`
- `is_common_life`

현재 CSV에서 품사와 예문은 채우지 않으므로 빈 값으로 들어간다.

### `round_presets`

- `sequence_no`
  - 프리셋 표시 순서
- `preset_code`
  - 내부 식별 코드
- `label`
  - UI 표시용 텍스트
- `round_type`
  - `micro`, `block`, `merge`
- `range_start`, `range_end`
  - `sequence_in_level > range_start AND sequence_in_level <= range_end` 규칙으로 읽는다.

현재 프리셋은 `generate-app-translated-data.mjs`에서 생성하며, 문서상 일반론이 아니라 현재 생성 스크립트의 규칙을 따른다. N1은 `micro`를 쓰지 않고 아래 17개 세트만 사용한다.

1. `1-300`
2. `301-600`
3. `1-600`
4. `601-900`
5. `901-1200`
6. `601-1200`
7. `1-1200`
8. `1201-1500`
9. `1501-1800`
10. `1201-1800`
11. `1801-2100`
12. `2101-2400`
13. `1801-2400`
14. `1201-2400`
15. `1-2400`
16. `2401-2699`
17. `1-2699`

### `study_progress`

- `status`
  - `new`, `learning`, `known`
- `know_count`
- `study_count`
- `wrong_streak`
- `last_result`
- `last_seen_at`
- `known_at`
- `updated_at`

이 테이블은 전역 제외 목록이 아니라 통계와 최근 상태 기록용이다.

### `study_sessions`

- `id`
  - 세션 ID
- `jlpt_level`
- `preset_id`
- `source_type`
  - 현재는 `preset`만 사용
- `range_start`, `range_end`
- `current_pass_no`
- `started_at`, `completed_at`
- `is_completed`
- `total_words`
- `known_words`
- `study_words`
- `elapsed_seconds`
- `elapsed_milliseconds`
- `timer_started_at`

### `study_round_records`

- `preset_id`
- `session_id`
- `round_no`
- `elapsed_seconds`
- `elapsed_milliseconds`
- `completed_at`

### `session_queue_items`

- `session_id`
- `position`
- `word_id`
- `state`
  - `pending`, `known`
- `pass_no`
- `seen_in_pass`
- `cycle_count`
- `last_action`
- `updated_at`

이 테이블이 현재 카드 위치와 회독 재시작 순서를 복원하는 핵심이다.

## 현재 초기화 정책

앱 시작 시 [app/src/db/init.ts](/Users/shkim/Desktop/frontend/mine/language_wiki/jlpt/app/src/db/init.ts) 에서 아래 순서로 처리한다.

1. 스키마 SQL을 실행한다.
2. `content_versions`를 읽는다.
3. `schema_version`이 낮으면 필요한 스키마 마이그레이션을 실행한다.
4. `word_pack_version`이 같고 `words`가 있더라도 `round_presets`를 `imported.ts` 기준으로 upsert 한다.
5. `word_pack_version`이 다르거나 `words`가 비어 있으면 `words`, `round_presets`를 `imported.ts` 기준으로 upsert 한다.
6. 새 버전을 `content_versions`에 기록한다.

`round_presets` 적재 전에 N1의 stale preset을 삭제한다. 기준은 현재 `PRESET_SEEDS`에 포함된 N1 `preset_code`이며, 여기에 없는 기존 N1 프리셋은 로컬 DB에서 제거한다. 이 정책은 예전 `micro` 세트가 기존 SQLite에 남아 N1 목록에 섞여 표시되는 것을 막기 위한 것이다.

데이터 버전 변경만으로 아래 진행 테이블은 비우지 않는다.

- `session_queue_items`
- `study_sessions`
- `study_progress`
- `study_round_records`

즉 표기 수정처럼 같은 단어 ID의 콘텐츠만 바뀌는 업데이트는 기존 회독 진행 상태를 유지한다.

## 현재 앱 구조

- `app/src/data`
  - 생성된 import 데이터
- `app/src/db`
  - 스키마와 DB 초기화
- `app/src/features/study`
  - 회독 큐 엔진
- `app/src/store`
  - 화면 전환 상태
- `app/App.tsx`
  - 현재 홈, 프리셋, 학습 화면을 모두 포함한 단일 앱 셸

문서상 `repositories`나 `services` 계층은 아직 실제 코드 구조에 반영돼 있지 않다.

## 미구현 또는 제외 범위

아래 항목은 예전 설계 흔적은 남아 있을 수 있지만 현재 앱 정책 문서 기준에서는 구현 범위 밖이다.

- 커스텀 단어장
- 서버 manifest 확인
- word pack 다운로드
- 음성 리소스 관리
- SRS 스케줄링
- 멀티 레벨(`N5`~`N2`) 학습 흐름

정책 변경이 생기기 전까지는 이 문서를 현재 구현의 기준으로 본다.
