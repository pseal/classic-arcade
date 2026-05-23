import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './Ludo.module.css'

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

export default function Ludo() {
  const [pTokens, setPTokens] = useState([-1, -1, -1, -1])
  const [cTokens, setCTokens] = useState([-1, -1, -1, -1])
  const [turn, setTurn] = useState('P')
  const [roll, setRoll]   = useState(null)
  const [status, setStatus] = useState('Roll the dice to start!')
  const [winner, setWinner] = useState(null)

  const getBestMove = (tokens, roll) => {
    // Prefer: finishing > advancing furthest > entering
    const movable = tokens.map((pos, i) => (pos === -1 ? roll === 6 : pos + roll <= 57) ? i : null).filter(i => i !== null)
    if (!movable.length) return null
    const finisher = movable.find(i => tokens[i] + roll === 57)
    if (finisher !== undefined) return finisher
    // advance furthest token
    return movable.reduce((best, i) => tokens[i] > tokens[best] ? i : best, movable[0])
  }

  const rollDice = () => {
    if (winner || turn !== 'P') return
    const r = Math.floor(Math.random() * 6) + 1
    setRoll(r)
    const np = [...pTokens]
    const idx = getBestMove(np, r)
    if (idx === null) {
      setStatus(`Rolled ${r} — no moves. CPU's turn.`)
      setTurn('CPU')
      setTimeout(() => doCpuTurn([...cTokens]), 900)
      return
    }
    if (np[idx] === -1) np[idx] = 0; else np[idx] += r
    setPTokens(np)
    if (np.every(p => p === 57)) { setWinner('P'); setStatus('🎉 You win! All tokens home!'); return }
    setStatus(`Rolled ${r} — Token ${idx + 1} → sq ${np[idx]}`)
    setTurn('CPU')
    setTimeout(() => doCpuTurn([...cTokens]), 900)
  }

  const doCpuTurn = (ct) => {
    const r = Math.floor(Math.random() * 6) + 1
    setRoll(r)
    const idx = getBestMove(ct, r)
    if (idx === null) {
      setStatus(`CPU rolled ${r} — no moves.`)
      setTurn('P')
      return
    }
    if (ct[idx] === -1) ct[idx] = 0; else ct[idx] += r
    setCTokens([...ct])
    if (ct.every(p => p === 57)) { setWinner('CPU'); setStatus('🤖 CPU wins!'); return }
    setStatus(`CPU rolled ${r} — Token ${idx + 1} → sq ${ct[idx]}`)
    setTurn('P')
  }

  const reset = () => {
    setPTokens([-1,-1,-1,-1]); setCTokens([-1,-1,-1,-1])
    setTurn('P'); setRoll(null); setWinner(null); setStatus('Roll the dice to start!')
  }

  const TokenRow = ({ tokens, color, label }) => (
    <div className={styles.side}>
      <div className={styles.sideLabel} style={{ color }}>{label}</div>
      <div className={styles.tokenRow}>
        {tokens.map((pos, i) => (
          <div key={i} className={styles.tokenWrap}>
            <div className={styles.token}
              style={{
                background: color,
                opacity: pos === -1 ? 0.35 : 1,
                boxShadow: pos === 57 ? `0 0 14px ${color}` : 'none',
              }}>
              {pos === -1 ? '🏠' : pos === 57 ? '✓' : pos}
            </div>
            <div className={styles.tokenLabel}>T{i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <StatusBar>{status}</StatusBar>

      <div className={styles.grid}>
        <TokenRow tokens={pTokens} color="#6c63ff" label={`🧑 You — ${pTokens.filter(p=>p===57).length}/4 home`} />
        <TokenRow tokens={cTokens} color="#ef4444" label={`🤖 CPU — ${cTokens.filter(p=>p===57).length}/4 home`} />
      </div>

      <div className={styles.diceArea}>
        {roll && <span className={styles.dice}>{DICE_FACES[roll - 1]}</span>}
      </div>

      <div className={styles.controls}>
        <button className={styles.rollBtn} onClick={rollDice} disabled={!!winner || turn !== 'P'}>
          {turn === 'P' ? 'Roll Dice 🎲' : "CPU's Turn..."}
        </button>
        <button className={styles.resetBtn} onClick={reset}>Reset</button>
      </div>

      <p className={styles.hint}>Roll 6 to bring a token out of home (🏠). First to get all 4 to square 57 wins.</p>
    </div>
  )
}
