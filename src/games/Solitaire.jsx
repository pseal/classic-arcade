import { useState, useCallback } from 'react'
import styles from './Solitaire.module.css'

// ── Card helpers ──────────────────────────────────────────────────────────
const SUITS   = ['♠','♥','♦','♣']
const RANKS   = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const RED     = new Set(['♥','♦'])
const isRed   = s => RED.has(s)
const rankIdx = r => RANKS.indexOf(r)

function makeDeck() {
  const d = []
  for (const suit of SUITS) for (const rank of RANKS) d.push({ suit, rank, faceUp: false })
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]] }
  return d
}

function canStackTableau(card, onto) {
  if (!onto) return card.rank === 'K'
  return isRed(card.suit) !== isRed(onto.suit) && rankIdx(card.rank) === rankIdx(onto.rank) - 1
}

function canStackFoundation(card, topCard, suit) {
  if (card.suit !== suit) return false
  if (!topCard) return card.rank === 'A'
  return rankIdx(card.rank) === rankIdx(topCard.rank) + 1
}

function initGame() {
  const deck = makeDeck()
  const tableau = Array(7).fill(null).map((_, i) => {
    const col = deck.splice(0, i + 1)
    col[col.length - 1].faceUp = true
    return col
  })
  const stock = deck.map(c => ({ ...c, faceUp: false }))
  return {
    tableau,
    stock,
    waste: [],
    foundation: { '♠': [], '♥': [], '♦': [], '♣': [] },
  }
}

// ── Component ─────────────────────────────────────────────────────────────
export default function Solitaire() {
  const [state, setState]     = useState(initGame)
  const [selected, setSelected] = useState(null) // { from, colIdx, cardIdx }
  const [moves, setMoves]     = useState(0)
  const [won, setWon]         = useState(false)

  const checkWin = (foundation) =>
    Object.values(foundation).every(pile => pile.length === 13)

  // Draw from stock
  const drawStock = () => {
    setState(s => {
      if (s.stock.length === 0) {
        // Reset stock from waste
        const newStock = [...s.waste].reverse().map(c => ({ ...c, faceUp: false }))
        return { ...s, stock: newStock, waste: [] }
      }
      const card = { ...s.stock[s.stock.length - 1], faceUp: true }
      return {
        ...s,
        stock: s.stock.slice(0, -1),
        waste: [...s.waste, card],
      }
    })
    setSelected(null)
  }

  // Click a tableau card
  const clickTableau = (colIdx, cardIdx) => {
    setState(s => {
      const col = s.tableau[colIdx]
      const card = col[cardIdx]
      if (!card.faceUp) {
        // Flip top card
        if (cardIdx === col.length - 1) {
          const newT = s.tableau.map((c, i) => i === colIdx
            ? c.map((card, ci) => ci === cardIdx ? { ...card, faceUp: true } : card)
            : c)
          return { ...s, tableau: newT }
        }
        return s
      }

      // If something is selected, try to move
      if (selected) {
        const cards = getSelectedCards(s, selected)
        if (!cards) { setSelected({ from: 'tableau', colIdx, cardIdx }); return s }
        const targetTop = col[col.length - 1]
        if (canStackTableau(cards[0], targetTop)) {
          const newState = removeSelected(s, selected)
          newState.tableau[colIdx] = [...newState.tableau[colIdx], ...cards]
          flipLastTableau(newState.tableau)
          setSelected(null)
          setMoves(m => m + 1)
          return newState
        }
        // Re-select
        setSelected({ from: 'tableau', colIdx, cardIdx })
        return s
      }

      setSelected({ from: 'tableau', colIdx, cardIdx })
      return s
    })
  }

  // Click waste pile
  const clickWaste = () => {
    setState(s => {
      if (!s.waste.length) return s
      if (selected) {
        setSelected({ from: 'waste' })
        return s
      }
      setSelected({ from: 'waste' })
      return s
    })
  }

  // Click foundation
  const clickFoundation = (suit) => {
    if (!selected) return
    setState(s => {
      const cards = getSelectedCards(s, selected)
      if (!cards || cards.length !== 1) { setSelected(null); return s }
      const topCard = s.foundation[suit][s.foundation[suit].length - 1] || null
      if (canStackFoundation(cards[0], topCard, suit)) {
        const newState = removeSelected(s, selected)
        newState.foundation = {
          ...newState.foundation,
          [suit]: [...newState.foundation[suit], cards[0]],
        }
        flipLastTableau(newState.tableau)
        setSelected(null)
        setMoves(m => m + 1)
        if (checkWin(newState.foundation)) setWon(true)
        return newState
      }
      setSelected(null)
      return s
    })
  }

  // Auto-move to foundation
  const autoFoundation = (colIdx, cardIdx, from) => {
    setState(s => {
      let card, newState
      if (from === 'waste') {
        if (!s.waste.length) return s
        card = s.waste[s.waste.length - 1]
        newState = { ...s, waste: s.waste.slice(0, -1), tableau: s.tableau.map(c => [...c]), foundation: { ...s.foundation, '♠': [...s.foundation['♠']], '♥': [...s.foundation['♥']], '♦': [...s.foundation['♦']], '♣': [...s.foundation['♣']] } }
      } else {
        const col = s.tableau[colIdx]
        if (!col.length || cardIdx !== col.length - 1) return s
        card = col[cardIdx]
        if (!card.faceUp) return s
        newState = { ...s, tableau: s.tableau.map((c, i) => i === colIdx ? c.slice(0, -1) : [...c]), foundation: { ...s.foundation, '♠': [...s.foundation['♠']], '♥': [...s.foundation['♥']], '♦': [...s.foundation['♦']], '♣': [...s.foundation['♣']] } }
        flipLastTableau(newState.tableau)
      }
      const topCard = newState.foundation[card.suit][newState.foundation[card.suit].length - 1] || null
      if (canStackFoundation(card, topCard, card.suit)) {
        newState.foundation[card.suit] = [...newState.foundation[card.suit], card]
        setSelected(null)
        setMoves(m => m + 1)
        if (checkWin(newState.foundation)) setWon(true)
        return newState
      }
      return s
    })
  }

  // Drop onto tableau column (click empty col)
  const clickEmptyTableau = (colIdx) => {
    if (!selected) return
    setState(s => {
      const cards = getSelectedCards(s, selected)
      if (!cards || cards[0].rank !== 'K') { setSelected(null); return s }
      const newState = removeSelected(s, selected)
      newState.tableau[colIdx] = [...newState.tableau[colIdx], ...cards]
      flipLastTableau(newState.tableau)
      setSelected(null)
      setMoves(m => m + 1)
      return newState
    })
  }

  function getSelectedCards(s, sel) {
    if (!sel) return null
    if (sel.from === 'waste') return s.waste.length ? [s.waste[s.waste.length - 1]] : null
    if (sel.from === 'tableau') return s.tableau[sel.colIdx].slice(sel.cardIdx)
    return null
  }

  function removeSelected(s, sel) {
    const newState = {
      ...s,
      tableau: s.tableau.map(c => [...c]),
      waste: [...s.waste],
      foundation: { ...s.foundation },
    }
    if (sel.from === 'waste') newState.waste = newState.waste.slice(0, -1)
    else if (sel.from === 'tableau') newState.tableau[sel.colIdx] = newState.tableau[sel.colIdx].slice(0, sel.cardIdx)
    return newState
  }

  function flipLastTableau(tableau) {
    tableau.forEach(col => { if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true })
  }

  const isSelected = (from, colIdx, cardIdx) => {
    if (!selected) return false
    if (selected.from !== from) return false
    if (from === 'waste') return true
    return selected.colIdx === colIdx && cardIdx >= selected.cardIdx
  }

  const reset = () => { setState(initGame()); setSelected(null); setMoves(0); setWon(false) }

  const { tableau, stock, waste, foundation } = state

  const Card = ({ card, onClick, onDblClick, sel, faceDown, small }) => {
    if (faceDown || !card.faceUp) return (
      <div className={`${styles.card} ${styles.cardBack} ${small ? styles.cardSmall : ''}`} onClick={onClick} />
    )
    return (
      <div
        className={`${styles.card} ${isRed(card.suit) ? styles.cardRed : styles.cardBlack} ${sel ? styles.cardSelected : ''} ${small ? styles.cardSmall : ''}`}
        onClick={onClick}
        onDoubleClick={onDblClick}
      >
        <div className={styles.cardTop}><span className={styles.cardRank}>{card.rank}</span><span className={styles.cardSuit}>{card.suit}</span></div>
        <div className={styles.cardCenter}>{card.suit}</div>
        <div className={styles.cardBot}><span className={styles.cardRank}>{card.rank}</span><span className={styles.cardSuit}>{card.suit}</span></div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Top row */}
      <div className={styles.topRow}>
        {/* Stock + Waste */}
        <div className={styles.stockArea}>
          <div className={`${styles.card} ${styles.cardBack} ${styles.stockPile}`} onClick={drawStock}>
            {stock.length === 0 ? <span className={styles.recycleIcon}>↺</span> : <span className={styles.stockCount}>{stock.length}</span>}
          </div>
          {waste.length > 0
            ? <Card card={waste[waste.length - 1]} onClick={clickWaste} onDblClick={() => autoFoundation(null, null, 'waste')} sel={selected?.from === 'waste'} />
            : <div className={styles.emptyPile} onClick={() => setSelected(null)} />
          }
        </div>

        {/* Foundation */}
        <div className={styles.foundationArea}>
          {SUITS.map(suit => {
            const pile = foundation[suit]
            const top = pile[pile.length - 1]
            return (
              <div key={suit} className={`${styles.emptyPile} ${styles.foundationPile}`}
                onClick={() => clickFoundation(suit)}
                style={{ borderColor: isRed(suit) ? 'rgba(239,68,68,0.3)' : 'rgba(100,100,120,0.3)' }}>
                {top
                  ? <Card card={top} onClick={() => clickFoundation(suit)} sel={false} />
                  : <span className={styles.foundationSuit} style={{ color: isRed(suit) ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>{suit}</span>
                }
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div className={styles.statsBox}>
          <div><span className={styles.statN}>{moves}</span><span className={styles.statL}>Moves</span></div>
          <div><span className={styles.statN} style={{ color: '#10b981' }}>{Object.values(foundation).reduce((a,p)=>a+p.length,0)}</span><span className={styles.statL}>Cards Done</span></div>
        </div>
      </div>

      {/* Tableau */}
      <div className={styles.tableau}>
        {tableau.map((col, colIdx) => (
          <div key={colIdx} className={styles.tableauCol} onClick={col.length === 0 ? () => clickEmptyTableau(colIdx) : undefined}>
            {col.length === 0
              ? <div className={styles.emptyPile} />
              : col.map((card, cardIdx) => (
                <div key={cardIdx} className={styles.tableauCard}
                  style={{ marginTop: cardIdx === 0 ? 0 : card.faceUp ? -70 : -85 }}>
                  <Card card={card}
                    onClick={() => clickTableau(colIdx, cardIdx)}
                    onDblClick={() => autoFoundation(colIdx, cardIdx, 'tableau')}
                    sel={isSelected('tableau', colIdx, cardIdx)}
                  />
                </div>
              ))
            }
          </div>
        ))}
      </div>

      <div className={styles.hint}>Double-click a card to auto-move to foundation · Click stock to draw</div>

      {/* Win overlay */}
      {won && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>🎉</div>
            <h2>You Won!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Completed in {moves} moves</p>
            <button className={styles.resetBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}

      <button className={styles.resetBtn} onClick={reset} style={{ marginTop: 8 }}>New Game</button>
    </div>
  )
}
