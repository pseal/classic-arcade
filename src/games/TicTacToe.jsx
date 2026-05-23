import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './TicTacToe.module.css'

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a, b, c] }
  }
  if (board.every(Boolean)) return { winner: 'D', line: [] }
  return null
}

function minimax(board, depth, isMax, alpha, beta) {
  const r = checkWinner(board)
  if (r) {
    if (r.winner === 'O') return 10 - depth
    if (r.winner === 'X') return depth - 10
    return 0
  }
  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O'
        best = Math.max(best, minimax(board, depth + 1, false, alpha, beta))
        board[i] = null
        alpha = Math.max(alpha, best)
        if (beta <= alpha) break
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X'
        best = Math.min(best, minimax(board, depth + 1, true, alpha, beta))
        board[i] = null
        beta = Math.min(beta, best)
        if (beta <= alpha) break
      }
    }
    return best
  }
}

function getCpuMove(board, diff) {
  const empty = board.map((v, i) => (v ? null : i)).filter(i => i !== null)
  if (!empty.length) return null
  if (diff === 'easy') return empty[Math.floor(Math.random() * empty.length)]
  if (diff === 'medium' && Math.random() < 0.4)
    return empty[Math.floor(Math.random() * empty.length)]
  let best = -Infinity, move = empty[0]
  for (const i of empty) {
    board[i] = 'O'
    const s = minimax(board, 0, false, -Infinity, Infinity)
    board[i] = null
    if (s > best) { best = s; move = i }
  }
  return move
}

export default function TicTacToe({ diff }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState([])
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 })

  const handleClick = (i) => {
    if (board[i] || winner || !isPlayerTurn) return
    const nb = [...board]
    nb[i] = 'X'
    setBoard(nb)
    setIsPlayerTurn(false)
    const res = checkWinner(nb)
    if (res) {
      setWinner(res.winner)
      setWinLine(res.line)
      setScores(s => ({ ...s, [res.winner]: s[res.winner] + 1 }))
      return
    }
    setTimeout(() => {
      const move = getCpuMove([...nb], diff)
      if (move === null) return
      const nb2 = [...nb]
      nb2[move] = 'O'
      setBoard(nb2)
      setIsPlayerTurn(true)
      const res2 = checkWinner(nb2)
      if (res2) {
        setWinner(res2.winner)
        setWinLine(res2.line)
        setScores(s => ({ ...s, [res2.winner]: s[res2.winner] + 1 }))
      }
    }, 400)
  }

  const reset = () => {
    setBoard(Array(9).fill(null))
    setIsPlayerTurn(true)
    setWinner(null)
    setWinLine([])
  }

  const statusMsg = winner
    ? (winner === 'D' ? 'Draw! 🤝' : winner === 'X' ? 'You win! 🎉' : 'CPU wins! 🤖')
    : (isPlayerTurn ? 'Your turn (✕)' : 'CPU thinking... 🤖')

  const statusColor = winner
    ? (winner === 'X' ? '#6c63ff' : winner === 'O' ? '#f59e0b' : '#888')
    : undefined

  return (
    <div className={styles.container}>
      <div className={styles.scores}>
        {[['You (X)', scores.X, '#6c63ff'], ['Draws', scores.D, '#888'], ['CPU (O)', scores.O, '#f59e0b']].map(([l, v, c]) => (
          <div key={l} className={styles.scoreItem}>
            <span className={styles.scoreVal} style={{ color: c }}>{v}</span>
            <span className={styles.scoreLabel}>{l}</span>
          </div>
        ))}
      </div>

      <StatusBar color={statusColor}>{statusMsg}</StatusBar>

      <div className={styles.grid}>
        {board.map((v, i) => (
          <button
            key={i}
            className={[
              styles.cell,
              v === 'X' ? styles.cellX : v === 'O' ? styles.cellO : '',
              winLine.includes(i) ? styles.cellWin : '',
            ].join(' ')}
            onClick={() => handleClick(i)}
            disabled={!!winner || !isPlayerTurn || !!v}
          >
            {v}
          </button>
        ))}
      </div>

      <button className={styles.resetBtn} onClick={reset}>New Game</button>
    </div>
  )
}
