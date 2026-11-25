# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요
브라우저에서 실행하는 오목 게임. 순수 HTML/CSS/JS이며 빌드, 외부 라이브러리, `package.json`이 없다.

- 모드: 사람 대 사람 / 사람 대 AI(수준 1~5, 숫자가 클수록 잘함)
- 규칙: 15×15, 자유룰(금수 없음, 5개 이상 연속이면 승리). AI 모드에서는 항상 사람이 흑(선공)

## 명령어
- 실행: `index.html`을 브라우저로 연다. 서버는 필요 없다.
- 전체 테스트: `node --test` (레벨 5가 실제 시간을 쓰므로 약 20초 걸린다)
- 파일 하나: `node --test test/game.test.js`
- 테스트 하나: `node --test --test-name-pattern="장목"`
- AI 강도 비교: `node tools/tournament.js 4 5 10` (낮은 레벨, 높은 레벨, 판 수)

## 구조
- `file://`로 열어도 동작해야 하므로 ES 모듈과 Worker를 쓰지 않는다. 각 스크립트는 IIFE로 감싸고 `index.html`에서 `game.js` → `ai.js` → `ui.js` 순서로 불러온다.
- `js/game.js`(`Omok`)와 `js/ai.js`(`OmokAI`)는 DOM에 의존하지 않으며, Node에서는 파일 끝의 `module.exports`로 테스트와 공유한다. DOM은 `js/ui.js`에서만 다룬다.
- 판은 길이 225인 1차원 배열이다(인덱스 = `y * 15 + x`, 0 빈칸 / 1 흑 / 2 백). `chooseMove`는 넘겨받은 판을 바꾸지 않는다.
- `node --test`는 `test/` 안의 모든 js를 실행하므로 테스트가 아닌 스크립트는 `tools/`에 둔다.

### AI (`js/ai.js`)
`Position`이 판 위의 모든 연속 5칸 창(572개)의 흑·백 돌 수를 착수/되돌리기마다 증분 갱신한다. 착수 점수, 판 평가, 4 위협 검출이 모두 이 값에서 나온다.

- 1~3: 한 수 평가에 무작위성을 다르게 섞는다.
- 4: 깊이 4 알파베타 탐색.
- 5: VCF(연속 4 공격) 탐색 후 반복 심화 알파베타, 총 1.5초 제한. 시간 초과는 `Timeout` 예외로 빠져나오므로 탐색 중의 `place`는 반드시 `finally`에서 `undo`한다.

AI를 바꾸면 인접 레벨끼리 대국시켜 높은 레벨의 득점률이 60% 이상인지 확인한다.

### 턴 진행 (`js/ui.js`)
AI는 메인 스레드에서 동기로 계산한다(레벨 5는 최대 1.5초 멈춤). `aiTimer`가 null이 아니면 AI 차례로 보고 클릭을 무시한다. 새 게임이나 메뉴로 나갈 때는 `aiTimer`를 취소해 남은 착수가 새 판에 놓이지 않게 한다.
