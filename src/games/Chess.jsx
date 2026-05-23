import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './Chess.module.css'

const UNICODE = {
  wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
  bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
}

const INIT_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
]

const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

function getMoves(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const [color, type] = [piece[0], piece[1]]
  const moves = []

  const add = (nr, nc) => {
    if (!inB(nr, nc)) return false
    const t = board[nr][nc]
    if (t && t[0] === color) return false
    moves.push([nr, nc])
    return !t
  }
  const addCapOnly = (nr, nc) => {
    if (inB(nr, nc) && board[nr][nc] && board[nr][nc][0] !== color) moves.push([nr, nc])
  }

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1
    const startRow = color === 'w' ? 6 : 1
    if (inB(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c])
      if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c])
    }
    addCapOnly(r + dir, c - 1)
    addCapOnly(r + dir, c + 1)
  }
  if (type === 'N') {
    for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) add(r+dr, c+dc)
  }
  if (type === 'K') {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r+dr, c+dc)
  }
  if (type === 'R' || type === 'Q') {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let nr = r + dr, nc = c + dc
      while (add(nr, nc)) { nr += dr; nc += dc }
    }
  }
  if (type === 'B' || type === 'Q') {
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      let nr = r + dr, nc = c + dc
      while (add(nr, nc)) { nr += dr; nc += dc }
    }
  }
  return moves
}

function applyMove(board, fr, fc, tr, tc) {
  const nb = board.map(r => [...r])
  nb[tr][tc] = nb[fr][fc]
  nb[fr][fc] = null
  if (nb[tr][tc] === 'wP' && tr === 0) nb[tr][tc] = 'wQ'
  if (nb[tr][tc] === 'bP' && tr === 7) nb[tr][tc] = 'bQ'
  return nb
}

function allMoves(board, color) {
  const moves = []
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.[0] === color) {
      getMoves(board, r, c).forEach(([tr, tc]) => moves.push({ fr: r, fc: c, tr, tc }))
    }
  }
  return moves
}

function evalBoard(board) {
  const vals = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 }
  let score = 0
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c]
    if (p) score += (p[0] === 'b' ? 1 : -1) * (vals[p[1]] || 0)
  }
  return score
}

function minimax(board, depth, isMax, alpha, beta) {
  const flat = board.flat()
  if (!flat.includes('bK')) return -1000
  if (!flat.includes('wK')) return 1000
  const moves = allMoves(board, isMax ? 'b' : 'w')
  if (!moves.length || depth === 0) return evalBoard(board)
  if (isMax) {
    let best = -Infinity
    for (const { fr, fc, tr, tc } of moves) {
      const s = minimax(applyMove(board, fr, fc, tr, tc), depth - 1, false, alpha, beta)
      best = Math.max(best, s); alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const { fr, fc, tr, tc } of moves) {
      const s = minimax(applyMove(board, fr, fc, tr, tc), depth - 1, true, alpha, beta)
      best = Math.min(best, s); beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

export default function Chess({ diff }) {
  const [board, setBoard] = useState(() => INIT_BOARD.map(r => [...r]))
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [turn, setTurn] = useState('w')
  const [status, setStatus] = useState('Your turn — play White')
  const [gameOver, setGameOver] = useState(false)

  const cpuGo = (b) => {
    const moves = allMoves(b, 'b')
    if (!moves.length) { setStatus('Checkmate — you win! ♟'); setGameOver(true); return }
    let chosen
    if (diff === 'easy') {
      chosen = moves[Math.floor(Math.random() * moves.length)]
    } else {
      const depth = diff === 'medium' ? 2 : 3
      let best = -Infinity
      for (const m of moves) {
        const s = minimax(applyMove(b, m.fr, m.fc, m.tr, m.tc), depth, false, -Infinity, Infinity)
        if (s > best) { best = s; chosen = m }
      }
    }
    const nb = applyMove(b, chosen.fr, chosen.fc, chosen.tr, chosen.tc)
    setBoard(nb)
    setTurn('w')
    if (!nb.flat().includes('wK')) { setStatus('CPU wins! 🤖'); setGameOver(true) }
    else setStatus('Your turn — play White')
  }

  const handleSquare = (r, c) => {
    if (turn !== 'w' || gameOver) return
    const piece = board[r][c]
    if (selected) {
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
      if (isValid) {
        const nb = applyMove(board, selected[0], selected[1], r, c)
        setBoard(nb); setSelected(null); setValidMoves([])
        if (!nb.flat().includes('bK')) { setStatus('You win! ♟'); setGameOver(true); return }
        setTurn('b'); setStatus('CPU thinking...')
        setTimeout(() => cpuGo(nb), 600)
      } else if (piece?.[0] === 'w') {
        setSelected([r, c]); setValidMoves(getMoves(board, r, c))
      } else {
        setSelected(null); setValidMoves([])
      }
    } else if (piece?.[0] === 'w') {
      setSelected([r, c]); setValidMoves(getMoves(board, r, c))
    }
  }

  const reset = () => {
    setBoard(INIT_BOARD.map(r => [...r]))
    setSelected(null); setValidMoves([]); setTurn('w')
    setStatus('Your turn — play White'); setGameOver(false)
  }

  return (
    <div className={styles.container}>
      <StatusBar>{status}</StatusBar>
      <div className={styles.scrollWrap}>
        <div className={styles.board}>
          {board.map((row, r) => (
            <div key={r} className={styles.boardRow}>
              {row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0
                const isSel = selected?.[0] === r && selected?.[1] === c
                const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
                const isCapture = isValid && !!piece
                return (
                  <div
                    key={c}
                    className={[
                      styles.square,
                      isLight ? styles.light : styles.dark,
                      isSel ? styles.selected : '',
                      isValid && !isCapture ? styles.validMove : '',
                      isCapture ? styles.validCapture : '',
                    ].join(' ')}
                    onClick={() => handleSquare(r, c)}
                  >
                    {piece && (
                      <span className={styles.piece} style={{ filter: piece[0] === 'w' ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' : 'none' }}>
                        {UNICODE[piece]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <button className={styles.resetBtn} onClick={reset}>New Game</button>
      <p className={styles.hint}>Click a white piece, then click a highlighted square to move. Pawns auto-promote to Queens.</p>
    </div>
  )
}
