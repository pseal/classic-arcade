import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './ConnectFour.module.css'

const ROWS = 6, COLS = 7

const empty = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null))

function checkWin(board, player) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        let count = 0
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k
          if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === player) count++
          else break
        }
        if (count === 4) return true
      }
    }
  }
  return false
}

function drop(board, col, player) {
  const nb = board.map(r => [...r])
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!nb[r][col]) { nb[r][col] = player; return nb }
  }
  return null
}

function validCols(board) {
  return Array.from({ length: COLS }, (_, c) => c).filter(c => !board[0][c])
}

function scoreWindow(window, player, opp) {
  const mine = window.filter(x => x === player).length
  const theirs = window.filter(x => x === opp).length
  if (theirs > 0 && mine > 0) return 0
  if (!theirs) return mine === 4 ? 100 : mine === 3 ? 5 : mine === 2 ? 2 : 0
  return -(theirs === 4 ? 100 : theirs === 3 ? 8 : theirs === 2 ? 2 : 0)
}

function evalBoard(board, player) {
  const opp = player === 'P' ? 'CPU' : 'P'
  let score = 0
  for (let r = 0; r < ROWS; r++) score += scoreWindow(board[r], player, opp)
  for (let c = 0; c < COLS; c++) score += scoreWindow(board.map(r => r[c]), player, opp)
  for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++) {
    score += scoreWindow([[0,0],[1,1],[2,2],[3,3]].map(([dr,dc]) => board[r+dr]?.[c+dc]), player, opp)
    score += scoreWindow([[3,0],[2,1],[1,2],[0,3]].map(([dr,dc]) => board[r+dr]?.[c+dc]), player, opp)
  }
  return score
}

function minimax(board, depth, isMax, alpha, beta) {
  const vc = validCols(board)
  if (checkWin(board, 'CPU')) return 10000
  if (checkWin(board, 'P'))   return -10000
  if (!vc.length || depth === 0) return evalBoard(board, 'CPU')
  if (isMax) {
    let best = -Infinity
    for (const c of vc) {
      const nb = drop(board, c, 'CPU')
      if (nb) { const s = minimax(nb, depth-1, false, alpha, beta); best = Math.max(best, s); alpha = Math.max(alpha, best); if (beta <= alpha) break }
    }
    return best
  } else {
    let best = Infinity
    for (const c of vc) {
      const nb = drop(board, c, 'P')
      if (nb) { const s = minimax(nb, depth-1, true, alpha, beta); best = Math.min(best, s); beta = Math.min(beta, best); if (beta <= alpha) break }
    }
    return best
  }
}

export default function ConnectFour({ diff }) {
  const [board, setBoard] = useState(empty)
  const [turn, setTurn]   = useState('P')
  const [winner, setWinner] = useState(null)
  const [scores, setScores] = useState({ P: 0, CPU: 0, D: 0 })
  const [hover, setHover]   = useState(null)

  const cpuTurn = (b) => {
    const vc = validCols(b)
    if (!vc.length) return
    let col
    if (diff === 'easy') {
      col = vc[Math.floor(Math.random() * vc.length)]
    } else {
      const depth = diff === 'medium' ? 3 : 5
      let best = -Infinity
      for (const c of vc) {
        const nb = drop(b, c, 'CPU')
        if (nb) { const s = minimax(nb, depth, false, -Infinity, Infinity); if (s > best) { best = s; col = c } }
      }
    }
    const nb = drop(b, col, 'CPU')
    if (!nb) return
    setBoard(nb)
    setTurn('P')
    if (checkWin(nb, 'CPU')) { setWinner('CPU'); setScores(s => ({ ...s, CPU: s.CPU + 1 })) }
    else if (!validCols(nb).length) { setWinner('D'); setScores(s => ({ ...s, D: s.D + 1 })) }
  }

  const handleDrop = (col) => {
    if (turn !== 'P' || winner) return
    const nb = drop(board, col, 'P')
    if (!nb) return
    setBoard(nb)
    if (checkWin(nb, 'P')) { setWinner('P'); setScores(s => ({ ...s, P: s.P + 1 })); return }
    if (!validCols(nb).length) { setWinner('D'); setScores(s => ({ ...s, D: s.D + 1 })); return }
    setTurn('CPU')
    setTimeout(() => cpuTurn(nb), 500)
  }

  const reset = () => { setBoard(empty()); setTurn('P'); setWinner(null) }

  const statusMsg = winner
    ? (winner === 'D' ? 'Draw! 🤝' : winner === 'P' ? 'You win! 🎉' : 'CPU wins! 🤖')
    : (turn === 'P' ? 'Your turn — click a column' : 'CPU thinking... 🤖')

  return (
    <div className={styles.container}>
      <div className={styles.scores}>
        {[['You', scores.P, '#3b82f6'], ['Draws', scores.D, '#888'], ['CPU', scores.CPU, '#ef4444']].map(([l,v,c]) => (
          <div key={l} className={styles.scoreItem}>
            <span style={{ color: c, fontSize: 24, fontWeight: 900 }}>{v}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{l}</span>
          </div>
        ))}
      </div>

      <StatusBar>{statusMsg}</StatusBar>

      <div className={styles.board}>
        {/* Column hover arrows */}
        <div className={styles.arrows}>
          {Array(COLS).fill(0).map((_, c) => (
            <div key={c} className={styles.arrow}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHover(c)}
              onMouseLeave={() => setHover(null)}>
              {hover === c && turn === 'P' && !winner && (
                <div className={styles.arrowDisk} />
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        {board.map((row, r) => (
          <div key={r} className={styles.row}>
            {row.map((cell, c) => (
              <div key={c} className={styles.cell}
                onClick={() => handleDrop(c)}
                style={{
                  background: cell === 'P' ? '#3b82f6' : cell === 'CPU' ? '#ef4444' : 'rgba(0,0,20,0.5)',
                  boxShadow: cell ? 'inset 0 -3px 6px rgba(0,0,0,0.4)' : 'inset 0 3px 6px rgba(0,0,0,0.4)',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <button className={styles.resetBtn} onClick={reset}>New Game</button>
    </div>
  )
}
