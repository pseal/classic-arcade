import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './SnakesLadders.module.css'

const SNAKES  = {16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,99:78}
const LADDERS = {4:14,9:31,20:38,28:84,40:59,51:67,63:81,71:91}

function processMove(pos, roll) {
  let np = pos + roll
  if (np > 100) return { np: pos, extra: ' (over 100 — stay)' }
  let extra = ''
  if (SNAKES[np])  { extra = ` 🐍 Snake! → ${SNAKES[np]}`;  np = SNAKES[np] }
  if (LADDERS[np]) { extra = ` 🪜 Ladder! → ${LADDERS[np]}`; np = LADDERS[np] }
  return { np, extra }
}

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

export default function SnakesLadders() {
  const [pPos, setPPos] = useState(0)
  const [cPos, setCPos] = useState(0)
  const [turn, setTurn] = useState('P')
  const [lastRoll, setLastRoll] = useState(null)
  const [status, setStatus] = useState('Your turn! Roll the dice 🎲')
  const [rolling, setRolling] = useState(false)
  const [winner, setWinner] = useState(null)
  const [log, setLog] = useState([])

  const addLog = msg => setLog(l => [msg, ...l].slice(0, 5))

  const rollDice = () => {
    if (rolling || winner || turn !== 'P') return
    setRolling(true)
    const roll = Math.floor(Math.random() * 6) + 1
    setLastRoll(roll)
    const { np, extra } = processMove(pPos, roll)
    setPPos(np)
    addLog(`You rolled ${roll} → sq ${np}${extra}`)
    if (np >= 100) { setWinner('P'); setStatus('🎉 You win!'); setRolling(false); return }
    setStatus("CPU's turn...")
    setRolling(false)
    setTurn('CPU')
    setTimeout(() => {
      const cr = Math.floor(Math.random() * 6) + 1
      const { np: cnp, extra: ce } = processMove(cPos, cr)
      setCPos(cnp)
      setLastRoll(cr)
      addLog(`CPU rolled ${cr} → sq ${cnp}${ce}`)
      if (cnp >= 100) { setWinner('CPU'); setStatus('🤖 CPU wins!'); return }
      setTurn('P')
      setStatus('Your turn! Roll the dice 🎲')
    }, 1200)
  }

  const reset = () => {
    setPPos(0); setCPos(0); setTurn('P'); setLastRoll(null)
    setStatus('Your turn! Roll the dice 🎲'); setRolling(false); setWinner(null); setLog([])
  }

  // Board numbering: row 9 = squares 1-10 (left to right), row 8 = 11-20 (right to left), etc.
  const getSquareNum = (r, c) => {
    const row = 9 - r
    return row % 2 === 0 ? row * 10 + (c + 1) : row * 10 + (10 - c)
  }

  return (
    <div className={styles.container}>
      <StatusBar>{status}</StatusBar>

      <div className={styles.positions}>
        <div className={styles.posCard} style={{ borderColor: 'rgba(108,99,255,0.4)', background: 'rgba(108,99,255,0.1)' }}>
          🧑 <strong>You:</strong> sq {pPos}
        </div>
        <div className={styles.posCard} style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)' }}>
          🤖 <strong>CPU:</strong> sq {cPos}
        </div>
      </div>

      <div className={styles.scrollWrap}>
        <div className={styles.board}>
          {Array(10).fill(0).map((_, r) =>
            Array(10).fill(0).map((_, c) => {
              const num = getSquareNum(r, c)
              const hasP = pPos === num, hasC = cPos === num
              const isSnake = !!SNAKES[num], isLadder = !!LADDERS[num]
              return (
                <div key={`${r}-${c}`} className={styles.cell}
                  style={{
                    background: isSnake ? 'rgba(239,68,68,0.2)' : isLadder ? 'rgba(16,185,129,0.2)' : num === 100 ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.06)',
                    borderColor: isSnake ? 'rgba(239,68,68,0.4)' : isLadder ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
                  }}>
                  <span className={styles.cellNum}>{num}</span>
                  {!hasP && !hasC && (isSnake ? '🐍' : isLadder ? '🪜' : num === 100 ? '🏆' : null)}
                  {(hasP || hasC) && (
                    <div className={styles.tokens}>
                      {hasP && <div className={styles.tokenP}>Y</div>}
                      {hasC && <div className={styles.tokenC}>C</div>}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className={styles.controls}>
        {lastRoll && <span className={styles.dice}>{DICE_FACES[lastRoll - 1]}</span>}
        <button className={styles.rollBtn} onClick={rollDice} disabled={rolling || !!winner || turn !== 'P'}>
          Roll Dice 🎲
        </button>
        <button className={styles.resetBtn} onClick={reset}>Reset</button>
      </div>

      <div className={styles.log}>
        {log.map((l, i) => <div key={i} className={styles.logLine}>{l}</div>)}
      </div>
    </div>
  )
}
