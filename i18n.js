// 多語言：預設英文，依瀏覽器語言自動切換；使用者手動選擇後會記住
const I18N = (() => {
  const LANG_KEY = 'langMines';
  const FALLBACK = 'en';
  const REPO = '<a href="https://github.com/MrDaDaDo/Auto-Minesweeper">GitHub</a>';

  const NAMES = {
    en: 'English',
    'zh-Hant': '繁體中文',
    'zh-Hans': '简体中文',
    ja: '日本語',
    ko: '한국어',
  };

  const DICT = {
    en: {
      mines: 'Mines',
      time: 'Time',
      best: 'Best',
      intro: 'Clear the field without hitting a <b>mine</b>!',
      newGame: 'New Game',
      diff_beginner: 'Beginner (9×9, 10)',
      diff_intermediate: 'Intermediate (16×16, 40)',
      diff_expert: 'Expert (30×16, 99)',
      diff_custom: 'Custom',
      width: 'Width',
      height: 'Height',
      apply: 'Apply',
      flagMode: '🚩 Flag mode',
      win: 'You win!',
      lose: 'Boom!',
      retry: 'Try again',
      aiStart: 'AI Autoplay',
      aiStop: 'Stop AI',
      hint: 'Hint',
      aiParams: 'AI Settings',
      resetStats: 'Reset',
      param_delay: 'Delay per move (ms)',
      hint_delay: 'Extra wait between moves during autoplay',
      opt_autoRestart: 'Auto restart',
      hint_autoRestart: 'Start a new game automatically after each game, to measure the AI’s win rate',
      opt_showProb: 'Show mine probabilities',
      hint_showProb: 'Show the chance (%) that each covered cell is a mine',
      aiStatus: 'AI moves: {n} · Guesses: {g}',
      hintFirst: 'The first click is always safe',
      hintSafe: 'Found a cell that is 100% safe',
      hintGuess: 'No safe cell — best guess: {p}% mine risk',
      stats: 'AI record on this board: {w} / {n} wins ({r}%)',
      statsNone: 'AI record on this board: no games yet',
      tip: '<b>How to play:</b> <b>Left click</b> to open a cell, <b>right click</b> to place a flag. Click an opened number whose mines are all flagged to open its neighbors. On mobile, <b>long press</b> or use <b>Flag mode</b>. Press <b>F2</b> for a new game.',
      aboutTitle: 'About Auto-Minesweeper',
      about: `Auto-Minesweeper is a free, open-source Minesweeper game with a built-in AI solver. Press <b>AI Autoplay</b> to watch it play, or press <b>Hint</b> to see the best next move. The AI first applies simple logic, then computes the <b>exact mine probability</b> of every covered cell by enumerating all valid mine layouts on the frontier, and guesses the safest cell only when nothing is certain. Turn on <b>Show mine probabilities</b> to see its reasoning, and <b>Auto restart</b> to measure its win rate. Source code on ${REPO}.`,
    },
    'zh-Hant': {
      mines: '地雷',
      time: '時間',
      best: '最佳',
      intro: '翻開所有安全的格子，別踩到<b>地雷</b>！',
      newGame: '新遊戲',
      diff_beginner: '初級（9×9，10 雷）',
      diff_intermediate: '中級（16×16，40 雷）',
      diff_expert: '高級（30×16，99 雷）',
      diff_custom: '自訂',
      width: '寬',
      height: '高',
      apply: '套用',
      flagMode: '🚩 插旗模式',
      win: '你贏了！',
      lose: '踩到地雷！',
      retry: '再玩一次',
      aiStart: 'AI 自動玩',
      aiStop: '停止 AI',
      hint: '提示',
      aiParams: 'AI 參數',
      resetStats: '重設',
      param_delay: '每步間隔 (ms)',
      hint_delay: 'AI 自動玩時每步之間額外等待的時間',
      opt_autoRestart: '自動重新開局',
      hint_autoRestart: '每局結束後自動開新局，可用來統計 AI 勝率',
      opt_showProb: '顯示地雷機率',
      hint_showProb: '在每個未翻開的格子上顯示它是地雷的機率（%）',
      aiStatus: 'AI 已走 {n} 步 · 猜測 {g} 次',
      hintFirst: '第一步一定安全',
      hintSafe: '找到 100% 安全的格子',
      hintGuess: '沒有確定安全的格子，最佳猜測：踩雷機率 {p}%',
      stats: '此盤面 AI 戰績：{n} 局勝 {w} 局（{r}%）',
      statsNone: '此盤面 AI 戰績：尚無紀錄',
      tip: '<b>操作方式：</b><b>左鍵</b> 翻開格子，<b>右鍵</b> 插旗；在已插滿旗的數字上點一下可翻開周圍格子。手機可 <b>長按</b> 插旗或切換 <b>插旗模式</b>。按 <b>F2</b> 開新局。',
      aboutTitle: '關於 Auto-Minesweeper',
      about: `Auto-Minesweeper 是免費、開源的踩地雷遊戲，內建 AI 求解器。按 <b>AI 自動玩</b> 看它自己玩，或按 <b>提示</b> 查看最佳的下一步。AI 會先做簡單推理，再窮舉邊界所有合法的地雷配置，算出每個未翻開格子的<b>精確地雷機率</b>；只有在沒有確定安全的格子時，才會猜最安全的那一格。開啟 <b>顯示地雷機率</b> 可以看到它的判斷，開啟 <b>自動重新開局</b> 可以統計勝率。原始碼在 ${REPO}。`,
    },
    'zh-Hans': {
      mines: '地雷',
      time: '时间',
      best: '最佳',
      intro: '翻开所有安全的格子，别踩到<b>地雷</b>！',
      newGame: '新游戏',
      diff_beginner: '初级（9×9，10 雷）',
      diff_intermediate: '中级（16×16，40 雷）',
      diff_expert: '高级（30×16，99 雷）',
      diff_custom: '自定义',
      width: '宽',
      height: '高',
      apply: '应用',
      flagMode: '🚩 插旗模式',
      win: '你赢了！',
      lose: '踩到地雷！',
      retry: '再玩一次',
      aiStart: 'AI 自动玩',
      aiStop: '停止 AI',
      hint: '提示',
      aiParams: 'AI 参数',
      resetStats: '重置',
      param_delay: '每步间隔 (ms)',
      hint_delay: 'AI 自动玩时每步之间额外等待的时间',
      opt_autoRestart: '自动重新开局',
      hint_autoRestart: '每局结束后自动开新局，可用来统计 AI 胜率',
      opt_showProb: '显示地雷概率',
      hint_showProb: '在每个未翻开的格子上显示它是地雷的概率（%）',
      aiStatus: 'AI 已走 {n} 步 · 猜测 {g} 次',
      hintFirst: '第一步一定安全',
      hintSafe: '找到 100% 安全的格子',
      hintGuess: '没有确定安全的格子，最佳猜测：踩雷概率 {p}%',
      stats: '此盘面 AI 战绩：{n} 局胜 {w} 局（{r}%）',
      statsNone: '此盘面 AI 战绩：暂无记录',
      tip: '<b>操作方式：</b><b>左键</b> 翻开格子，<b>右键</b> 插旗；在已插满旗的数字上点一下可翻开周围格子。手机可 <b>长按</b> 插旗或切换 <b>插旗模式</b>。按 <b>F2</b> 开新局。',
      aboutTitle: '关于 Auto-Minesweeper',
      about: `Auto-Minesweeper 是免费、开源的扫雷游戏，内置 AI 求解器。按 <b>AI 自动玩</b> 看它自己玩，或按 <b>提示</b> 查看最佳的下一步。AI 会先做简单推理，再穷举边界所有合法的地雷配置，算出每个未翻开格子的<b>精确地雷概率</b>；只有在没有确定安全的格子时，才会猜最安全的那一格。开启 <b>显示地雷概率</b> 可以看到它的判断，开启 <b>自动重新开局</b> 可以统计胜率。源代码在 ${REPO}。`,
    },
    ja: {
      mines: '地雷',
      time: '時間',
      best: 'ベスト',
      intro: '<b>地雷</b>を踏まずにすべてのマスを開けよう！',
      newGame: '新しいゲーム',
      diff_beginner: '初級（9×9、10個）',
      diff_intermediate: '中級（16×16、40個）',
      diff_expert: '上級（30×16、99個）',
      diff_custom: 'カスタム',
      width: '幅',
      height: '高さ',
      apply: '適用',
      flagMode: '🚩 旗モード',
      win: 'クリア！',
      lose: 'ドカン！',
      retry: 'もう一度',
      aiStart: 'AI 自動プレイ',
      aiStop: 'AI 停止',
      hint: 'ヒント',
      aiParams: 'AI 設定',
      resetStats: 'リセット',
      param_delay: '1手ごとの間隔 (ms)',
      hint_delay: '自動プレイ中、手と手の間に追加で待つ時間',
      opt_autoRestart: '自動で再スタート',
      hint_autoRestart: '1ゲーム終わるごとに自動で新しいゲームを始め、AI の勝率を計測します',
      opt_showProb: '地雷確率を表示',
      hint_showProb: '開いていない各マスが地雷である確率（%）を表示します',
      aiStatus: 'AI の手数：{n} · 推測：{g} 回',
      hintFirst: '最初の1手は必ず安全です',
      hintSafe: '100% 安全なマスが見つかりました',
      hintGuess: '安全なマスがありません — 最善の推測：地雷確率 {p}%',
      stats: 'この盤面での AI の戦績：{n} 戦 {w} 勝（{r}%）',
      statsNone: 'この盤面での AI の戦績：まだありません',
      tip: '<b>遊び方：</b><b>左クリック</b>でマスを開き、<b>右クリック</b>で旗を立てます。旗が揃った数字をクリックすると周囲をまとめて開けます。スマホでは<b>長押し</b>か<b>旗モード</b>を使います。<b>F2</b> で新しいゲーム。',
      aboutTitle: 'Auto-Minesweeper について',
      about: `Auto-Minesweeper は AI ソルバーを内蔵した無料・オープンソースのマインスイーパーです。<b>AI 自動プレイ</b>で AI のプレイを観戦したり、<b>ヒント</b>で最善の次の一手を確認できます。AI はまず簡単な論理で推論し、次に境界上のあり得る地雷配置をすべて列挙して、各マスの<b>正確な地雷確率</b>を計算します。確実に安全なマスがないときだけ、最も安全なマスを推測します。<b>地雷確率を表示</b>で AI の判断を、<b>自動で再スタート</b>で勝率を確認できます。ソースコードは ${REPO} にあります。`,
    },
    ko: {
      mines: '지뢰',
      time: '시간',
      best: '최고',
      intro: '<b>지뢰</b>를 밟지 말고 모든 칸을 열어 보세요!',
      newGame: '새 게임',
      diff_beginner: '초급 (9×9, 10개)',
      diff_intermediate: '중급 (16×16, 40개)',
      diff_expert: '고급 (30×16, 99개)',
      diff_custom: '사용자 지정',
      width: '너비',
      height: '높이',
      apply: '적용',
      flagMode: '🚩 깃발 모드',
      win: '승리!',
      lose: '펑!',
      retry: '다시 하기',
      aiStart: 'AI 자동 플레이',
      aiStop: 'AI 중지',
      hint: '힌트',
      aiParams: 'AI 설정',
      resetStats: '초기화',
      param_delay: '수당 대기 (ms)',
      hint_delay: '자동 플레이 중 수와 수 사이의 추가 대기 시간',
      opt_autoRestart: '자동 재시작',
      hint_autoRestart: '게임이 끝날 때마다 새 게임을 자동으로 시작해 AI 승률을 측정합니다',
      opt_showProb: '지뢰 확률 표시',
      hint_showProb: '열리지 않은 각 칸이 지뢰일 확률(%)을 표시합니다',
      aiStatus: 'AI 이동: {n} · 추측: {g}회',
      hintFirst: '첫 클릭은 항상 안전합니다',
      hintSafe: '100% 안전한 칸을 찾았습니다',
      hintGuess: '안전한 칸이 없습니다 — 최선의 추측: 지뢰 확률 {p}%',
      stats: '이 판의 AI 전적: {n}판 중 {w}승 ({r}%)',
      statsNone: '이 판의 AI 전적: 아직 없음',
      tip: '<b>플레이 방법:</b> <b>왼쪽 클릭</b>으로 칸을 열고 <b>오른쪽 클릭</b>으로 깃발을 꽂습니다. 깃발이 모두 꽂힌 숫자를 클릭하면 주변 칸이 열립니다. 모바일에서는 <b>길게 누르기</b> 또는 <b>깃발 모드</b>를 사용하세요. <b>F2</b>로 새 게임.',
      aboutTitle: 'Auto-Minesweeper 소개',
      about: `Auto-Minesweeper는 AI 솔버가 내장된 무료 오픈 소스 지뢰찾기 게임입니다. <b>AI 자동 플레이</b>를 눌러 AI가 플레이하는 모습을 보거나 <b>힌트</b>로 최선의 다음 수를 확인하세요. AI는 먼저 간단한 논리로 추론한 뒤, 경계에서 가능한 모든 지뢰 배치를 열거해 각 칸의 <b>정확한 지뢰 확률</b>을 계산하고, 확실히 안전한 칸이 없을 때만 가장 안전한 칸을 추측합니다. <b>지뢰 확률 표시</b>로 AI의 판단을, <b>자동 재시작</b>으로 승률을 확인할 수 있습니다. 소스 코드는 ${REPO}에 있습니다.`,
    },
  };

  // 依瀏覽器語言清單找出第一個支援的語言；都不支援則回傳英文
  function detect() {
    const list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (const raw of list) {
      const l = (raw || '').toLowerCase();
      if (l.startsWith('zh')) return /hant|tw|hk|mo/.test(l) ? 'zh-Hant' : 'zh-Hans';
      if (l.startsWith('ja')) return 'ja';
      if (l.startsWith('ko')) return 'ko';
      if (l.startsWith('en')) return 'en';
    }
    return FALLBACK;
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return DICT[saved] ? saved : null;
    } catch {
      return null;
    }
  }

  let lang = loadSaved() || detect();
  const listeners = [];

  function t(key, vars = {}) {
    const text = DICT[lang][key] ?? DICT[FALLBACK][key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  }

  // 套用到帶有 data-i18n（純文字）或 data-i18n-html（含標記）屬性的元素
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
  }

  function setLang(next) {
    if (!DICT[next]) return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch { /* 忽略 */ }
    apply();
    listeners.forEach(fn => fn());
  }

  return {
    t,
    apply,
    setLang,
    getLang: () => lang,
    onChange: fn => listeners.push(fn),
    NAMES,
  };
})();
