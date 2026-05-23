import { useState, useEffect, useCallback } from 'react'
import styles from './Ludo.module.css'

// ─── BOARD CONSTANTS ───────────────────────────────────────────────────────
const COLORS = ['green', 'yellow', 'red', 'blue']

const COLOR_META = {
  green:  { label: 'Green',  hex: '#22c55e', homeRow: 13, homeCol: 1,  startCell: 1,   entryCell: 0  },
  yellow: { label: 'Yellow', hex: '#eab308', homeRow: 1,  homeCol: 13, startCell: 14,  entryCell: 13 },
  red:    { label: 'Red',    hex: '#ef4444', homeRow: 13, homeCol: 13, startCell: 27,  entryCell: 26 },
  blue:   { label: 'Blue',   hex: '#3b82f6', homeRow: 1,  homeCol: 1,  startCell: 40,  entryCell: 39 },
}

// The main path: 52 cells indexed 0–51, each is [row, col] on the 15x15 grid
// Grid cells: 0-indexed, 15 rows × 15 cols
const MAIN_PATH = [
  // Green start → clockwise
  [6,1],[6,2],[6,3],[6,4],[6,5],           // 0-4  (green entry at 0)
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],     // 5-10
  [0,7],                                    // 11
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],     // 12-17
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],// 18-23
  [7,14],                                   // 24
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],// 25-30
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],// 31-36
  [14,7],                                   // 37
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],// 38-43
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],     // 44-49
  [7,0],                                    // 50
  [6,0],                                    // 51 → back to 0
]

// Home stretch paths (6 cells each, not on main path)
const HOME_PATHS = {
  green:  [[6,1],[6,2],[6,3],[6,4],[6,5],[6,6]].map((_,i)=>[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]][i]),
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  red:    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
}

// Entry cell index on main path for each color
const ENTRY = { green: 0, yellow: 13, red: 26, blue: 39 }
// Home stretch start index offset (which main path index leads into home stretch)
const HOME_ENTRY = { green: 51, yellow: 12, red: 25, blue: 38 }

// Safe cells (star positions) on main path indices
const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47])

// Home base token positions [row,col] for each color (4 slots)
const HOME_BASE = {
  green:  [[2,2],[2,4],[4,2],[4,4]],
  yellow: [[2,10],[2,12],[4,10],[4,12]],
  red:    [[10,10],[10,12],[12,10],[12,12]],
  blue:   [[10,2],[10,4],[12,2],[12,4]],
}

// Center finish position
const CENTER_POS = [7, 7]

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

// ─── HELPERS ───────────────────────────────────────────────────────────────
function initTokens() {
  // Each token: { pos: -1 = home base, 0–51 = main path, 100+n = home stretch n, 999 = finished }
  return { green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], red: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] }
}

function getTokenGridPos(color, tokenIdx, tokens) {
  const pos = tokens[color][tokenIdx]
  if (pos === 999) return CENTER_POS
  if (pos === -1)  return HOME_BASE[color][tokenIdx]
  if (pos >= 100)  return HOME_PATHS[color][pos - 100]
  return MAIN_PATH[pos % 52]
}

function canMove(color, tokenIdx, tokens, roll) {
  const pos = tokens[color][tokenIdx]
  if (pos === 999) return false
  if (pos === -1)  return roll === 6
  if (pos >= 100) {
    const stretch = pos - 100
    return stretch + roll <= 5
  }
  // On main path — check if would overshoot home stretch
  const entry = HOME_ENTRY[color]
  const distToEntry = (entry - pos + 52) % 52
  if (distToEntry < roll) {
    const intoStretch = roll - distToEntry - 1
    return intoStretch <= 5
  }
  return true
}

function moveToken(color, tokenIdx, tokens, roll) {
  const pos = tokens[color][tokenIdx]
  const newTokens = { ...tokens, [color]: [...tokens[color]] }
  if (pos === -1) {
    newTokens[color][tokenIdx] = ENTRY[color]
    return newTokens
  }
  if (pos >= 100) {
    const newStretch = pos - 100 + roll
    newTokens[color][tokenIdx] = newStretch === 5 ? 999 : 100 + newStretch
    return newTokens
  }
  const entry = HOME_ENTRY[color]
  const distToEntry = (entry - pos + 52) % 52
  if (roll > distToEntry) {
    const intoStretch = roll - distToEntry - 1
    newTokens[color][tokenIdx] = intoStretch === 5 ? 999 : 100 + intoStretch
  } else {
    newTokens[color][tokenIdx] = (pos + roll) % 52
  }
  return newTokens
}

function checkCapture(color, tokenIdx, tokens) {
  const pos = tokens[color][tokenIdx]
  if (pos === -1 || pos === 999 || pos >= 100) return tokens
  if (SAFE_CELLS.has(pos)) return tokens
  let newTokens = { ...tokens }
  for (const otherColor of COLORS) {
    if (otherColor === color) continue
    newTokens[otherColor] = newTokens[otherColor].map((p, i) => {
      if (p === pos && p !== -1 && p < 100) return -1
      return p
    })
  }
  return newTokens
}

function isFinished(color, tokens) {
  return tokens[color].every(p => p === 999)
}

function cpuPickMove(color, tokens, roll, difficulty) {
  const movable = tokens[color].map((_, i) => canMove(color, i, tokens, roll) ? i : null).filter(i => i !== null)
  if (!movable.length) return null
  if (difficulty === 'easy') return movable[Math.floor(Math.random() * movable.length)]

  // Score each move
  let best = -Infinity, chosen = movable[0]
  for (const i of movable) {
    const newT = moveToken(color, i, tokens, roll)
    const afterCapture = checkCapture(color, i, newT)
    let score = 0
    const pos = afterCapture[color][i]
    // Prefer finishing
    if (pos === 999) score += 100
    // Prefer entering home stretch
    else if (pos >= 100) score += 50 + (pos - 100) * 8
    // Prefer advancing
    else if (pos !== -1) score += 20
    // Penalize if on unsafe cell with enemy tokens nearby
    if (pos >= 0 && pos < 52 && !SAFE_CELLS.has(pos)) score -= 5
    // Reward captures
    const captured = COLORS.filter(c => c !== color).some(c =>
      tokens[c].some((p, ci) => p === newT[color][i] && p >= 0 && p < 52)
    )
    if (captured) score += 40
    if (difficulty === 'medium' && Math.random() < 0.25) score += Math.random() * 20 - 10
    if (score > best) { best = score; chosen = i }
  }
  return chosen
}

// ─── BOARD RENDERING HELPER ─────────────────────────────────────────────────
function buildGrid(tokens, selectedToken, playerColor, validMoves, onTokenClick) {
  // 15×15 grid cells
  const cells = Array(15).fill(null).map(() => Array(15).fill(null).map(() => ({
    type: 'empty', color: null, tokens: [], safe: false, arrow: null
  })))

  // Mark colored path cells
  const coloredCols = {
    green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
    yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
    red:    [[7,9],[7,10],[7,11],[7,12],[7,13]],
    blue:   [[9,7],[10,7],[11,7],[12,7],[13,7]],
  }
  for (const [color, cells2] of Object.entries(coloredCols)) {
    for (const [r,c] of cells2) { cells[r][c].type = 'path'; cells[r][c].color = color }
  }

  // Mark main path cells
  MAIN_PATH.forEach(([r,c], idx) => {
    if (!cells[r][c].type || cells[r][c].type === 'empty') cells[r][c].type = 'path'
    if (SAFE_CELLS.has(idx)) cells[r][c].safe = true
  })

  // Mark home bases
  for (const [color, positions] of Object.entries(HOME_BASE)) {
    for (const [r,c] of positions) { cells[r][c].type = 'homebase'; cells[r][c].color = color }
    // Color the home quadrant background
  }

  // Center
  cells[7][7].type = 'center'

  // Place tokens on grid
  for (const color of COLORS) {
    tokens[color].forEach((pos, i) => {
      const [r,c] = getTokenGridPos(color, i, tokens)
      cells[r][c].tokens.push({ color, tokenIdx: i, pos })
    })
  }

  return cells
}

// ─── COLOR PICKER ───────────────────────────────────────────────────────────
function ColorPicker({ onPick }) {
  return (
    <div className={styles.pickerWrap}>
      <div className={styles.pickerIcon}>🎯</div>
      <h2 className={styles.pickerTitle}>Choose Your Color</h2>
      <p className={styles.pickerSub}>You'll play against the CPU</p>
      <div className={styles.colorGrid}>
        {COLORS.map(c => (
          <button key={c} className={styles.colorBtn}
            style={{ background: COLOR_META[c].hex, boxShadow: `0 4px 20px ${COLOR_META[c].hex}66` }}
            onClick={() => onPick(c)}>
            <span className={styles.colorBtnLabel}>{COLOR_META[c].label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN LUDO COMPONENT ─────────────────────────────────────────────────────
export default function Ludo({ diff = 'medium' }) {
  const [playerColor, setPlayerColor] = useState(null)
  const [tokens, setTokens] = useState(initTokens)
  const [turn, setTurn] = useState(null)
  const [roll, setRoll] = useState(null)
  const [rolled, setRolled] = useState(false)
  const [status, setStatus] = useState('')
  const [winner, setWinner] = useState(null)
  const [animating, setAnimating] = useState(false)
  const [validMoves, setValidMoves] = useState([])
  const [selectedToken, setSelectedToken] = useState(null)
  const [log, setLog] = useState([])

  const cpuColors = COLORS.filter(c => c !== playerColor)

  const addLog = msg => setLog(l => [msg, ...l].slice(0, 4))

  // Start game after color pick
  const startGame = (color) => {
    setPlayerColor(color)
    setTokens(initTokens())
    setTurn(color) // player goes first
    setStatus(`Your turn! Roll the dice.`)
    setRolled(false)
    setRoll(null)
    setWinner(null)
    setLog([])
  }

  const reset = () => {
    setPlayerColor(null)
    setTokens(initTokens())
    setTurn(null)
    setRoll(null)
    setRolled(false)
    setStatus('')
    setWinner(null)
    setValidMoves([])
    setSelectedToken(null)
    setLog([])
  }

  // ── Player rolls ──
  const handleRoll = () => {
    if (rolled || winner || turn !== playerColor || animating) return
    const r = Math.floor(Math.random() * 6) + 1
    setRoll(r)
    setRolled(true)
    const movable = tokens[playerColor].map((_, i) => canMove(playerColor, i, tokens, r) ? i : null).filter(i => i !== null)
    if (!movable.length) {
      addLog(`You rolled ${r} — no moves.`)
      setStatus(`Rolled ${r} — no moves. Passing turn.`)
      setTimeout(() => nextTurn(playerColor, tokens, r === 6), 900)
    } else if (movable.length === 1) {
      // Auto move if only one option
      setStatus(`Rolled ${r} — click your token to move.`)
      setValidMoves(movable)
    } else {
      setStatus(`Rolled ${r} — pick a token to move.`)
      setValidMoves(movable)
    }
  }

  // ── Player clicks a token ──
  const handleTokenClick = (color, tokenIdx) => {
    if (color !== playerColor || turn !== playerColor || !rolled || winner) return
    if (!validMoves.includes(tokenIdx)) return
    applyPlayerMove(tokenIdx)
  }

  const applyPlayerMove = (tokenIdx) => {
    setAnimating(true)
    let newT = moveToken(playerColor, tokenIdx, tokens, roll)
    newT = checkCapture(playerColor, tokenIdx, newT)
    setTokens(newT)
    setValidMoves([])
    setRolled(false)
    addLog(`You moved Token ${tokenIdx + 1}`)

    if (isFinished(playerColor, newT)) {
      setWinner(playerColor)
      setStatus('🎉 You win!')
      setAnimating(false)
      return
    }
    const extraTurn = roll === 6
    setTimeout(() => {
      setAnimating(false)
      nextTurn(playerColor, newT, extraTurn)
    }, 400)
  }

  // ── Advance turn ──
  const nextTurn = useCallback((currentColor, currentTokens, extraTurn) => {
    if (extraTurn) {
      if (currentColor === playerColor) {
        setStatus('Rolled 6 — roll again!')
        setRolled(false)
        setRoll(null)
        return
      }
    }
    // cycle to next color
    const idx = COLORS.indexOf(currentColor)
    const nextColor = COLORS[(idx + 1) % 4]
    setTurn(nextColor)
    if (nextColor === playerColor) {
      setStatus('Your turn! Roll the dice.')
      setRolled(false)
      setRoll(null)
    }
  }, [playerColor])

  // ── CPU turn effect ──
  useEffect(() => {
    if (!turn || turn === playerColor || winner || animating) return
    const cpuColor = turn
    const delay = 900
    const timer = setTimeout(() => {
      const r = Math.floor(Math.random() * 6) + 1
      setRoll(r)
      addLog(`${COLOR_META[cpuColor].label} CPU rolled ${r}`)
      const idx = cpuPickMove(cpuColor, tokens, r, diff)
      if (idx === null) {
        addLog(`${COLOR_META[cpuColor].label}: no moves`)
        setTimeout(() => nextTurn(cpuColor, tokens, r === 6), 700)
        return
      }
      setTimeout(() => {
        setAnimating(true)
        let newT = moveToken(cpuColor, idx, tokens, r)
        newT = checkCapture(cpuColor, idx, newT)
        setTokens(newT)
        addLog(`${COLOR_META[cpuColor].label} moved Token ${idx + 1}`)
        if (isFinished(cpuColor, newT)) {
          setWinner(cpuColor)
          setStatus(`${COLOR_META[cpuColor].label} wins! 🤖`)
          setAnimating(false)
          return
        }
        setTimeout(() => {
          setAnimating(false)
          nextTurn(cpuColor, newT, r === 6)
        }, 400)
      }, 600)
    }, delay)
    return () => clearTimeout(timer)
  }, [turn, tokens, winner, animating, playerColor, diff, nextTurn])

  // ── Render ──
  if (!playerColor) return <ColorPicker onPick={startGame} />

  const grid = buildGrid(tokens, selectedToken, playerColor, validMoves, handleTokenClick)

  const isPlayerTurn = turn === playerColor

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.turnIndicators}>
          {COLORS.map(c => (
            <div key={c} className={`${styles.turnDot} ${turn === c ? styles.turnDotActive : ''}`}
              style={{ background: COLOR_META[c].hex, opacity: turn === c ? 1 : 0.3 }}>
              {c === playerColor ? '🧑' : '🤖'}
            </div>
          ))}
        </div>
        <div className={styles.statusText}>{status}</div>
      </div>

      {/* Board */}
      <div className={styles.boardWrap}>
        <div className={styles.board}>
          {Array(15).fill(0).map((_, r) => (
            <div key={r} className={styles.boardRow}>
              {Array(15).fill(0).map((_, c) => {
                const cell = grid[r][c]
                const isHomeQ = (
                  (r < 6 && c < 6 && 'green') ||
                  (r < 6 && c > 8 && 'yellow') ||
                  (r > 8 && c > 8 && 'red') ||
                  (r > 8 && c < 6 && 'blue')
                )
                const isPathCell = r >= 6 && r <= 8 || c >= 6 && c <= 8

                let bg = '#fff'
                if (isHomeQ) bg = `${COLOR_META[isHomeQ].hex}22`
                if (r < 6 && c < 6) bg = `${COLOR_META.green.hex}18`
                if (r < 6 && c > 8) bg = `${COLOR_META.yellow.hex}18`
                if (r > 8 && c > 8) bg = `${COLOR_META.red.hex}18`
                if (r > 8 && c < 6) bg = `${COLOR_META.blue.hex}18`

                // Home base inner box
                const isInnerHome = (
                  (r >= 1 && r <= 4 && c >= 1 && c <= 4) ||
                  (r >= 1 && r <= 4 && c >= 10 && c <= 13) ||
                  (r >= 10 && r <= 13 && c >= 10 && c <= 13) ||
                  (r >= 10 && r <= 13 && c >= 1 && c <= 4)
                )
                if (r >= 2 && r <= 4 && c >= 2 && c <= 4) bg = `${COLOR_META.green.hex}55`
                if (r >= 2 && r <= 4 && c >= 10 && c <= 12) bg = `${COLOR_META.yellow.hex}55`
                if (r >= 10 && r <= 12 && c >= 10 && c <= 12) bg = `${COLOR_META.red.hex}55`
                if (r >= 10 && r <= 12 && c >= 2 && c <= 4) bg = `${COLOR_META.blue.hex}55`

                // Path coloring
                const pathColors = {
                  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
                  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
                  red:    [[7,9],[7,10],[7,11],[7,12],[7,13]],
                  blue:   [[9,7],[10,7],[11,7],[12,7],[13,7]],
                }
                for (const [col, pcs] of Object.entries(pathColors)) {
                  if (pcs.some(([pr,pc]) => pr === r && pc === c)) bg = COLOR_META[col].hex
                }

                // Center
                if (r >= 6 && r <= 8 && c >= 6 && c <= 8 && !(r === 7 && c === 7)) {
                  if (r < 7 && c < 7) bg = `${COLOR_META.green.hex}cc`
                  if (r < 7 && c > 7) bg = `${COLOR_META.yellow.hex}cc`
                  if (r > 7 && c > 7) bg = `${COLOR_META.red.hex}cc`
                  if (r > 7 && c < 7) bg = `${COLOR_META.blue.hex}cc`
                }
                if (r === 7 && c === 7) bg = '#f8f8f8'

                // Check safe cell
                const isSafe = MAIN_PATH.some(([pr,pc], idx) => pr === r && pc === c && SAFE_CELLS.has(idx))
                // Check entry arrows
                const arrows = { 0: '→', 13: '↓', 26: '←', 39: '↑' }
                const mpIdx = MAIN_PATH.findIndex(([pr,pc]) => pr === r && pc === c)
                const arrowChar = arrows[mpIdx]

                const cellTokens = cell?.tokens || []

                return (
                  <div key={c} className={styles.cell} style={{ background: bg }}>
                    {isSafe && cellTokens.length === 0 && <span className={styles.star}>☆</span>}
                    {arrowChar && cellTokens.length === 0 && <span className={styles.arrow}>{arrowChar}</span>}
                    {r === 7 && c === 7 && <span className={styles.centerStar}>⭐</span>}
                    {cellTokens.map(({ color, tokenIdx, pos }) => {
                      const isValid = color === playerColor && validMoves.includes(tokenIdx)
                      const isPlayerToken = color === playerColor
                      return (
                        <div key={`${color}-${tokenIdx}`}
                          className={`${styles.token} ${isValid ? styles.tokenValid : ''} ${pos === 999 ? styles.tokenFinished : ''}`}
                          style={{
                            background: COLOR_META[color].hex,
                            border: isValid ? '2px solid #fff' : `1.5px solid rgba(0,0,0,0.3)`,
                            cursor: isValid ? 'pointer' : 'default',
                            transform: isValid ? 'scale(1.15)' : 'scale(1)',
                            zIndex: isValid ? 10 : 1,
                            boxShadow: isValid ? `0 0 8px ${COLOR_META[color].hex}` : 'none',
                          }}
                          onClick={() => handleTokenClick(color, tokenIdx)}
                          title={`${COLOR_META[color].label} T${tokenIdx+1}`}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.diceArea}>
          {roll && <span className={styles.dice}>{DICE_FACES[roll - 1]}</span>}
        </div>
        <div className={styles.btnRow}>
          {isPlayerTurn && !rolled && !winner && (
            <button className={styles.rollBtn}
              style={{ background: `linear-gradient(135deg, ${COLOR_META[playerColor].hex}, ${COLOR_META[playerColor].hex}aa)` }}
              onClick={handleRoll} disabled={animating}>
              Roll Dice 🎲
            </button>
          )}
          <button className={styles.resetBtn} onClick={reset}>Change Color</button>
        </div>
      </div>

      {/* Log */}
      <div className={styles.log}>
        {log.map((l, i) => <div key={i} className={styles.logLine}>{l}</div>)}
      </div>

      {/* Winner overlay */}
      {winner && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div style={{ fontSize: 56 }}>{winner === playerColor ? '🎉' : '🤖'}</div>
            <h2 style={{ color: COLOR_META[winner].hex }}>
              {winner === playerColor ? 'You Win!' : `${COLOR_META[winner].label} CPU Wins!`}
            </h2>
            <button className={styles.rollBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}
