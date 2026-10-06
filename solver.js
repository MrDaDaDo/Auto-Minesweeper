// 踩地雷求解器：先做簡單推理，再對邊界格做精確機率計算（窮舉 + 組合數加權）
const Solver = (() => {
  const UNKNOWN = -1;
  const FLAG = -2;
  const NODE_LIMIT = 200000; // 單一連通區塊窮舉的節點上限，超過改用近似機率
  const EPS = 1e-9;

  const nbCache = new Map();

  // 每格的鄰居索引（依盤面大小快取）
  function getNeighbors(w, h) {
    const key = w + 'x' + h;
    if (nbCache.has(key)) return nbCache.get(key);
    const list = [];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const nb = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < h && cc >= 0 && cc < w) nb.push(rr * w + cc);
          }
        }
        list.push(nb);
      }
    }
    nbCache.set(key, list);
    return list;
  }

  const logFact = [0];
  function logC(n, k) {
    if (k < 0 || k > n) return -Infinity;
    while (logFact.length <= n) logFact.push(logFact[logFact.length - 1] + Math.log(logFact.length));
    return logFact[n] - logFact[k] - logFact[n - k];
  }

  function convolve(a, b) {
    const out = new Float64Array(a.length + b.length - 1);
    for (let i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    }
    return out;
  }

  // 對一個連通區塊窮舉所有合法的雷配置
  // 回傳 ways[k]：放 k 顆雷的配置數；hits[k][x]：其中第 x 格是雷的配置數（皆已正規化）
  function solveComponent(cells, cons, maxMines) {
    const n = cells.length;
    const local = new Map(cells.map((c, i) => [c, i]));
    const m = cons.length;
    const need = new Int32Array(m);
    const left = new Int32Array(m);
    const sum = new Int32Array(m);
    const cellCons = Array.from({ length: n }, () => []);
    cons.forEach((c, ci) => {
      need[ci] = c.need;
      left[ci] = c.cells.length;
      for (const cell of c.cells) cellCons[local.get(cell)].push(ci);
    });

    const ways = new Float64Array(n + 1);
    const hits = Array.from({ length: n + 1 }, () => new Float64Array(n));
    const assign = new Uint8Array(n);
    let nodes = 0;
    let aborted = false;

    function rec(j, k) {
      if (j === n) {
        ways[k]++;
        const hk = hits[k];
        for (let x = 0; x < n; x++) if (assign[x]) hk[x]++;
        return;
      }
      if (++nodes > NODE_LIMIT) { aborted = true; return; }
      for (let v = 0; v <= 1; v++) {
        if (v === 1 && k >= maxMines) break;
        let ok = true;
        const cl = cellCons[j];
        for (const ci of cl) {
          sum[ci] += v;
          left[ci]--;
          if (sum[ci] > need[ci] || sum[ci] + left[ci] < need[ci]) ok = false;
        }
        if (ok) {
          assign[j] = v;
          rec(j + 1, k + v);
        }
        for (const ci of cl) {
          sum[ci] -= v;
          left[ci]++;
        }
        if (aborted) return;
      }
    }
    rec(0, 0);

    if (aborted) {
      // 近似：每格取所屬限制中最高的「剩餘雷數 / 格數」，雷數視為固定值
      const p = new Float64Array(n);
      cons.forEach(c => {
        const ratio = Math.min(1, Math.max(0, c.need / c.cells.length));
        for (const cell of c.cells) {
          const x = local.get(cell);
          p[x] = Math.max(p[x], ratio);
        }
      });
      const k0 = Math.min(maxMines, Math.round(p.reduce((s, v) => s + v, 0)));
      const w = new Float64Array(k0 + 1);
      w[k0] = 1;
      const h = Array.from({ length: k0 + 1 }, () => new Float64Array(n));
      h[k0] = p;
      return { cells, ways: w, hits: h, approx: true };
    }

    const max = Math.max(...ways);
    if (max > 0) {
      for (let k = 0; k <= n; k++) {
        ways[k] /= max;
        for (let x = 0; x < n; x++) hits[k][x] /= max;
      }
    }
    return { cells, ways, hits, approx: false };
  }

  // view: { w, h, mines, cells }，cells[i] 為 0~8（已開）、UNKNOWN 或 FLAG
  // 回傳每個未開格的雷機率、確定安全/確定是雷的格子，以及最佳下一步
  function analyze({ w, h, mines, cells }) {
    const n = w * h;
    const nb = getNeighbors(w, h);
    const prob = new Float64Array(n).fill(NaN);
    let flags = 0, unknownCount = 0, openCount = 0;
    for (let i = 0; i < n; i++) {
      if (cells[i] === FLAG) flags++;
      else if (cells[i] === UNKNOWN) unknownCount++;
      else openCount++;
    }

    // 每個已開數字格形成一條限制：周圍未開格的雷數 = 數字 - 周圍旗子數
    const cons = [];
    for (let i = 0; i < n; i++) {
      if (cells[i] < 0) continue;
      const unk = [];
      let f = 0;
      for (const j of nb[i]) {
        if (cells[j] === UNKNOWN) unk.push(j);
        else if (cells[j] === FLAG) f++;
      }
      if (unk.length) cons.push({ cells: unk, need: cells[i] - f });
    }

    // 簡單推理：0 = 未定，1 = 確定是雷，2 = 確定安全
    const state = new Int8Array(n);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of cons) {
        let need = c.need;
        const free = [];
        for (const j of c.cells) {
          if (state[j] === 1) need--;
          else if (state[j] === 0) free.push(j);
        }
        if (!free.length) continue;
        if (need === 0) {
          free.forEach(j => { state[j] = 2; });
          changed = true;
        } else if (need === free.length) {
          free.forEach(j => { state[j] = 1; });
          changed = true;
        }
      }
    }

    let minesLeft = mines - flags;
    for (let i = 0; i < n; i++) if (state[i] === 1) minesLeft--;

    const reduced = [];
    for (const c of cons) {
      let need = c.need;
      const free = [];
      for (const j of c.cells) {
        if (state[j] === 1) need--;
        else if (state[j] === 0) free.push(j);
      }
      if (free.length) reduced.push({ cells: free, need });
    }

    // 依共用限制把邊界格分成互不相干的連通區塊（BFS 順序有助於窮舉時提早剪枝）
    const cellCons = new Map();
    reduced.forEach((c, ci) => c.cells.forEach(j => {
      if (!cellCons.has(j)) cellCons.set(j, []);
      cellCons.get(j).push(ci);
    }));
    const seen = new Set();
    const comps = [];
    for (const start of cellCons.keys()) {
      if (seen.has(start)) continue;
      const list = [];
      const consSet = new Set();
      const queue = [start];
      seen.add(start);
      for (let q = 0; q < queue.length; q++) {
        const j = queue[q];
        list.push(j);
        for (const ci of cellCons.get(j)) {
          if (consSet.has(ci)) continue;
          consSet.add(ci);
          for (const k of reduced[ci].cells) {
            if (!seen.has(k)) { seen.add(k); queue.push(k); }
          }
        }
      }
      comps.push(solveComponent(list, [...consSet].map(ci => reduced[ci]), Math.max(0, minesLeft)));
    }

    const interior = [];
    for (let i = 0; i < n; i++) {
      if (cells[i] === UNKNOWN && state[i] === 0 && !cellCons.has(i)) interior.push(i);
    }
    const I = interior.length;

    // prefix[i] = 區塊 0..i-1 的雷數分布卷積，suffix[i] = 區塊 i.. 的卷積
    const one = new Float64Array([1]);
    const prefix = [one];
    for (const c of comps) prefix.push(convolve(prefix[prefix.length - 1], c.ways));
    const suffix = new Array(comps.length + 1);
    suffix[comps.length] = one;
    for (let i = comps.length - 1; i >= 0; i--) suffix[i] = convolve(comps[i].ways, suffix[i + 1]);
    const total = prefix[comps.length];

    // 邊界放 K 顆雷時，剩下的雷散佈在內部格的方法數 C(I, minesLeft - K)，以對數避免溢位
    let base = -Infinity;
    for (let K = 0; K < total.length; K++) {
      if (total[K] > 0) base = Math.max(base, logC(I, minesLeft - K));
    }
    const coef = K => {
      const l = logC(I, minesLeft - K);
      return l === -Infinity ? 0 : Math.exp(l - base);
    };
    let Z = 0;
    let interiorMines = 0;
    for (let K = 0; K < total.length; K++) {
      const wgt = total[K] * coef(K);
      Z += wgt;
      interiorMines += wgt * (minesLeft - K);
    }

    const undetermined = [];
    for (let i = 0; i < n; i++) if (cells[i] === UNKNOWN && state[i] === 0) undetermined.push(i);

    if (Z > 0 && Number.isFinite(Z)) {
      comps.forEach((c, ci) => {
        const others = convolve(prefix[ci], suffix[ci + 1]);
        for (let k = 0; k < c.ways.length; k++) {
          if (!c.ways[k]) continue;
          let s = 0;
          for (let K = 0; K < others.length; K++) if (others[K]) s += others[K] * coef(k + K);
          if (!s) continue;
          const hk = c.hits[k];
          c.cells.forEach((cell, x) => {
            prob[cell] = (Number.isNaN(prob[cell]) ? 0 : prob[cell]) + hk[x] * s;
          });
        }
        c.cells.forEach(cell => {
          prob[cell] = Number.isNaN(prob[cell]) ? 0 : prob[cell] / Z;
        });
      });
      const pi = I ? interiorMines / Z / I : 0;
      interior.forEach(i => { prob[i] = pi; });
    } else {
      // 盤面矛盾（例如插錯旗）：退而求其次，平均分配剩餘雷數
      const p = undetermined.length ? Math.min(1, Math.max(0, minesLeft / undetermined.length)) : 0;
      undetermined.forEach(i => { prob[i] = p; });
    }
    for (let i = 0; i < n; i++) {
      if (state[i] === 1) prob[i] = 1;
      else if (state[i] === 2) prob[i] = 0;
    }

    const safe = [];
    const mineList = [];
    let best = -1, bestProb = Infinity, bestNb = Infinity;
    for (let i = 0; i < n; i++) {
      if (cells[i] !== UNKNOWN) continue;
      const p = prob[i];
      if (p < EPS) safe.push(i);
      else if (p > 1 - EPS) mineList.push(i);
      // 機率相同時優先選未開鄰居較少的格子（角落、邊緣較容易開出空白區）
      let unk = 0;
      for (const j of nb[i]) if (cells[j] === UNKNOWN) unk++;
      if (p < bestProb - 1e-6 || (Math.abs(p - bestProb) <= 1e-6 && unk < bestNb)) {
        best = i;
        bestProb = p;
        bestNb = unk;
      }
    }

    // 第一步必定安全，直接點正中央
    const first = openCount === 0;
    if (first) {
      best = Math.floor(h / 2) * w + Math.floor(w / 2);
      bestProb = 0;
    }

    return { prob, safe, mines: mineList, best, bestProb, first };
  }

  return { analyze, getNeighbors, UNKNOWN, FLAG };
})();
