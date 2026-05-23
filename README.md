# 🎮 Classic Arcade

A full React + Vite multi-game arcade with 6 games, CPU opponents, and 3 difficulty levels.

## Games
| Game | AI Type |
|------|---------|
| Tic-Tac-Toe | Minimax with alpha-beta pruning |
| Chess | Minimax (depth 1–3 by difficulty) |
| Connect Four | Minimax with scoring heuristics |
| Snakes & Ladders | Dice-based (no AI needed) |
| Ludo | Smart token selection |
| Memory Match | No CPU — solo game |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
```

Then open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder — upload that folder to any static host (Netlify, Vercel, GitHub Pages, etc).

### Preview Production Build Locally

```bash
npm run preview
```

## Project Structure

```
classic-arcade/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx          # React entry point
    ├── App.jsx           # Root component
    ├── index.css         # Global styles
    ├── games.js          # Game registry (add new games here)
    ├── components/
    │   ├── HomeScreen.jsx/module.css
    │   ├── GameModal.jsx/module.css
    │   ├── DiffSelector.jsx/module.css
    │   └── StatusBar.jsx/module.css
    └── games/
        ├── TicTacToe.jsx/module.css
        ├── Chess.jsx/module.css
        ├── ConnectFour.jsx/module.css
        ├── SnakesLadders.jsx/module.css
        ├── Ludo.jsx/module.css
        └── MemoryMatch.jsx/module.css
```

## Adding a New Game

1. Create `src/games/YourGame.jsx` and `YourGame.module.css`
2. Add an entry to `src/games.js`
3. Import and add it to the `GAME_MAP` in `src/components/GameModal.jsx`
