import { useState, useEffect, useCallback } from 'react'
import styles from './ChineseCheckers.module.css'

// ── Board: 121 holes in a Star of David pattern ──────────────────────────
// We'll use a hex grid. Each cell: { id, row, col, zone }
// Zones: 'center' | color name for the 6 triangle points

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
const COLOR_HEX = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', orange: '#f97316',
  empty: 'rgba(255,255,255,0.08)', highlight: '#fff',
}

// Generate the 121 holes of a Chinese Checkers board
// Using axial coordinates (q, r) for a hex grid
function generateBoard() {
  const holes = []
  let id = 0

  // The board is a hexagon of radius 4 plus 6 triangular points
  // We'll use offset coordinates mapped to screen positions

  // Main hexagon: rows -4 to 4
  // Plus triangular extensions at each of 6 tips

  const cells = new Map()

  const add = (q, r, zone = 'center') => {
    const key = `${q},${r}`
    if (!cells.has(key)) {
      cells.set(key, { id: id++, q, r, zone, piece: null })
    }
  }

  // Center hexagon (radius 4)
  for (let q = -4; q <= 4; q++) {
    for (let r = -4; r <= 4; r++) {
      const s = -q - r
      if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) {
        add(q, r, 'center')
      }
    }
  }

  // 6 triangle tips (each has 6 holes in a triangle of side 3)
  // Top tip (red home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(-i + j, -4 - (3 - i), 'red')
    }
  }
  // Bottom tip (blue home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(i - j, 4 + (3 - i), 'blue')
    }
  }
  // Top-right tip (green home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(4 + (3 - i), -i + j, 'green')
    }
  }
  // Bottom-left tip (yellow home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(-4 - (3 - i), i - j, 'yellow')
    }
  }
  // Top-left tip (purple home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(-4 - (3 - i) + j, -j, 'purple')
    }
  }
  // Bottom-right tip (orange home)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      add(4 + (3 - i) - j, j, 'orange')
    }
  }

  return Array.from(cells.values())
}

// Hex to pixel (flat-top)
const HEX_SIZE = 18
function hexToPixel(q, r) {
  const x = HEX_SIZE * (3 / 2 * q)
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r)
  return { x, y }
}

// 6 hex directions
const HEX_DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]

function getNeighbors(q, r, cellMap) {
  return HEX_DIRS.map(([dq, dr]) => cellMap.get(`${q+dq},${r+dr}`)).filter(Boolean)
}

function getJumps(cell, cellMap, visited = new Set()) {
  const jumps = []
  visited.add(`${cell.q},${cell.r}`)
  for (const [dq, dr] of HEX_DIRS) {
    const mid = cellMap.get(`${cell.q+dq},${cell.r+dr}`)
    if (!mid || !mid.piece) continue
    const land = cellMap.get(`${cell.q+dq*2},${cell.r+dr*2}`)
    if (!land || land.piece) continue
    if (visited.has(`${land.q},${land.r}`)) continue
    jumps.push(land)
    // Chain jumps
    const chain = getJumps(land, cellMap, new Set(visited))
    jumps.push(...chain)
  }
  return jumps
}

function getMoves(cell, cellMap) {
  if (!cell.piece) return []
  const moves = []
  // Step moves
  for (const neighbor of getNeighbors(cell.q, cell.r, cellMap)) {
    if (!neighbor.piece) moves.push(neighbor)
  }
  // Jump moves
  moves.push(...getJumps(cell, cellMap))
  // Deduplicate
  const seen = new Set()
  return moves.filter(m => {
    const k = `${m.q},${m.r}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}

// Check if a color has won (all 10 pieces in opposite triangle)
const OPPOSITE = { red: 'blue', blue: 'red', green: 'yellow', yellow: 'green', purple: 'orange', orange: 'purple' }

function hasWon(color, cells) {
  const target = OPPOSITE[color]
  const targetCells = cells.filter(c => c.zone === target)
  return targetCells.every(c => c.piece === color)
}

// CPU: pick best move using simple heuristic
function cpuMove(color, cells, cellMap, difficulty) {
  const myPieces = cells.filter(c => c.piece === color)
  const targetZone = OPPOSITE[color]
  const targetCells = cells.filter(c => c.zone === targetZone)

  // Score a cell: closer to target center = better
  const targetCenter = targetCells.reduce((acc, c) => ({ q: acc.q + c.q / targetCells.length, r: acc.r + c.r / targetCells.length }), { q: 0, r: 0 })

  const dist = (cell) => Math.abs(cell.q - targetCenter.q) + Math.abs(cell.r - targetCenter.r)

  let bestScore = -Infinity
  let bestFrom = null, bestTo = null

  for (const piece of myPieces) {
    const moves = getMoves(piece, cellMap)
    for (const move of moves) {
      let score = dist(piece) - dist(move) // positive = moving closer
      // Bonus for landing in target zone
      if (move.zone === targetZone) score += 5
      // Bonus for jumps (faster)
      const isJump = Math.abs(move.q - piece.q) > 1 || Math.abs(move.r - piece.r) > 1
      if (isJump) score += 2

      if (difficulty === 'easy') score += (Math.random() - 0.5) * 6
      else if (difficulty === 'medium') score += (Math.random() - 0.5) * 2

      if (score > bestScore) { bestScore = score; bestFrom = piece; bestTo = move }
    }
  }
  return { from: bestFrom, to: bestTo }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ChineseCheckers({ diff = 'medium' }) {
  const [cells, setCells]       = useState(() => {
    const board = generateBoard()
    // Place pieces: player = red (top), CPU = blue (bottom)
    return board.map(c => ({
      ...c,
      piece: c.zone === 'red' ? 'red' : c.zone === 'blue' ? 'blue' : null
    }))
  })
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [turn, setTurn]         = useState('red')
  const [status, setStatus]     = useState('Your turn — move a red piece')
  const [winner, setWinner]     = useState(null)
  const [moveCount, setMoveCount] = useState(0)

  const cellMap = useCallback(() => {
    const map = new Map()
    cells.forEach(c => map.set(`${c.q},${c.r}`, c))
    return map
  }, [cells])

  // CPU turn
  useEffect(() => {
    if (turn !== 'blue' || winner) return
    const timer = setTimeout(() => {
      const map = cellMap()
      const { from, to } = cpuMove('blue', cells, map, diff)
      if (!from || !to) { setTurn('red'); setStatus('Your turn — move a red piece'); return }

      setCells(prev => prev.map(c => {
        if (c.q === from.q && c.r === from.r) return { ...c, piece: null }
        if (c.q === to.q && c.r === to.r) return { ...c, piece: 'blue' }
        return c
      }))
      setMoveCount(m => m + 1)

      // Check win
      const newCells = cells.map(c => {
        if (c.q === from.q && c.r === from.r) return { ...c, piece: null }
        if (c.q === to.q && c.r === to.r) return { ...c, piece: 'blue' }
        return c
      })
      if (hasWon('blue', newCells)) { setWinner('blue'); setStatus('CPU wins! 🤖'); return }
      setTurn('red')
      setStatus('Your turn — move a red piece')
    }, diff === 'easy' ? 1200 : 700)
    return () => clearTimeout(timer)
  }, [turn, winner, cells, diff, cellMap])

  const handleClick = (cell) => {
    if (winner || turn !== 'red') return
    const map = cellMap()

    if (selected) {
      // Try to move
      const isValid = validMoves.some(m => m.q === cell.q && m.r === cell.r)
      if (isValid) {
        const from = selected
        setCells(prev => prev.map(c => {
          if (c.q === from.q && c.r === from.r) return { ...c, piece: null }
          if (c.q === cell.q && c.r === cell.r) return { ...c, piece: 'red' }
          return c
        }))
        setSelected(null); setValidMoves([])
        setMoveCount(m => m + 1)

        const newCells = cells.map(c => {
          if (c.q === from.q && c.r === from.r) return { ...c, piece: null }
          if (c.q === cell.q && c.r === cell.r) return { ...c, piece: 'red' }
          return c
        })
        if (hasWon('red', newCells)) { setWinner('red'); setStatus('You win! 🎉'); return }
        setTurn('blue'); setStatus('CPU thinking... 🤖')
        return
      }
      // Reselect
      if (cell.piece === 'red') {
        setSelected(cell)
        setValidMoves(getMoves(cell, map))
        return
      }
      setSelected(null); setValidMoves([])
      return
    }

    if (cell.piece === 'red') {
      setSelected(cell)
      setValidMoves(getMoves(cell, map))
    }
  }

  const reset = () => {
    setCells(generateBoard().map(c => ({
      ...c,
      piece: c.zone === 'red' ? 'red' : c.zone === 'blue' ? 'blue' : null
    })))
    setSelected(null); setValidMoves([]); setTurn('red')
    setStatus('Your turn — move a red piece')
    setWinner(null); setMoveCount(0)
  }

  // Compute board bounds for SVG viewBox
  const positions = cells.map(c => hexToPixel(c.q, c.r))
  const minX = Math.min(...positions.map(p => p.x)) - HEX_SIZE
  const maxX = Math.max(...positions.map(p => p.x)) + HEX_SIZE
  const minY = Math.min(...positions.map(p => p.y)) - HEX_SIZE
  const maxY = Math.max(...positions.map(p => p.y)) + HEX_SIZE
  const W = maxX - minX, H = maxY - minY

  return (
    <div className={styles.container}>
      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statN} style={{ color: '#ef4444' }}>🔴</span>
          <span className={styles.statL}>You (Red)</span>
        </div>
        <div className={styles.statMsg}>{status}</div>
        <div className={styles.stat}>
          <span className={styles.statN} style={{ color: '#3b82f6' }}>🔵</span>
          <span className={styles.statL}>CPU (Blue)</span>
        </div>
      </div>

      <div className={styles.moveCount}>Move {moveCount}</div>

      {/* Board */}
      <div className={styles.boardWrap}>
        <svg
          viewBox={`${minX} ${minY} ${W} ${H}`}
          width={Math.min(W, 560)}
          height={Math.min(H, 560) * (H / W)}
          className={styles.svg}
        >
          {cells.map(cell => {
            const { x, y } = hexToPixel(cell.q, cell.r)
            const isSelected = selected?.q === cell.q && selected?.r === cell.r
            const isValid    = validMoves.some(m => m.q === cell.q && m.r === cell.r)
            const R = HEX_SIZE * 0.42

            // Hole color
            let holeFill = 'rgba(255,255,255,0.06)'
            if (cell.zone !== 'center') holeFill = `${COLOR_HEX[cell.zone]}22`
            if (isValid) holeFill = 'rgba(255,255,255,0.2)'

            return (
              <g key={cell.id} onClick={() => handleClick(cell)} style={{ cursor: cell.piece === 'red' || isValid ? 'pointer' : 'default' }}>
                {/* Hole */}
                <circle
                  cx={x} cy={y} r={R}
                  fill={holeFill}
                  stroke={isValid ? '#fff' : isSelected ? COLOR_HEX.red : cell.zone !== 'center' ? COLOR_HEX[cell.zone] : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isValid || isSelected ? 1.5 : 0.5}
                />
                {/* Valid move dot */}
                {isValid && !cell.piece && (
                  <circle cx={x} cy={y} r={R * 0.35} fill="rgba(255,255,255,0.5)" />
                )}
                {/* Piece */}
                {cell.piece && (
                  <>
                    <circle
                      cx={x} cy={y} r={R * 0.78}
                      fill={COLOR_HEX[cell.piece]}
                      stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.4)'}
                      strokeWidth={isSelected ? 2 : 1}
                      filter={isSelected ? 'url(#glow)' : undefined}
                    />
                    {/* Shine */}
                    <circle cx={x - R*0.22} cy={y - R*0.22} r={R*0.22} fill="rgba(255,255,255,0.35)" />
                  </>
                )}
              </g>
            )
          })}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: '#ef4444' }} /> Your pieces — move to blue triangle</div>
        <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: '#3b82f6' }} /> CPU pieces — moving to red triangle</div>
      </div>

      <button className={styles.resetBtn} onClick={reset}>New Game</button>

      {/* Win overlay */}
      {winner && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>{winner === 'red' ? '🎉' : '🤖'}</div>
            <h2 style={{ color: winner === 'red' ? '#ef4444' : '#3b82f6' }}>
              {winner === 'red' ? 'You Win!' : 'CPU Wins!'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Completed in {moveCount} moves</p>
            <button className={styles.resetBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}
