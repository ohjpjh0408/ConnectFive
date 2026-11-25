// 오목 AI. chooseMove(board, color, level)만 외부에 공개한다. DOM에 의존하지 않는다.
//
// 판 위의 모든 "연속 5칸 창"(572개)마다 흑·백 돌 수를 세어 두고 이를 바탕으로 판단한다.
// 한쪽 돌만 있는 창은 그쪽이 5목을 만들 수 있는 자리이고, 양쪽 돌이 섞인 창은 죽은 자리다.
const OmokAI = ((Omok) => {
  const { SIZE, EMPTY, BLACK, DIRECTIONS, inside, opponent } = Omok;
  const CELLS = SIZE * SIZE;
  const WIN = 1e7;
  const LEVEL4_DEPTH = 4;
  const LEVEL5_TIME_MS = 1500;
  const LEVEL5_MAX_DEPTH = 20;
  const VCF_DEPTH = 10;

  // 창에 한쪽 돌만 n개 있을 때의 값
  const ATTACK = [1, 12, 110, 1000, 1e6]; // 내가 여기에 두어 n+1개가 될 때
  const DEFENSE = [0, 10, 90, 800, 1e5]; // 상대의 n개를 여기서 막을 때
  const VALUE = [0, 1, 10, 70, 400, 0]; // 판 전체 평가용

  const WINDOWS = [];
  const WINDOWS_AT = Array.from({ length: CELLS }, () => []);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      for (const [dx, dy] of DIRECTIONS) {
        if (!inside(x + dx * 4, y + dy * 4)) continue;
        const cells = [0, 1, 2, 3, 4].map((i) => (y + dy * i) * SIZE + x + dx * i);
        for (const c of cells) WINDOWS_AT[c].push(WINDOWS.length);
        WINDOWS.push(cells);
      }
    }
  }

  const NEIGHBORS = Array.from({ length: CELLS }, (_, i) => {
    const list = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = (i % SIZE) + dx;
        const y = Math.floor(i / SIZE) + dy;
        if ((dx || dy) && inside(x, y)) list.push(y * SIZE + x);
      }
    }
    return list;
  });

  class Timeout extends Error {}

  class Position {
    constructor(board) {
      this.board = new Array(CELLS).fill(EMPTY);
      this.counts = [null, new Uint8Array(WINDOWS.length), new Uint8Array(WINDOWS.length)];
      this.value = [0, 0, 0];
      this.fours = [0, 0, 0]; // 한 수로 5목이 되는 창의 수
      this.near = new Uint8Array(CELLS); // 2칸 이내에 있는 돌의 수
      this.deadline = Infinity;
      board.forEach((color, i) => color !== EMPTY && this.place(i, color));
    }

    place(index, color) {
      this.board[index] = color;
      this.update(index, color, 1);
    }

    undo(index) {
      const color = this.board[index];
      this.board[index] = EMPTY;
      this.update(index, color, -1);
    }

    update(index, color, delta) {
      for (const w of WINDOWS_AT[index]) {
        this.tally(w, -1);
        this.counts[color][w] += delta;
        this.tally(w, 1);
      }
      for (const n of NEIGHBORS[index]) this.near[n] += delta;
    }

    tally(w, sign) {
      const black = this.counts[1][w];
      const white = this.counts[2][w];
      if (black && white) return;
      const color = white ? 2 : 1;
      const n = black + white;
      this.value[color] += sign * VALUE[n];
      if (n === 4) this.fours[color] += sign;
    }

    // color만 n개 있는 창들의 빈칸
    emptyCells(color, n) {
      const mine = this.counts[color];
      const theirs = this.counts[opponent(color)];
      const cells = new Set();
      for (let w = 0; w < WINDOWS.length; w++) {
        if (mine[w] !== n || theirs[w] !== 0) continue;
        for (const c of WINDOWS[w]) if (this.board[c] === EMPTY) cells.add(c);
      }
      return [...cells];
    }

    // 두면 바로 5목이 되는 자리
    winningCells(color) {
      return this.fours[color] ? this.emptyCells(color, 4) : [];
    }

    // 이 자리에 두는 수의 가치 (공격 + 수비)
    moveScore(index, color) {
      const mine = this.counts[color];
      const theirs = this.counts[opponent(color)];
      let score = 0;
      for (const w of WINDOWS_AT[index]) {
        if (theirs[w] === 0) score += ATTACK[mine[w]];
        if (mine[w] === 0) score += DEFENSE[theirs[w]];
      }
      return score;
    }

    // 후보 수를 점수가 높은 순으로 반환한다.
    candidates(color) {
      const list = [];
      for (let i = 0; i < CELLS; i++) {
        if (this.board[i] === EMPTY && this.near[i]) list.push({ move: i, score: this.moveScore(i, color) });
      }
      // 2칸 이내에 빈칸이 없는 극단적인 경우에는 모든 빈칸을 후보로 본다.
      if (!list.length) {
        this.board.forEach((c, i) => c === EMPTY && list.push({ move: i, score: 0 }));
      }
      return list.sort((a, b) => b.score - a.score);
    }

    checkTime() {
      if (Date.now() > this.deadline) throw new Timeout();
    }

    // VCF: 연속으로 4를 만들어 이길 수 있으면 첫 수를, 없으면 -1을 반환한다.
    // 시작 시점에 color의 차례여야 한다.
    vcf(color, depth) {
      this.checkTime();
      const wins = this.winningCells(color);
      if (wins.length) return wins[0];
      if (depth === 0) return -1;
      const opp = opponent(color);
      const threats = this.winningCells(opp);
      if (threats.length > 1) return -1;
      let moves = this.emptyCells(color, 3);
      if (threats.length) moves = moves.filter((m) => m === threats[0]);
      for (const move of moves) {
        this.place(move, color);
        const targets = this.winningCells(color);
        let won = targets.length > 1;
        try {
          if (targets.length === 1) {
            this.place(targets[0], opp);
            try {
              won = this.vcf(color, depth - 1) !== -1;
            } finally {
              this.undo(targets[0]);
            }
          }
        } finally {
          this.undo(move);
        }
        if (won) return move;
      }
      return -1;
    }

    // 알파베타 탐색(negamax). color가 둘 차례일 때 color 관점의 점수를 반환한다.
    search(color, depth, ply, alpha, beta, width) {
      this.checkTime();
      if (this.fours[color]) return WIN - ply;
      const opp = opponent(color);
      const threats = this.winningCells(opp);
      if (threats.length > 1) return -(WIN - ply - 1);
      let moves;
      if (threats.length === 1) {
        // 막을 곳이 하나뿐이므로 깊이를 줄이지 않고 이어서 읽는다.
        moves = threats;
      } else {
        // 내 차례이므로 내 모양을 조금 더 높게 본다.
        if (depth <= 0) return this.value[color] * 1.3 - this.value[opp];
        moves = this.candidates(color).slice(0, width).map((c) => c.move);
        if (!moves.length) return 0;
      }
      const nextDepth = threats.length === 1 ? depth : depth - 1;
      let best = -Infinity;
      for (const move of moves) {
        this.place(move, color);
        let score;
        try {
          score = -this.search(opp, nextDepth, ply + 1, -beta, -alpha, width);
        } finally {
          this.undo(move);
        }
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }

    // 루트 후보들을 depth까지 읽어 점수가 높은 순으로 반환한다.
    rankRoot(moves, color, depth, width) {
      let alpha = -Infinity;
      const ranked = [];
      for (const move of moves) {
        this.place(move, color);
        let score;
        try {
          score = -this.search(opponent(color), depth - 1, 1, -Infinity, -alpha, width);
        } finally {
          this.undo(move);
        }
        ranked.push({ move, score });
        if (score > alpha) alpha = score;
      }
      return ranked.sort((a, b) => b.score - a.score);
    }
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function bestByScore(candidates) {
    return pick(candidates.filter((c) => c.score === candidates[0].score)).move;
  }

  function level5(pos, color, candidates) {
    const start = Date.now();
    const opp = opponent(color);
    let moves = candidates.slice(0, 14).map((c) => c.move);
    let best = moves[0];

    // 시간 제한이 걸려도 남은 시간을 탐색에 쓸 수 있도록 VCF에는 일부만 배정한다.
    try {
      pos.deadline = start + LEVEL5_TIME_MS * 0.2;
      const attack = pos.vcf(color, VCF_DEPTH);
      if (attack !== -1) return attack;
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
    }

    // 상대에게 VCF를 허용하는 수는 제외한다. 모두 허용하면 그대로 둔다.
    const safe = [];
    try {
      pos.deadline = start + LEVEL5_TIME_MS * 0.5;
      for (const move of moves) {
        pos.place(move, color);
        try {
          if (pos.vcf(opp, VCF_DEPTH) === -1) safe.push(move);
        } finally {
          pos.undo(move);
        }
      }
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
    }
    if (safe.length) {
      moves = safe;
      best = moves[0];
    }
    if (moves.length === 1) return best;

    try {
      pos.deadline = start + LEVEL5_TIME_MS;
      for (let depth = 2; depth <= LEVEL5_MAX_DEPTH; depth++) {
        const ranked = pos.rankRoot(moves, color, depth, 12);
        best = ranked[0].move;
        moves = ranked.map((r) => r.move);
        if (Math.abs(ranked[0].score) > WIN / 2) break; // 승패가 확정됨
      }
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
    }
    return best;
  }

  // color의 차례인 board에서 둘 자리(인덱스)를 고른다. level은 1~5.
  function chooseMove(board, color, level) {
    const pos = new Position(board);
    if (board.every((c) => c === EMPTY)) return Math.floor(CELLS / 2);

    const wins = pos.winningCells(color);
    if (wins.length) return wins[0];

    const candidates = pos.candidates(color);
    if (level === 1) return Math.random() < 0.4 ? bestByScore(candidates) : pick(candidates).move;

    const threats = pos.winningCells(opponent(color));
    if (threats.length) return threats[0];

    if (level === 2) {
      const noisy = candidates.map((c) => ({ move: c.move, score: c.score * (0.2 + 0.8 * Math.random()) }));
      return bestByScore(noisy.sort((a, b) => b.score - a.score));
    }
    if (level === 3) return bestByScore(candidates);
    if (level === 4) {
      const moves = candidates.slice(0, 10).map((c) => c.move);
      return pos.rankRoot(moves, color, LEVEL4_DEPTH, 10)[0].move;
    }
    return level5(pos, color, candidates);
  }

  return { chooseMove };
})(typeof module !== 'undefined' ? require('./game.js') : Omok);

if (typeof module !== 'undefined') module.exports = OmokAI;
