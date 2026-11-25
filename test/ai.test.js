const test = require('node:test');
const assert = require('node:assert');
const { SIZE, EMPTY, BLACK, WHITE, createGame, play } = require('../js/game.js');
const { chooseMove } = require('../js/ai.js');

const LEVELS = [1, 2, 3, 4, 5];
const at = (x, y) => y * SIZE + x;

function boardWith(black, white) {
  const { board } = createGame();
  for (const [x, y] of black) board[at(x, y)] = BLACK;
  for (const [x, y] of white) board[at(x, y)] = WHITE;
  return board;
}

for (const level of LEVELS) {
  test(`레벨 ${level}: 끝까지 합법 수만 두고 입력 판을 바꾸지 않는다`, () => {
    const game = createGame();
    for (let i = 0; i < 12 && !game.over; i++) {
      const before = [...game.board];
      const move = chooseMove(game.board, game.turn, level);
      assert.deepEqual(game.board, before);
      assert.equal(play(game, move), true);
    }
  });

  test(`레벨 ${level}: 이길 수 있으면 바로 이긴다`, () => {
    const board = boardWith(
      [[3, 3], [4, 3], [5, 3], [6, 3]],
      [[7, 8], [8, 8], [9, 8], [11, 8], [2, 3]],
    );
    assert.equal(chooseMove(board, WHITE, level), at(10, 8));
  });

  test(`레벨 ${level}: 빈칸이 하나뿐이어도 둔다`, () => {
    const board = new Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) board[at(x, y)] = (x + 2 * y) % 4 < 2 ? BLACK : WHITE;
    }
    board[at(7, 7)] = EMPTY;
    assert.equal(chooseMove(board, WHITE, level), at(7, 7));
  });
}

for (const level of [2, 3, 4, 5]) {
  test(`레벨 ${level}: 상대의 4를 막는다`, () => {
    const board = boardWith([[4, 7], [5, 7], [6, 7], [7, 7]], [[3, 7], [6, 8], [7, 9]]);
    for (let i = 0; i < 5; i++) assert.equal(chooseMove(board, WHITE, level), at(8, 7));
  });
}

for (const level of [4, 5]) {
  test(`레벨 ${level}: 상대의 열린 3을 막는다`, () => {
    const board = boardWith([[6, 7], [7, 7], [8, 7]], [[6, 8], [10, 10]]);
    const blocks = [at(4, 7), at(5, 7), at(9, 7), at(10, 7)];
    assert.ok(blocks.includes(chooseMove(board, WHITE, level)));
  });
}

test('레벨 5: 4-4로 이기는 수를 찾는다', () => {
  // (7,7)에 두면 가로와 세로로 동시에 4가 된다. 흑은 각 줄의 한쪽 끝만 막고 있다.
  const board = boardWith(
    [[3, 7], [7, 3], [12, 12], [1, 13], [13, 1]],
    [[4, 7], [5, 7], [6, 7], [7, 4], [7, 5], [7, 6]],
  );
  assert.equal(chooseMove(board, WHITE, 5), at(7, 7));
});

test('레벨 5: 시간 제한(1.5초)을 지킨다', () => {
  const board = boardWith([[7, 7], [8, 8], [6, 8], [9, 6], [5, 9]], [[7, 8], [8, 7], [6, 6], [9, 9]]);
  const start = Date.now();
  chooseMove(board, WHITE, 5);
  assert.ok(Date.now() - start < 1700);
});
