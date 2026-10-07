<div align="center">

# Auto-Minesweeper

**Minesweeper in the browser with a probability-based AI that plays for you.**

[![Play Now](https://img.shields.io/badge/▶_Play_Now-GitHub_Pages-4a6fa5?style=for-the-badge)](https://mrdadado.github.io/Auto-Minesweeper/)

**Play online: https://mrdadado.github.io/Auto-Minesweeper/**

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](LICENSE)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
![Vanilla JS](https://img.shields.io/badge/vanilla-JavaScript-f7df1e.svg?logo=javascript&logoColor=black)
[![GitHub stars](https://img.shields.io/github/stars/MrDaDaDo/Auto-Minesweeper?style=social)](https://github.com/MrDaDaDo/Auto-Minesweeper/stargazers)

<img src="assets/demo.gif" alt="The AI solving an Intermediate board with mine probabilities shown" width="400">

<sub>The AI winning an Intermediate game, with the mine probability (%) of every covered cell shown</sub>

</div>

A dependency-free browser version of **Minesweeper** with a built-in **AI solver** that can play the game for you, suggest your next move, or show the exact chance that each covered cell hides a mine. Just open the page and hit **AI Autoplay**.

> If you find this project fun or useful, please consider giving it a ⭐ — it really helps!

## Features

- **Classic Minesweeper gameplay**: Beginner, Intermediate, Expert and custom boards; the first click is always safe and opens an area
- **Mouse and touch controls**: left click to open, right click to flag, click a satisfied number to open its neighbors (chording); long press or **Flag mode** on mobile; **F2** for a new game
- **AI Autoplay**: lets the AI play continuously
- **Hint**: highlights the AI's suggested next cell and tells you whether it is certain or a guess
- **Mine probabilities**: overlays the exact mine probability (%) on every covered cell
- **Auto restart + win-rate stats**: let the AI play game after game and track its record per board
- **Multilingual UI**: English, 繁體中文, 简体中文, 日本語, 한국어 (auto-detected from the browser, selection remembered)
- **Best times** and AI stats saved in `localStorage`

## Getting Started

No build step or dependencies are required.

1. Clone the repository:
   ```bash
   git clone https://github.com/MrDaDaDo/Auto-Minesweeper.git
   ```
2. Open `index.html` in a modern browser.

## How the AI Works

Every opened number is a constraint: *the covered cells around it contain exactly (number − flags) mines.* The solver works in three stages:

1. **Simple logic**: if a number's remaining mines is 0, all its covered neighbors are safe; if it equals the number of covered neighbors, they are all mines. This repeats until nothing changes.
2. **Exact probabilities**: the remaining frontier cells are split into independent groups that share no constraint. For each group, a backtracking search enumerates every valid mine layout, counting solutions by how many mines they use.
3. **Global mine count**: the groups are combined by convolution, and each total is weighted by the number of ways to place the leftover mines in the unconstrained interior cells, `C(interior, minesLeft − K)` (computed in log space). This gives the exact probability for every covered cell, frontier and interior alike.

The AI flags every cell that is certainly a mine and opens every cell that is certainly safe, one action at a time. When nothing is certain, it has to guess, and a smarter guess wins more games:

4. **Lookahead guessing**: for the cells whose mine probability is at most 5% (relative) above the lowest, the solver tries every number the cell could show if it were opened, re-solves each hypothetical board, and weights it by its exact probability. It picks the cell with the best combination of *being safe* and *being safe and then leading to a certain move*, instead of blindly taking the lowest probability. Because the margin is relative, it never trades a noticeably higher risk for information (e.g. at most 21% when the safest cell is 20%).

5. **Dead cells and forced 50/50s**: a cell that can only ever show one number gives no information, so it is avoided when there is another choice. A pair of cells that holds exactly one mine and can never be told apart by any future move must be guessed eventually, so the AI guesses it right away and uses the revealed number to help elsewhere.

If a group is too large to enumerate exactly, it falls back to a local approximation, and approximate values are never treated as certain.

<img src="assets/screenshot.png" alt="An Expert board mid-game with mine probabilities shown" width="720">

### Win rates

Measured over simulated games with the same rules as the page (first click opens a safe 3×3 area):

| Board | Size | Mines | Games | AI win rate |
| --- | --- | --- | --- | --- |
| Beginner | 9×9 | 10 | 10,000 | 96.3% |
| Intermediate | 16×16 | 40 | 3,000 | 88.1% |
| Expert | 30×16 | 99 | 8,000 | 52.2% |

On the same Expert boards, lookahead guessing wins about 2–3 percentage points more often than always picking the lowest-probability cell. About 45% of Expert losses happen on a guess where every remaining option is at least 50% likely to be a mine, which no strategy can avoid. Losses come from positions where no cell is provably safe and the AI has to guess.

## Project Structure

```
index.html   Page layout and styles
game.js      Game logic, rendering, input and AI controls
solver.js    Logic + exact-probability Minesweeper solver
i18n.js      Translations and language switching
```

## License

Released into the public domain under [The Unlicense](LICENSE).
