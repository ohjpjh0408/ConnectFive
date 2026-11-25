// 두 레벨을 자동으로 대국시켜 득점률을 출력한다. 같은 오프닝을 흑백을 바꿔 두 번씩 둔다.
// 사용법: node tools/tournament.js <낮은 레벨> <높은 레벨> [판 수]
const { SIZE, EMPTY, BLACK, createGame, play } = require('../js/game.js');
const { chooseMove } = require('../js/ai.js');

const [low, high, games = 20] = process.argv.slice(2).map(Number);

// 가운데 5×5 안에서 무작위로 세 수를 둔다.
function randomOpening() {
  const cells = new Set();
  while (cells.size < 3) {
    const x = 5 + Math.floor(Math.random() * 5);
    const y = 5 + Math.floor(Math.random() * 5);
    cells.add(y * SIZE + x);
  }
  return [...cells];
}

const result = { win: 0, draw: 0, loss: 0 };
const maxMs = { [low]: 0, [high]: 0 };
let opening;
for (let i = 0; i < games; i++) {
  if (i % 2 === 0) opening = randomOpening();
  const game = createGame();
  opening.forEach((move) => play(game, move));
  const highColor = i % 2 === 0 ? BLACK : 3 - BLACK;
  while (!game.over) {
    const level = game.turn === highColor ? high : low;
    const start = Date.now();
    const move = chooseMove(game.board, game.turn, level);
    maxMs[level] = Math.max(maxMs[level], Date.now() - start);
    if (!play(game, move)) throw new Error(`레벨 ${level}이 둘 수 없는 자리를 골랐습니다: ${move}`);
  }
  if (game.winner === EMPTY) result.draw++;
  else if (game.winner === highColor) result.win++;
  else result.loss++;
}
const rate = ((result.win + result.draw / 2) / games) * 100;
console.log(`레벨 ${high} vs ${low}: ${result.win}승 ${result.draw}무 ${result.loss}패, 득점률 ${rate.toFixed(1)}%, 최대 소요(ms) ${JSON.stringify(maxMs)}`);
