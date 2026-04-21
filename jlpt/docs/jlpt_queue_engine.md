# JLPT Queue Engine

현재 앱의 회독 정책을 실제 구현 기준으로 정리한 문서다. 이 문서는 [app/src/features/study/engine.ts](/Users/shkim/Desktop/frontend/mine/language_wiki/jlpt/app/src/features/study/engine.ts) 와 현재 SQLite 스키마를 기준으로 한다.

## 현재 앱 전제

- 학습 데이터는 현재 `N1`만 포함한다.
- 세션 소스는 현재 `preset`만 지원한다.
- 커스텀 단어장 흐름은 아직 구현하지 않는다.
- 학습 화면은 `app/App.tsx` 내부에 있고, 큐 로직은 `engine.ts`가 담당한다.

## 핵심 UX 규칙

- 홈 화면에 진행 중 세션이 있으면 `이어하기`를 보여준다.
- 프리셋에 처음 들어갈 때 카드 순서는 항상 새로 셔플된다.
- `알고있음`은 현재 세션 큐에서 제거한다.
- `공부하겠음`은 현재 패스 안에서만 본 카드로 표시하고 세션에서는 제거하지 않는다.
- 현재 패스의 `pending` 카드를 모두 한 번 보면, 남아 있는 `pending` 카드만 다시 셔플해서 다음 회독을 시작한다.
- 회독 전환 시 학습 화면에 잠깐 `셔플 중...` UI를 보여준다.
- 같은 preset에 진행 중 세션이 있으면 새 세션을 만들지 않고 이어서 연다.
- 완료된 preset에 다시 들어가면 새 세션을 다시 만든다.

## 현재 프리셋 정책

현재 앱의 프리셋은 일반화된 `100/300/600` 정책이 아니라, `scripts/generate-app-translated-data.mjs`가 만드는 현재 규칙을 따른다.

### 생성 순서

1. 먼저 아래 누적 `micro` 구간을 가능한 만큼 만든다.
2. `0-50`
3. `0-100`
4. `0-150`
5. `0-200`
6. `0-250`
7. `0-260`
8. `0-300`
9. 그 이후에는 `300` 단위로 `block`과 `merge`를 번갈아 추가한다.
10. 마지막 꼬리 구간이 있으면 `block previousUpper-count`, `merge 0-count`를 추가한다.

### roundType 의미

- `micro`
  - 초반 누적 진입 구간
- `block`
  - 직전 300개 블록 범위
- `merge`
  - 처음부터 현재 지점까지 누적 범위

즉 현재 구현의 프리셋 정책은 예전 설계 문서보다 더 `N1 암기 흐름`에 맞춘 누적 구간 중심이다.

## 세션 생성 규칙

### preset 기반 세션 생성

1. 선택한 `round_presets` row를 읽는다.
2. `words`에서 `jlpt_level`, `sequence_in_level > range_start`, `sequence_in_level <= range_end` 조건으로 단어를 가져온다.
3. 같은 preset에 `is_completed = 0`인 세션이 있으면 그 세션 ID를 그대로 반환한다.
4. 진행 중 세션이 없으면 범위 내 단어 전체를 가져온다.
5. `study_progress.status = 'known'` 여부로 단어를 제외하지 않는다.
6. 단어 전체를 셔플한다.
7. `study_sessions`를 생성한다.
8. 셔플된 순서대로 `session_queue_items`를 `pass_no = 1`, `seen_in_pass = 0`, `state = 'pending'` 로 저장한다.

### 빈 세션

- preset 범위 안에 단어가 없으면 세션을 만들지 않고 `EMPTY_SESSION` 오류를 반환한다.

## 현재 카드 선택 규칙

현재 카드는 아래 조건을 만족하는 첫 row다.

- `session_id = 현재 세션`
- `state = 'pending'`
- `pass_no = study_sessions.current_pass_no`
- `seen_in_pass = 0`
- `position ASC LIMIT 1`

표시 데이터는 `words`에서 같이 읽는다.

- `kanji`
- `kana`
- `reading_hiragana`
- `meaning_ko`
- `part_of_speech`
- `example_jp`
- `example_ko`

UI 토글인 `한국어`, `히라가나`는 DB 상태가 아니라 화면 상태다.

## 상태 모델

### 단어 상태

- `study_progress.status = 'new'`
- `study_progress.status = 'learning'`
- `study_progress.status = 'known'`

### 큐 상태

- `session_queue_items.state = 'pending'`
- `session_queue_items.state = 'known'`

### 회독 상태

- `study_sessions.current_pass_no`
- `session_queue_items.pass_no`
- `session_queue_items.seen_in_pass`

## 액션 규칙

### `study`

의미:

- 현재 단어를 아직 모른다고 판단
- 현재 패스에서는 본 카드로 처리
- 세션에서는 제거하지 않음

DB 처리:

1. `study_progress`를 upsert 한다.
2. `status = 'learning'`
3. `study_count += 1`
4. `wrong_streak += 1`
5. `last_result = 'study'`
6. `last_seen_at = now`
7. `study_sessions.study_words += 1`
8. 현재 `session_queue_items.seen_in_pass = 1`
9. `cycle_count += 1`
10. `last_action = 'study'`

중요:

- `study` 직후 즉시 큐 뒤로 보내지 않는다.
- 실제 재배치는 현재 패스 종료 시점에만 일어난다.

### `know`

의미:

- 현재 세션에서 이 단어는 끝
- 큐에서 제거

DB 처리:

1. `study_progress`를 upsert 한다.
2. `status = 'known'`
3. `know_count += 1`
4. `wrong_streak = 0`
5. `last_result = 'know'`
6. `last_seen_at = now`
7. `known_at = now`
8. `study_sessions.known_words += 1`
9. 현재 `session_queue_items.state = 'known'`
10. `seen_in_pass = 1`
11. `last_action = 'know'`

중요:

- `know`는 현재 세션 기준 제거다.
- `study_progress.status = 'known'`는 기록용이며, 다음 새 세션 시작 시 자동 제외 조건으로 쓰지 않는다.

## 세션 완료 조건

아래 조건이면 세션 완료다.

- 해당 `session_id`에서 `state = 'pending'` row 수가 `0`

완료 시 처리:

1. `study_sessions.is_completed = 1`
2. `completed_at = now`

현재 구현에는 `elapsed_seconds` 같은 별도 완료 통계는 없다.

## 회독 완료 후 재셔플 규칙

핵심 규칙은 `현재 패스에서 남아 있는 모르는 카드만 다시 셔플`이다.

회독 완료 조건:

- `current_pass_no`에 해당하는 `pending` 카드의 `seen_in_pass = 0` 개수가 `0`

회독 완료 시 처리:

1. 현재 세션의 `state = 'pending'` 카드만 다시 조회한다.
2. 그 카드들을 새로 셔플한다.
3. `study_sessions.current_pass_no += 1`
4. 현재 구현은 기존 row를 부분 갱신하지 않고, 세션의 큐 row를 삭제한 뒤 남은 카드만 새 `position`으로 다시 insert 한다.
5. 새 row는 `pass_no = nextPassNo`, `seen_in_pass = 0`, `state = 'pending'` 로 저장한다.

현재 구현이 전체 큐를 다시 만드는 이유는 `(session_id, position)` 기본키 충돌을 단순하게 피하기 위해서다.

## 앱 재실행 시 복원 규칙

앱 실행 시 아래 흐름으로 복원한다.

1. `study_sessions`에서 `is_completed = 0`인 가장 최근 세션을 찾는다.
2. 세션이 없으면 홈 화면만 보여준다.
3. 세션이 있으면 `current_pass_no`를 읽는다.
4. 현재 패스의 첫 `pending` 카드를 조회한다.
5. 그 카드가 학습 화면의 현재 카드가 된다.

즉 별도 현재 인덱스 저장 없이 큐 테이블만으로 복원이 가능하다.

## 현재 구현에 없는 범위

아래 항목은 예전 설계 흔적은 있어도 현재 정책 문서 범위에는 포함하지 않는다.

- 커스텀 단어장 세션
- preset 변경 시 다중 진행 세션 정책
- 완료 시간 집계
- 전역 제외 로직
- SRS 모드

정책을 바꾸기 전까지는 이 문서를 현재 회독 엔진의 기준으로 본다.
