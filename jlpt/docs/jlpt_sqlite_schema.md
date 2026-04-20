# JLPT SQLite Schema

오프라인 우선 React Native 앱 기준 초안이다. 첫 실행 때 전체 콘텐츠를 내려받고, 이후 학습은 SQLite만 읽도록 설계했다.

## 핵심 설계

- `words`: 정적 콘텐츠
- `round_presets`: `0-50`, `0-100`, `0-300`, `300-600`, `0-600` 같은 회독 범위
- `study_progress`: 단어별 개인 진도
- `study_sessions`: 회독 세션 단위 기록
- `session_queue_items`: 세션 안의 현재 큐 순서
- `custom_wordbooks`, `custom_wordbook_items`: 내 단어장
- `content_versions`, `app_meta`: 로컬 콘텐츠 버전과 앱 메타데이터

## 왜 `session_queue_items`가 필요한가

회독 큐는 `알고있음`이면 제거, `공부하겠음`이면 뒤로 붙는 구조라서, 단순히 `study_progress`만 저장하면 앱이 종료된 뒤 현재 큐를 복원할 수 없다.  
그래서 세션마다 현재 큐 순서를 별도 저장해야 한다.

추가로 이 앱은 한 세트 안에서 모든 카드를 한 번 본 뒤, 아직 남은 모르는 카드만 다시 셔플해서 다음 패스를 시작해야 한다.  
그래서 `study_sessions.current_pass_no`, `session_queue_items.pass_no`, `session_queue_items.seen_in_pass` 같은 값이 있으면 정확한 복원이 쉬워진다.

중요한 정책은 다음과 같다.

- `study_progress`는 전역 제외 목록이 아니라 기록용이다.
- 같은 세트를 완료했더라도 다시 들어가면 새 세션으로 다시 공부할 수 있어야 한다.
- 같은 세트에 진행 중 세션이 있으면 새 세션을 만들지 않고 기존 위치에서 이어야 한다.

## MVP에 필요한 최소 테이블

- `words`
- `round_presets`
- `study_progress`
- `study_sessions`
- `session_queue_items`

이 다섯 개만 있어도 오프라인 회독 앱은 동작한다.

## 확장 시 바로 붙일 것

- `custom_wordbooks`
- `custom_wordbook_items`
- 음성 파일 다운로드 상태를 따로 관리하는 `downloaded_assets`
- SRS 모드를 붙일 경우 `review_schedules`

## React Native 계층 추천

- `src/db`: SQLite 연결, 마이그레이션, 시드 import
- `src/repositories`: 단어 조회, 세션 생성, 큐 업데이트
- `src/services`: 초기 다운로드, 버전 체크, 회독 엔진
- `src/stores`: Zustand 상태

## 초기 다운로드 흐름

1. 앱 실행
2. `content_versions` 확인
3. 서버 manifest 확인
4. word pack 다운로드
5. SQLite 트랜잭션으로 import
6. 이후 학습은 로컬 DB만 사용
