import { useState } from 'react'
import StatusBar from '../components/StatusBar'
import styles from './MemoryMatch.module.css'

const ALL_EMOJIS = ['🦊','🦁','🐬','🦋','🌈','⭐','🍕','🎸','🚀','🌸','🎭','💎']

function makeCards(pairs) {
  const emojis = ALL_EMOJIS.slice(0, pairs)
  return [...emojis, ...emojis]
    .map((emoji, id) => ({ id, emoji, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
}

export default function MemoryMatch({ diff }) {
  const pairCount = diff === 'easy' ? 6 : diff === 'medium' ? 9 : 12
  const [cards, setCards]   = useState(() => makeCards(pairCount))
  const [selected, setSelected] = useState([])
  const [moves, setMoves]   = useState(0)
  const [done, setDone]     = useState(false)
  const [locked, setLocked] = useState(false)

  const flip = (card) => {
    if (locked || card.flipped || card.matched || selected.length === 2) return
    const next = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c)
    const nextSel = [...selected, card]
    setCards(next)
    setSelected(nextSel)

    if (nextSel.length === 2) {
      setMoves(m => m + 1)
      setLocked(true)
      if (nextSel[0].emoji === nextSel[1].emoji) {
        setTimeout(() => {
          setCards(c => c.map(x => nextSel.some(s => s.id === x.id) ? { ...x, matched: true } : x))
          setSelected([])
          setLocked(false)
          const remaining = next.filter(x => !x.matched && !nextSel.some(s => s.id === x.id))
          if (remaining.length === 0) setDone(true)
        }, 600)
      } else {
        setTimeout(() => {
          setCards(c => c.map(x => nextSel.some(s => s.id === x.id) ? { ...x, flipped: false } : x))
          setSelected([])
          setLocked(false)
        }, 900)
      }
    }
  }

  const reset = () => {
    setCards(makeCards(pairCount))
    setSelected([]); setMoves(0); setDone(false); setLocked(false)
  }

  const matched = cards.filter(c => c.matched).length / 2
  const cols = diff === 'easy' ? 4 : 6

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div>
          <span className={styles.statVal} style={{ color: '#ec4899' }}>{moves}</span>
          <span className={styles.statLabel}>Moves</span>
        </div>
        <div>
          <span className={styles.statVal} style={{ color: '#10b981' }}>{matched}/{pairCount}</span>
          <span className={styles.statLabel}>Matched</span>
        </div>
      </div>

      {done && <StatusBar color="#10b981">🎉 Completed in {moves} moves!</StatusBar>}

      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map(card => (
          <div
            key={card.id}
            className={[styles.card, card.matched ? styles.cardMatched : card.flipped ? styles.cardFlipped : ''].join(' ')}
            onClick={() => flip(card)}
          >
            {(card.flipped || card.matched) ? card.emoji : ''}
          </div>
        ))}
      </div>

      <button className={styles.resetBtn} onClick={reset}>New Game</button>
    </div>
  )
}
