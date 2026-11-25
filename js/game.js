// 오목 규칙 (자유룰: 금수 없음, 5개 이상 연속이면 승리). DOM에 의존하지 않는다.
const Omok = (() => {
  const SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const inside = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
  const opponent = (color) => 3 - color;

  function createGame() {
    return {
      board: new Array(SIZE * SIZE).fill(EMPTY), // 인덱스 = y * SIZE + x
      turn: BLACK,
      lastMove: -1,
      winner: EMPTY,
      winLine: null,
      over: false,
    };
  }

  // index에 놓인 돌을 지나는 5개 이상의 연속 줄을 반환한다. 없으면 null.
  function findWinLine(board, index) {
    const color = board[index];
    const x = index % SIZE;
    const y = Math.floor(index / SIZE);
    for (const [dx, dy] of DIRECTIONS) {
      const line = [index];
      for (const sign of [1, -1]) {
        let cx = x + dx * sign;
        let cy = y + dy * sign;
        while (inside(cx, cy) && board[cy * SIZE + cx] === color) {
          line.push(cy * SIZE + cx);
          cx += dx * sign;
          cy += dy * sign;
        }
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  // 현재 차례의 돌을 놓는다. 둘 수 없는 자리면 false를 반환한다.
  function play(game, index) {
    if (game.over || game.board[index] !== EMPTY) return false;
    game.board[index] = game.turn;
    game.lastMove = index;
    game.winLine = findWinLine(game.board, index);
    if (game.winLine) {
      game.winner = game.turn;
      game.over = true;
    } else if (!game.board.includes(EMPTY)) {
      game.over = true;
    } else {
      game.turn = opponent(game.turn);
    }
    return true;
  }

  return { SIZE, EMPTY, BLACK, WHITE, DIRECTIONS, inside, opponent, createGame, findWinLine, play };
})();

if (typeof module !== 'undefined') module.exports = Omok;
