# JLPT Queue Engine

회독 큐 엔진은 `알고있음`이면 현재 세션 큐에서 제거하고, `공부하겠음`이면 현재 패스 안에서만 본 것으로 표시한 뒤 패스 종료 시 남은 `pending` 카드만 다시 셔플하는 방식으로 동작한다.  
즉, `공부하겠음`을 눌렀다고 즉시 큐 뒤로 보내지 않는다. 실제 재배치는 `현재 패스 완료 -> 남은 카드 재셔플 -> 다음 회독 시작` 시점에만 일어난다.  
이 문서는 [jlpt_sqlite_schema.sql](/Users/shkim/Desktop/frontend/mine/language_wiki/docs/jlpt_sqlite_schema.sql)을 전제로 한 코드 레벨 규칙이다.

## 핵심 UX 규칙

- 홈의 `이어하기`와 학습 화면 모두 현재 진행 단계를 `N번째 회독` 기준으로 표시한다.
- 학습 화면에서 회독 전환이 발생하면 다음 카드가 뜨기 전에 `셔플 중` UI를 잠깐 표시한다.
- 세션이나 단어집에 처음 들어갈 때 시작 순서는 항상 새로 셔플된다.
- 예를 들어 50개 중 20개를 `알고있음` 처리하면 남은 30개만 다음 회독 대상이다.
- 다음 회독에서는 그 30개가 이전 순서를 유지하지 않고 다시 셔플된다.
- 같은 preset 또는 단어집에 진행 중인 세션이 있으면 새로 만들지 않고 이어서 연다.
- 같은 preset을 완료한 뒤 다시 들어가면 해당 범위 전체를 다시 셔플해서 새 세션으로 시작할 수 있어야 한다.

## 상태 모델

### 단어 단위 상태

- `study_progress.status = 'new'`
  - 아직 한 번도 처리하지 않은 단어
- `study_progress.status = 'learning'`
  - 최근 세션에서 `공부하겠음`이 한 번 이상 나온 단어
- `study_progress.status = 'known'`
  - 최근 기준으로 `알고있음` 처리된 단어

### 세션 큐 상태

- `session_queue_items.state = 'pending'`
  - 현재 세션 안에서 아직 남아 있는 카드
- `session_queue_items.state = 'known'`
  - 현재 세션에서 제거된 카드

### 회독 상태

- `study_sessions.current_pass_no`
  - 현재 세션이 몇 번째 회독을 진행 중인지
- `session_queue_items.pass_no`
  - 해당 큐 순서가 어떤 회독에서 생성됐는지
- `session_queue_items.seen_in_pass`
  - 현재 회독에서 이미 한 번 화면에 표시되었는지

### 액션

- `study`
  - 버튼 `공부하겠음`
- `know`
  - 버튼 `알고있음`

## preset 생성 규칙

`round_presets`는 JLPT 레벨별 전체 단어 수를 기준으로 자동 생성한다.  
범위는 SQL에서 `sequence_in_level > range_start AND sequence_in_level <= range_end` 조건으로 읽는다.  
즉, `0-100`은 `1..100`, `100-200`은 `101..200`을 뜻한다.

### roundType 정책

- `micro`
  - 100개 단위 구간
  - 예: `0-100`, `100-200`, `200-300`
- `block`
  - 300개를 채운 직후, 방금 외운 300개 묶음 전체 복습
  - 예: `0-300`, `300-600`, `600-900`
- `merge`
  - 600개를 채운 직후, 처음부터 해당 지점까지 누적 복습
  - 예: `0-600`, `0-1200`, `0-1800`

### 생성 패턴

1. 먼저 `micro`를 100개 단위로 계속 만든다.
2. `rangeEnd`가 `300`의 배수가 되는 시점마다 해당 300개 묶음의 `block`을 만든다.
3. `rangeEnd`가 `600`의 배수가 되는 시점마다 `0-rangeEnd` 누적 `merge`를 만든다.
4. 마지막 남은 꼬리 구간이 100보다 작으면 마지막 `micro`를 `2600-2699`처럼 부분 구간으로 만든다.
5. 꼬리 구간은 `300` 또는 `600` 경계를 채우지 못하면 추가 `block`/`merge`를 만들지 않는다.

### 범위 예시

단어 수가 `699`개면 preset 순서는 아래와 같다.

1. `micro 0-100`
2. `micro 100-200`
3. `micro 200-300`
4. `block 0-300`
5. `micro 300-400`
6. `micro 400-500`
7. `micro 500-600`
8. `block 300-600`
9. `merge 0-600`
10. `micro 600-699`

단어 수가 `2699`개면 마지막 구간은 `micro 2400-2500`, `micro 2500-2600`, `micro 2600-2699`로 끝난다.

## 세션 생성 규칙

### preset 기반 세션 생성

1. `round_presets`에서 현재 선택한 preset을 읽는다.
2. `words`에서 `jlpt_level`, `sequence_in_level > range_start`, `sequence_in_level <= range_end` 조건으로 단어를 가져온다.
3. 같은 preset에 `is_completed = 0`인 세션이 있으면 그 세션을 그대로 연다.
4. 진행 중 세션이 없으면 preset 범위의 전체 단어를 가져온다.
5. 이때 `study_progress.status = 'known'` 여부로 단어를 제외하지 않는다.
6. 전체 단어를 셔플한다.
7. `study_sessions`를 생성한다.
8. 셔플된 순서대로 `session_queue_items(session_id, position, word_id, state='pending', pass_no=1, seen_in_pass=0)`를 저장한다.

### 커스텀 단어장 세션 생성

1. `custom_wordbook_items`에서 단어 목록을 가져온다.
2. 같은 단어장에 진행 중 세션이 있으면 이어서 연다.
3. 진행 중 세션이 없으면 단어 전체를 셔플해서 새 세션을 만든다.

## 현재 카드 표시 규칙

현재 카드는 아래 조건을 만족하는 첫 번째 row다.

- `session_id = 현재 세션`
- `state = 'pending'`
- `pass_no = study_sessions.current_pass_no`
- `position ASC LIMIT 1`

표시 시 함께 읽는 데이터:

- `words.kanji`
- `words.reading_hiragana`
- `words.meaning_ko`
- `words.example_jp`
- `words.example_ko`

UI 토글인 `한국어`, `히라가나`는 DB 상태가 아니라 화면 상태다.

## 상태 전이 규칙

### action = `study`

의미:

- 현재 단어를 아직 모르겠다고 판단
- 현재 회독에서는 본 것으로 처리
- 이번 세션에서는 제거하지 않음
- 회독이 끝나면 남아 있는 `pending` 카드 집합에 포함됨

DB 규칙:

1. 현재 카드의 `study_progress` upsert
2. `status = 'learning'`
3. `study_count += 1`
4. `wrong_streak += 1`
5. `last_result = 'study'`
6. `last_seen_at = now`
7. 현재 `session_queue_items.seen_in_pass = 1`
8. 현재 `session_queue_items.state = 'pending'`
9. `cycle_count += 1`
10. `last_action = 'study'`

중요:

- `study` 직후 즉시 tail 이동을 하지 않는다.
- 현재 회독이 끝났을 때 남은 `pending` 카드 전체를 다시 셔플하는 쪽이 실제 앱 규칙이다.

### action = `know`

의미:

- 현재 세션에서 이 단어는 끝
- 큐에서 제거

DB 규칙:

1. 현재 카드의 `study_progress` upsert
2. `status = 'known'`
3. `know_count += 1`
4. `wrong_streak = 0`
5. `last_result = 'know'`
6. `last_seen_at = now`
7. `known_at = now`
8. 현재 `session_queue_items.state = 'known'`
9. 현재 `session_queue_items.seen_in_pass = 1`
10. `last_action = 'know'`
11. 세션 요약값 `known_words += 1`

중요:

- `know`는 현재 세션 기준 제거다.
- `study_progress.status = 'known'`는 기록과 통계용이다.
- 다음에 같은 preset을 다시 시작할 때 해당 단어를 자동 제외하는 기준으로 쓰지 않는다.

## 세션 완료 조건

아래 조건이면 세션 완료다.

- 해당 `session_id`에서 `state = 'pending'` row 수가 `0`

완료 시 처리:

1. `study_sessions.is_completed = 1`
2. `completed_at = now`
3. `elapsed_seconds` 확정
4. 진행 통계 갱신

## 회독 완료 후 재셔플 규칙

이 앱의 핵심 규칙은 `현재 회독에서 남은 모르는 카드만 다시 셔플`하는 것이다.

예:

- 시작: 50개 셔플
- 20개 `know`
- 30개 `study`
- 첫 번째 회독 종료
- 두 번째 회독 시작 시 남은 30개만 다시 셔플
- 전환 순간에는 `셔플 중` UI를 먼저 표시

회독 완료 조건:

- `current_pass_no`에 해당하는 `pending` 카드가 모두 `seen_in_pass = 1`

회독 완료 시 처리:

1. 현재 세션에서 `state = 'pending'`인 카드만 다시 조회한다.
2. 그 카드들을 새로 셔플한다.
3. `study_sessions.current_pass_no += 1`
4. 셔플된 순서대로 각 row의 `position`을 다시 부여한다.
5. 각 row의 `pass_no = current_pass_no`
6. 각 row의 `seen_in_pass = 0`

즉, 사용자가 다음 회독에서 다시 보게 되는 카드는 항상 `남아 있는 모르는 카드의 새 랜덤 순서`다.

## 앱 재실행 시 복원 규칙

앱 실행 시 아래 순서로 복원한다.

1. `study_sessions`에서 `is_completed = 0`인 가장 최근 세션 조회
2. 세션이 없으면 홈으로 이동
3. 세션이 있으면 `current_pass_no`를 읽는다
4. `session_queue_items`에서 `state = 'pending' AND pass_no = current_pass_no ORDER BY position ASC LIMIT 1` 조회
5. 그 카드가 학습 화면의 현재 카드가 된다

즉, 현재 카드 인덱스를 별도 저장할 필요 없이 큐 테이블만 있으면 복원이 가능하다.

## 예외 케이스

### 빈 세션

- preset 범위 안에 실제 단어가 하나도 없을 때만 세션을 만들지 않는다.

### 재입장 규칙

- 같은 preset에 진행 중 세션이 있으면 이어서 연다.
- 같은 preset을 완료한 뒤 다시 들어가면 새 세션을 만든다.
- 새 세션은 해당 범위 전체 단어를 다시 셔플해서 시작한다.

### 중복 단어 삽입 방지

- 한 세션 안에서는 같은 `word_id`가 여러 row로 존재하지 않게 해야 한다.
- 남은 카드 재셔플도 새 row insert보다 기존 row의 `position`, `pass_no`, `seen_in_pass`를 갱신하는 편이 안전하다.

### preset 변경

- 진행 중 세션이 있는데 다른 preset으로 이동하면 기존 세션을 폐기할지, 임시 저장할지 정책을 정해야 한다.
- MVP는 `기존 세션 종료 후 새 세션 생성`이 단순하다.

### 콘텐츠 업데이트

- `words.source_version`이 바뀌어도 `word_id`는 유지해야 한다.
- 그래야 `study_progress`, `session_queue_items`가 깨지지 않는다.

## 저장 트랜잭션 규칙

`study`와 `know`는 반드시 단일 트랜잭션으로 처리한다.

이유:

- `study_progress`는 저장됐는데 큐 갱신이 실패하면 세션 상태가 꼬인다.
- `know`는 저장됐는데 세션 제거가 실패하면 이미 아는 카드가 다시 나올 수 있다.

권장 순서:

1. 현재 queue item 조회
2. `study_progress` upsert
3. queue item update
4. session summary update
5. commit
