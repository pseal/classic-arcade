import { useState, useRef, useEffect } from 'react'
import styles from './SnakesLadders.module.css'

// ── Board config ───────────────────────────────────────────────────────────
// Big dramatic snakes and ladders
const LADDERS = {
  4:  56,   // short bottom → big jump
  9:  31,
  20: 77,   // medium
  28: 84,   // big
  40: 59,
  51: 92,   // huge!
  63: 81,
  71: 96,   // massive jump near top
}

const SNAKES = {
  17: 7,    // near start
  54: 34,
  62: 19,   // big fall
  64: 60,
  87: 24,   // massive drop
  93: 73,
  95: 52,   // big fall near top
  99: 41,   // devastating — just before finish!
}

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

// Square number → [row, col] on a 10×10 board (1=bottom-left, 100=top-left or top-right)
function squareToPos(n) {
  if (n < 1 || n > 100) return null
  const idx  = n - 1
  const row  = Math.floor(idx / 10)        // 0 = bottom, 9 = top
  const col  = row % 2 === 0 ? idx % 10 : 9 - (idx % 10)
  return { row, col }
}

// Center pixel of a square (given cell size)
function squareCenter(n, cellSize) {
  const p = squareToPos(n)
  if (!p) return null
  const x = p.col * cellSize + cellSize / 2
  const y = (9 - p.row) * cellSize + cellSize / 2
  return { x, y }
}

const CELL = 58   // px per cell
const BOARD = CELL * 10

// Square color scheme — alternating with highlights
function squareBg(n) {
  const pos = squareToPos(n)
  const isEven = (pos.row + pos.col) % 2 === 0
  if (n === 100) return '#fbbf24'
  if (n === 1)   return '#34d399'
  return isEven ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
}

// ── SVG Snake path between two squares ─────────────────────────────────────
function SnakePath({ from, to, cellSize }) {
  const f = squareCenter(from, cellSize)
  const t = squareCenter(to,   cellSize)
  if (!f || !t) return null

  // Sinusoidal snake body using cubic beziers
  const dx = t.x - f.x, dy = t.y - f.y
  const mx = f.x + dx * 0.33, my = f.y + dy * 0.33 + 40
  const mx2= f.x + dx * 0.66, my2= f.y + dy * 0.66 - 40

  return (
    <g>
      {/* Glow */}
      <path
        d={`M${f.x},${f.y} C${mx},${my} ${mx2},${my2} ${t.x},${t.y}`}
        stroke="#ef4444" strokeWidth={10} fill="none" opacity={0.15}
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d={`M${f.x},${f.y} C${mx},${my} ${mx2},${my2} ${t.x},${t.y}`}
        stroke="url(#snakeGrad)" strokeWidth={6} fill="none"
        strokeLinecap="round" strokeDasharray="none"
      />
      {/* Scale pattern */}
      <path
        d={`M${f.x},${f.y} C${mx},${my} ${mx2},${my2} ${t.x},${t.y}`}
        stroke="rgba(0,0,0,0.3)" strokeWidth={3} fill="none"
        strokeLinecap="round" strokeDasharray="4 6"
      />
      {/* Head */}
      <circle cx={f.x} cy={f.y} r={9} fill="#dc2626" stroke="#fca5a5" strokeWidth={2}/>
      <circle cx={f.x-3} cy={f.y-3} r={2} fill="#fff"/>
      <circle cx={f.x+3} cy={f.y-3} r={2} fill="#fff"/>
      <circle cx={f.x-3} cy={f.y-3} r={1} fill="#000"/>
      <circle cx={f.x+3} cy={f.y-3} r={1} fill="#000"/>
      {/* Tail */}
      <circle cx={t.x} cy={t.y} r={5} fill="#ef4444" opacity={0.6}/>
    </g>
  )
}

// ── SVG Ladder between two squares ─────────────────────────────────────────
function LadderPath({ from, to, cellSize }) {
  const f = squareCenter(from, cellSize)
  const t = squareCenter(to,   cellSize)
  if (!f || !t) return null

  const dx = t.x - f.x, dy = t.y - f.y
  const len = Math.sqrt(dx*dx + dy*dy)
  const ux = dy / len * 10, uy = -dx / len * 10   // perpendicular

  // Two rails
  const r1 = { fx: f.x + ux, fy: f.y + uy, tx: t.x + ux, ty: t.y + uy }
  const r2 = { fx: f.x - ux, fy: f.y - uy, tx: t.x - ux, ty: t.y - uy }

  // Rungs
  const rungs = 6
  const rungEls = Array.from({ length: rungs }, (_, i) => {
    const frac = (i + 1) / (rungs + 1)
    const rx1 = r1.fx + (r1.tx - r1.fx) * frac
    const ry1 = r1.fy + (r1.ty - r1.fy) * frac
    const rx2 = r2.fx + (r2.tx - r2.fx) * frac
    const ry2 = r2.fy + (r2.ty - r2.fy) * frac
    return <line key={i} x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" opacity={0.9}/>
  })

  return (
    <g>
      {/* Glow */}
      <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#fbbf24" strokeWidth={24} opacity={0.06} strokeLinecap="round"/>
      {/* Rails */}
      <line x1={r1.fx} y1={r1.fy} x2={r1.tx} y2={r1.ty} stroke="url(#ladderGrad)" strokeWidth={5} strokeLinecap="round"/>
      <line x1={r2.fx} y1={r2.fy} x2={r2.tx} y2={r2.ty} stroke="url(#ladderGrad)" strokeWidth={5} strokeLinecap="round"/>
      {/* Rungs */}
      {rungEls}
      {/* Base glow dots */}
      <circle cx={f.x} cy={f.y} r={8} fill="#fbbf24" opacity={0.4}/>
      <circle cx={t.x} cy={t.y} r={8} fill="#fbbf24" opacity={0.4}/>
    </g>
  )
}

// ── Token SVG ──────────────────────────────────────────────────────────────
function Token({ x, y, color, label, pulse }) {
  return (
    <g style={{ filter: pulse ? `drop-shadow(0 0 8px ${color})` : 'none' }}>
      {pulse && <circle cx={x} cy={y} r={16} fill={color} opacity={0.2}>
        <animate attributeName="r" values="14;20;14" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="1s" repeatCount="indefinite"/>
      </circle>}
      <circle cx={x} cy={y} r={13} fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth={2}/>
      <circle cx={x-4} cy={y-4} r={4} fill="rgba(255,255,255,0.35)"/>
      <text x={x} y={y+5} textAnchor="middle" fontSize={11} fontWeight="800" fill="#fff"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        {label}
      </text>
    </g>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SnakesLadders() {
  const [pPos,   setPPos]   = useState(0)
  const [cPos,   setCPos]   = useState(0)
  const [turn,   setTurn]   = useState('P')
  const [roll,   setRoll]   = useState(null)
  const [status, setStatus] = useState('🎲 Roll the dice to begin!')
  const [winner, setWinner] = useState(null)
  const [rolling,setRolling]= useState(false)
  const [event,  setEvent]  = useState(null)   // 'snake' | 'ladder' | null
  const [log,    setLog]    = useState([])
  const [scores, setScores] = useState({ P: 0, CPU: 0 })

  const addLog = msg => setLog(l => [msg, ...l].slice(0, 6))

  const processMove = (pos, roll) => {
    let np = pos + roll
    if (np > 100) return { np: pos, note: `Can't move — need exact!`, ev: null }
    const note = []
    let ev = null
    if (LADDERS[np]) {
      note.push(`🪜 Ladder! ${np} → ${LADDERS[np]}`)
      np = LADDERS[np]; ev = 'ladder'
    } else if (SNAKES[np]) {
      note.push(`🐍 Snake! ${np} → ${SNAKES[np]}`)
      np = SNAKES[np]; ev = 'snake'
    }
    return { np, note: note[0] || `→ sq ${np}`, ev }
  }

  const doRoll = () => {
    if (rolling || winner || turn !== 'P') return
    setRolling(true)
    setEvent(null)
    const r = Math.floor(Math.random() * 6) + 1
    setRoll(r)

    setTimeout(() => {
      const { np, note, ev } = processMove(pPos, r)
      setPPos(np)
      setEvent(ev)
      addLog(`You rolled ${r}. ${note}`)
      setStatus(`You rolled ${r}! ${note}`)

      if (np >= 100) {
        setWinner('P')
        setScores(s => ({ ...s, P: s.P + 1 }))
        setStatus('🎉 You reached 100 — You Win!')
        setRolling(false)
        return
      }

      setTurn('CPU')
      setTimeout(() => {
        setRolling(false)
        const cr = Math.floor(Math.random() * 6) + 1
        setRoll(cr)
        setEvent(null)

        setTimeout(() => {
          const { np: cnp, note: cnote, ev: cev } = processMove(cPos, cr)
          setCPos(cnp)
          setEvent(cev)
          addLog(`CPU rolled ${cr}. ${cnote}`)
          setStatus(`CPU rolled ${cr}. ${cnote}`)

          if (cnp >= 100) {
            setWinner('CPU')
            setScores(s => ({ ...s, CPU: s.CPU + 1 }))
            setStatus('🤖 CPU wins!')
          } else {
            setTurn('P')
            setStatus('🎲 Your turn — roll the dice!')
          }
        }, 600)
      }, 800)
    }, 500)
  }

  const reset = () => {
    setPPos(0); setCPos(0); setTurn('P'); setRoll(null)
    setStatus('🎲 Roll the dice to begin!')
    setWinner(null); setRolling(false); setEvent(null); setLog([])
  }

  // Square labels
  const squares = Array.from({ length: 100 }, (_, i) => i + 1)

  const pCenter = pPos > 0 ? squareCenter(pPos, CELL) : null
  const cCenter = cPos > 0 ? squareCenter(cPos, CELL) : null

  // Offset tokens if on same square
  const sameSquare = pPos > 0 && pPos === cPos
  const pOff = sameSquare ? -10 : 0
  const cOff = sameSquare ? +10 : 0

  return (
    <div className={styles.container}>

      {/* Score + Status */}
      <div className={styles.topBar}>
        <div className={styles.playerChip} style={{ borderColor: 'rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.08)' }}>
          <div className={styles.chipDot} style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }}/>
          <div>
            <div className={styles.chipName}>You</div>
            <div className={styles.chipSq}>sq {pPos}</div>
          </div>
          <div className={styles.chipScore} style={{ color: '#a78bfa' }}>{scores.P}</div>
        </div>

        <div className={styles.statusPill}
          style={{ color: event === 'snake' ? '#f87171' : event === 'ladder' ? '#fbbf24' : 'rgba(255,255,255,0.7)' }}>
          {status}
        </div>

        <div className={styles.playerChip} style={{ borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)' }}>
          <div className={styles.chipScore} style={{ color: '#f87171' }}>{scores.CPU}</div>
          <div style={{ textAlign: 'right' }}>
            <div className={styles.chipName}>CPU</div>
            <div className={styles.chipSq}>sq {cPos}</div>
          </div>
          <div className={styles.chipDot} style={{ background: '#f87171', boxShadow: '0 0 8px #f87171' }}/>
        </div>
      </div>

      {/* Board */}
      <div className={styles.boardWrap}>
        <svg
          width={BOARD}
          height={BOARD}
          className={styles.svg}
          viewBox={`0 0 ${BOARD} ${BOARD}`}
        >
          <defs>
            <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#ef4444"/>
              <stop offset="50%"  stopColor="#dc2626"/>
              <stop offset="100%" stopColor="#991b1b"/>
            </linearGradient>
            <linearGradient id="ladderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#fbbf24"/>
              <stop offset="100%" stopColor="#d97706"/>
            </linearGradient>
            <filter id="boardGlow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Board background */}
          <rect width={BOARD} height={BOARD} rx={8} fill="rgba(10,10,30,0.95)"/>

          {/* Grid squares */}
          {squares.map(n => {
            const p = squareToPos(n)
            const x = p.col * CELL
            const y = (9 - p.row) * CELL
            const isSnakeHead  = !!SNAKES[n]
            const isLadderBase = !!LADDERS[n]
            const isSnakeTail  = Object.values(SNAKES).includes(n)
            const isLadderTop  = Object.values(LADDERS).includes(n)

            return (
              <g key={n}>
                <rect
                  x={x+1} y={y+1} width={CELL-2} height={CELL-2}
                  rx={4}
                  fill={n === 100 ? 'rgba(251,191,36,0.15)' : n === 1 ? 'rgba(52,211,153,0.15)' : isSnakeHead ? 'rgba(239,68,68,0.08)' : isLadderBase ? 'rgba(251,191,36,0.08)' : (p.row + p.col) % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)'}
                  stroke={(p.row + p.col) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}
                  strokeWidth={0.5}
                />
                {/* Number */}
                <text
                  x={x + CELL/2} y={y + CELL - 7}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="700"
                  fill={n === 100 ? '#fbbf24' : n === 1 ? '#34d399' : isSnakeHead ? '#f87171' : isLadderBase ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
                >
                  {n}
                </text>
                {/* Icons */}
                {n === 100 && <text x={x+CELL/2} y={y+CELL/2+4} textAnchor="middle" fontSize={22}>🏆</text>}
                {n === 1   && <text x={x+CELL/2} y={y+CELL/2+4} textAnchor="middle" fontSize={18}>🚀</text>}
              </g>
            )
          })}

          {/* Ladders (draw first, behind snakes) */}
          {Object.entries(LADDERS).map(([from, to]) => (
            <LadderPath key={`l${from}`} from={+from} to={+to} cellSize={CELL}/>
          ))}

          {/* Snakes */}
          {Object.entries(SNAKES).map(([from, to]) => (
            <SnakePath key={`s${from}`} from={+from} to={+to} cellSize={CELL}/>
          ))}

          {/* Start tokens (off-board) */}
          {pPos === 0 && (
            <Token x={20} y={BOARD-20} color="#a78bfa" label="Y" pulse={turn==='P'}/>
          )}
          {cPos === 0 && (
            <Token x={45} y={BOARD-20} color="#f87171" label="C" pulse={turn==='CPU'}/>
          )}

          {/* On-board tokens */}
          {pPos > 0 && pCenter && (
            <Token x={pCenter.x + pOff} y={pCenter.y} color="#a78bfa" label="Y" pulse={turn==='P' && !rolling}/>
          )}
          {cPos > 0 && cCenter && (
            <Token x={cCenter.x + cOff} y={cCenter.y} color="#f87171" label="C" pulse={turn==='CPU' && rolling}/>
          )}
        </svg>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.diceWrap}>
          {roll
            ? <span className={styles.dice} key={roll}>{DICE_FACES[roll-1]}</span>
            : <span className={styles.dicePlaceholder}>?</span>
          }
        </div>
        <div className={styles.btnCol}>
          <button
            className={styles.rollBtn}
            onClick={doRoll}
            disabled={rolling || !!winner || turn !== 'P'}
          >
            {turn !== 'P' && !winner ? '⏳ CPU rolling...' : '🎲 Roll Dice'}
          </button>
          <button className={styles.resetBtn} onClick={reset}>↺ New Game</button>
        </div>
      </div>

      {/* Log */}
      <div className={styles.log}>
        {log.map((l, i) => (
          <div key={i} className={styles.logLine}
            style={{ opacity: 1 - i * 0.18,
              color: l.includes('🐍') ? '#f87171' : l.includes('🪜') ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
            {l}
          </div>
        ))}
      </div>

      {/* Win overlay */}
      {winner && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>{winner === 'P' ? '🎉' : '🤖'}</div>
            <h2 className={styles.winTitle} style={{ color: winner === 'P' ? '#a78bfa' : '#f87171' }}>
              {winner === 'P' ? 'You Win!' : 'CPU Wins!'}
            </h2>
            <p className={styles.winSub}>Score — You: {scores.P} · CPU: {scores.CPU}</p>
            <button className={styles.winBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}
