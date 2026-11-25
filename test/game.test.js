const test = require('node:test');
const assert = require('node:assert');
const { SIZE, EMPTY, BLACK, WHITE, createGame, play } = require('../js/game.js');

const at = (x, y) => y * SIZE + x;

// 흑 돌을 미리 깔아 두고 마지막 한 수를 흑으로 둔다.
function playLast(stones, last) {
  const game = createGame();
  for (const [x, y] of stones) game.board[at(x, y)] = BLACK;
  play(game, at(...last));
  return game;
}

test('흑이 먼저 두고 번갈아 둔다', () => {
  const game = createGame();
  assert.equal(game.turn, BLACK);
  play(game, at(7, 7));
  assert.equal(game.board[at(7, 7)], BLACK);
  assert.equal(game.turn, WHITE);
  play(game, at(8, 7));
  assert.equal(game.board[at(8, 7)], WHITE);
  assert.equal(game.turn, BLACK);
});

const fives = {
  가로: [[3, 7], [4, 7], [5, 7], [6, 7], [7, 7]],
  세로: [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]],
  '대각선 ↘': [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7]],
  '대각선 ↗': [[3, 11], [4, 10], [5, 9], [6, 8], [7, 7]],
  '왼쪽 위 모서리': [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  '오른쪽 아래 모서리': [[14, 10], [14, 11], [14, 12], [14, 13], [14, 14]],
};

for (const [name, line] of Object.entries(fives)) {
  test(`5목 승리: ${name} (어느 자리를 마지막에 두어도)`, () => {
    for (const last of line) {
      const game = playLast(line.filter((p) => p !== last), last);
      assert.equal(game.winner, BLACK);
      assert.equal(game.over, true);
      assert.equal(game.winLine.length, 5);
    }
  });
}

test('6목(장목)도 승리다', () => {
  const game = playLast([[3, 7], [4, 7], [5, 7], [7, 7], [8, 7]], [6, 7]);
  assert.equal(game.winner, BLACK);
  assert.equal(game.winLine.length, 6);
});

test('4목은 승리가 아니다', () => {
  const game = playLast([[3, 7], [4, 7], [5, 7]], [6, 7]);
  assert.equal(game.over, false);
});

test('줄이 판의 가장자리를 넘어 이어지지 않는다', () => {
  const game = playLast([[12, 3], [13, 3], [14, 3], [0, 4]], [1, 4]);
  assert.equal(game.over, false);
});

test('이미 돌이 있는 자리에는 둘 수 없다', () => {
  const game = createGame();
  play(game, at(7, 7));
  assert.equal(play(game, at(7, 7)), false);
  assert.equal(game.board[at(7, 7)], BLACK);
  assert.equal(game.turn, WHITE);
});

test('게임이 끝나면 더 둘 수 없다', () => {
  const game = playLast([[3, 7], [4, 7], [5, 7], [6, 7]], [7, 7]);
  assert.equal(play(game, at(0, 0)), false);
  assert.equal(game.board[at(0, 0)], EMPTY);
});

test('판이 가득 차면 무승부다', () => {
  const game = createGame();
  // 5목이 생기지 않는 배치: 두 칸 단위로 색을 바꾸고 행마다 한 칸씩 어긋나게 한다.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      game.board[at(x, y)] = (x + 2 * y) % 4 < 2 ? BLACK : WHITE;
    }
  }
  const last = game.board.indexOf(BLACK);
  game.board[last] = EMPTY;
  play(game, last);
  assert.equal(game.over, true);
  assert.equal(game.winner, EMPTY);
});
