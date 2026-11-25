// 화면: 시작 메뉴, 캔버스 오목판, 턴 진행
(() => {
  const { SIZE, EMPTY, BLACK, WHITE } = Omok;
  const STAR_POINTS = [3, 7, 11];

  const $ = (id) => document.getElementById(id);
  const form = $('start-form');
  const canvas = $('board');
  const ctx = canvas.getContext('2d');

  let game;
  let aiLevel = 0; // 0이면 사람 대 사람
  let aiTimer = null; // null이 아니면 AI가 둘 차례

  // --- 그리기 ---

  function draw() {
    const width = canvas.clientWidth;
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(width * scale);
    ctx.scale(scale, scale);

    const cell = width / SIZE;
    const pos = (i) => (i + 0.5) * cell;

    ctx.fillStyle = '#dcb468';
    ctx.fillRect(0, 0, width, width);

    ctx.strokeStyle = '#6b4f1f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < SIZE; i++) {
      ctx.moveTo(pos(0), pos(i));
      ctx.lineTo(pos(SIZE - 1), pos(i));
      ctx.moveTo(pos(i), pos(0));
      ctx.lineTo(pos(i), pos(SIZE - 1));
    }
    ctx.stroke();

    const circle = (x, y, radius) => {
      ctx.beginPath();
      ctx.arc(pos(x), pos(y), radius, 0, Math.PI * 2);
    };

    ctx.fillStyle = '#6b4f1f';
    for (const x of STAR_POINTS) {
      for (const y of STAR_POINTS) {
        circle(x, y, cell * 0.1);
        ctx.fill();
      }
    }

    game.board.forEach((color, i) => {
      if (color === EMPTY) return;
      const x = i % SIZE;
      const y = Math.floor(i / SIZE);
      circle(x, y, cell * 0.44);
      ctx.fillStyle = color === BLACK ? '#1c1c1c' : '#fafafa';
      ctx.fill();
      ctx.strokeStyle = '#1c1c1c';
      ctx.stroke();

      if (game.winLine && game.winLine.includes(i)) {
        circle(x, y, cell * 0.44);
        ctx.strokeStyle = '#d6322b';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      if (i === game.lastMove) {
        circle(x, y, cell * 0.12);
        ctx.fillStyle = '#d6322b';
        ctx.fill();
      }
    });
  }

  function statusText() {
    const name = game.turn === BLACK ? '흑' : '백';
    if (game.winner !== EMPTY) {
      if (!aiLevel) return `${name} 승리!`;
      return game.winner === BLACK ? '플레이어 승리!' : 'AI 승리!';
    }
    if (game.over) return '무승부';
    if (!aiLevel) return `${name} 차례`;
    return game.turn === BLACK ? '플레이어(흑) 차례' : 'AI 생각 중…';
  }

  function render() {
    $('status').textContent = statusText();
    draw();
  }

  // --- 진행 ---

  function newGame() {
    clearTimeout(aiTimer);
    aiTimer = null;
    game = Omok.createGame();
    render();
  }

  function playAndContinue(index) {
    if (!Omok.play(game, index)) return;
    render();
    if (aiLevel && !game.over && game.turn === WHITE) {
      // 사람의 돌과 안내 문구가 먼저 화면에 보이도록 잠시 기다린다.
      aiTimer = setTimeout(() => {
        const move = OmokAI.chooseMove(game.board, WHITE, aiLevel);
        // 계산 중 눌린 클릭이 AI의 착수 뒤에 처리되지 않도록 한 박자 늦게 둔다.
        aiTimer = setTimeout(() => {
          aiTimer = null;
          playAndContinue(move);
        }, 50);
      }, 150);
    }
  }

  canvas.addEventListener('click', (event) => {
    if (aiTimer !== null) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE);
    if (Omok.inside(x, y)) playAndContinue(y * SIZE + x);
  });

  // --- 메뉴 ---

  form.addEventListener('change', () => {
    $('level-field').hidden = form.elements.mode.value !== 'ai';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    aiLevel = form.elements.mode.value === 'ai' ? Number(form.elements.level.value) : 0;
    $('mode-label').textContent = aiLevel ? `사람 대 AI (수준 ${aiLevel})` : '사람 대 사람';
    $('start-screen').hidden = true;
    $('game-screen').hidden = false;
    newGame();
  });

  $('restart').addEventListener('click', newGame);

  $('to-menu').addEventListener('click', () => {
    clearTimeout(aiTimer);
    aiTimer = null;
    $('game-screen').hidden = true;
    $('start-screen').hidden = false;
  });

  window.addEventListener('resize', () => {
    if (!$('game-screen').hidden) draw();
  });

  // 새로고침 시 브라우저가 이전 선택을 복원하는 경우에 맞춘다.
  $('level-field').hidden = form.elements.mode.value !== 'ai';
})();
