import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './Solitaire.module.css'

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
  return { tableau, stock: deck.map(c => ({ ...c, faceUp: false })), waste: [], foundation: { '♠':[], '♥':[], '♦':[], '♣':[] } }
}

// Hook: measure card width from DOM for responsive stacking
function useCardSize() {
  const ref = useRef(null)
  const [cardH, setCardH] = useState(96)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(() => {
      const el = ref.current?.querySelector(`.${styles.card}`)
      if (el) setCardH(el.offsetHeight)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return { ref, cardH }
}

export default function Solitaire() {
  const [state, setState]   = useState(initGame)
  const [selected, setSelected] = useState(null)
  const [moves, setMoves]   = useState(0)
  const [won, setWon]       = useState(false)
  const { ref: boardRef, cardH } = useCardSize()

  // Responsive stacking offsets based on actual card height
  const faceUpOffset   = -(cardH * 0.72)
  const faceDownOffset = -(cardH * 0.88)

  const checkWin = f => Object.values(f).every(p => p.length === 13)

  const drawStock = () => {
    setState(s => {
      if (!s.stock.length) {
        return { ...s, stock: [...s.waste].reverse().map(c => ({ ...c, faceUp: false })), waste: [] }
      }
      // Draw up to 3 cards at once
      const drawCount = Math.min(3, s.stock.length)
      const drawn = s.stock.slice(-drawCount).reverse().map(c => ({ ...c, faceUp: true }))
      return {
        ...s,
        stock: s.stock.slice(0, -drawCount),
        waste: [...s.waste, ...drawn],
      }
    })
    setSelected(null)
  }

  const clickTableau = (colIdx, cardIdx) => {
    setState(s => {
      const col  = s.tableau[colIdx]
      const card = col[cardIdx]
      if (!card.faceUp) {
        if (cardIdx === col.length - 1) {
          const newT = s.tableau.map((c, i) => i === colIdx ? c.map((cd, ci) => ci === cardIdx ? { ...cd, faceUp: true } : cd) : c)
          return { ...s, tableau: newT }
        }
        return s
      }
      if (selected) {
        const cards = getSelectedCards(s, selected)
        if (!cards) { setSelected({ from:'tableau', colIdx, cardIdx }); return s }
        const targetTop = col[col.length - 1]
        if (canStackTableau(cards[0], targetTop)) {
          const ns = removeSelected(s, selected)
          ns.tableau[colIdx] = [...ns.tableau[colIdx], ...cards]
          flipLast(ns.tableau)
          setSelected(null); setMoves(m => m + 1); return ns
        }
        setSelected({ from:'tableau', colIdx, cardIdx }); return s
      }
      setSelected({ from:'tableau', colIdx, cardIdx }); return s
    })
  }

  const clickWaste = () => { setSelected({ from:'waste' }) }

  const clickFoundation = (suit) => {
    if (!selected) return
    setState(s => {
      const cards = getSelectedCards(s, selected)
      if (!cards || cards.length !== 1) { setSelected(null); return s }
      const topCard = s.foundation[suit][s.foundation[suit].length - 1] || null
      if (canStackFoundation(cards[0], topCard, suit)) {
        const ns = removeSelected(s, selected)
        ns.foundation = { ...ns.foundation, [suit]: [...ns.foundation[suit], cards[0]] }
        flipLast(ns.tableau)
        setSelected(null); setMoves(m => m + 1)
        if (checkWin(ns.foundation)) setWon(true)
        return ns
      }
      setSelected(null); return s
    })
  }

  const autoFoundation = (colIdx, cardIdx, from) => {
    setState(s => {
      let card, ns
      if (from === 'waste') {
        if (!s.waste.length) return s
        card = s.waste[s.waste.length - 1]
        ns = { ...s, waste: s.waste.slice(0, -1), tableau: s.tableau.map(c => [...c]), foundation: { '♠':[...s.foundation['♠']], '♥':[...s.foundation['♥']], '♦':[...s.foundation['♦']], '♣':[...s.foundation['♣']] } }
      } else {
        const col = s.tableau[colIdx]
        if (!col.length || cardIdx !== col.length - 1 || !col[cardIdx].faceUp) return s
        card = col[cardIdx]
        ns = { ...s, tableau: s.tableau.map((c, i) => i === colIdx ? c.slice(0, -1) : [...c]), foundation: { '♠':[...s.foundation['♠']], '♥':[...s.foundation['♥']], '♦':[...s.foundation['♦']], '♣':[...s.foundation['♣']] } }
        flipLast(ns.tableau)
      }
      const topCard = ns.foundation[card.suit][ns.foundation[card.suit].length - 1] || null
      if (canStackFoundation(card, topCard, card.suit)) {
        ns.foundation[card.suit] = [...ns.foundation[card.suit], card]
        setSelected(null); setMoves(m => m + 1)
        if (checkWin(ns.foundation)) setWon(true)
        return ns
      }
      return s
    })
  }

  const clickEmptyTableau = (colIdx) => {
    if (!selected) return
    setState(s => {
      const cards = getSelectedCards(s, selected)
      if (!cards || cards[0].rank !== 'K') { setSelected(null); return s }
      const ns = removeSelected(s, selected)
      ns.tableau[colIdx] = [...ns.tableau[colIdx], ...cards]
      flipLast(ns.tableau)
      setSelected(null); setMoves(m => m + 1); return ns
    })
  }

  function getSelectedCards(s, sel) {
    if (!sel) return null
    if (sel.from === 'waste') return s.waste.length ? [s.waste[s.waste.length - 1]] : null
    if (sel.from === 'tableau') return s.tableau[sel.colIdx].slice(sel.cardIdx)
    return null
  }

  function removeSelected(s, sel) {
    const ns = { ...s, tableau: s.tableau.map(c => [...c]), waste: [...s.waste], foundation: { ...s.foundation } }
    if (sel.from === 'waste') ns.waste = ns.waste.slice(0, -1)
    else if (sel.from === 'tableau') ns.tableau[sel.colIdx] = ns.tableau[sel.colIdx].slice(0, sel.cardIdx)
    return ns
  }

  function flipLast(tableau) {
    tableau.forEach(col => { if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true })
  }

  const isSel = (from, colIdx, cardIdx) => {
    if (!selected || selected.from !== from) return false
    if (from === 'waste') return true
    return selected.colIdx === colIdx && cardIdx >= selected.cardIdx
  }

  const reset = () => { setState(initGame()); setSelected(null); setMoves(0); setWon(false) }

  // Long-press for mobile auto-move (500ms)
  const useLongPress = (onLongPress, onClick) => {
    const timer = useRef(null)
    const fired = useRef(false)
    return {
      onMouseDown: () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; onLongPress?.() }, 500) },
      onMouseUp:   () => { clearTimeout(timer.current); if (!fired.current) onClick?.() },
      onMouseLeave:() => clearTimeout(timer.current),
      onTouchStart:(e) => { e.preventDefault(); fired.current = false; timer.current = setTimeout(() => { fired.current = true; onLongPress?.() }, 500) },
      onTouchEnd:  (e) => { e.preventDefault(); clearTimeout(timer.current); if (!fired.current) onClick?.() },
    }
  }

  const SCard = ({ card, onClick, onAuto, sel, faceDown, small }) => {
    const lp = useLongPress(onAuto, onClick)
    if (faceDown || !card.faceUp) return (
      <div className={`${styles.card} ${styles.cardBack} ${small ? styles.cardSmall : ''}`} {...lp} />
    )
    return (
      <div
        className={`${styles.card} ${isRed(card.suit) ? styles.cardRed : styles.cardBlack} ${sel ? styles.cardSelected : ''} ${small ? styles.cardSmall : ''}`}
        onDoubleClick={onAuto}
        {...lp}
      >
        <div className={styles.cardTop}><span className={styles.cardRank}>{card.rank}</span><span className={styles.cardSuit}>{card.suit}</span></div>
        <div className={styles.cardCenter}>{card.suit}</div>
        <div className={styles.cardBot}><span className={styles.cardRank}>{card.rank}</span><span className={styles.cardSuit}>{card.suit}</span></div>
      </div>
    )
  }

  const { tableau, stock, waste, foundation } = state

  return (
    <div className={styles.container} ref={boardRef}>
      {/* Top row */}
      <div className={styles.topRow}>
        <div className={styles.stockArea}>
          <div className={`${styles.card} ${styles.cardBack} ${styles.stockPile}`} onClick={drawStock}>
            {stock.length === 0
              ? <span className={styles.recycleIcon}>↺</span>
              : <span className={styles.stockCount}>{stock.length}</span>}
          </div>
          {waste.length > 0
          ? <div style={{ position:'relative', width:110, height:102, flexShrink:0 }}>
              {waste.slice(-3).map((card, i, arr) => (
                <div key={i} style={{ position:'absolute', top:0, left: i * 14, zIndex: i }}>
                  <SCard
                    card={card}
                    onClick={i === arr.length - 1 ? clickWaste : undefined}
                    onAuto={i === arr.length - 1 ? () => autoFoundation(null, null, 'waste') : undefined}
                    sel={i === arr.length - 1 && selected?.from === 'waste'}
                  />
                </div>
              ))}
            </div>
          : <div className={styles.emptyPile} onClick={() => setSelected(null)} />}
        </div>

        <div className={styles.foundationArea}>
          {SUITS.map(suit => {
            const pile = foundation[suit]
            const top  = pile[pile.length - 1]
            return (
              <div key={suit} className={`${styles.emptyPile} ${styles.foundationPile}`}
                onClick={() => clickFoundation(suit)}
                style={{ borderColor: isRed(suit) ? 'rgba(239,68,68,0.3)' : 'rgba(100,100,120,0.3)' }}>
                {top
                  ? <SCard card={top} onClick={() => clickFoundation(suit)} onAuto={null} sel={false} />
                  : <span className={styles.foundationSuit} style={{ color: isRed(suit) ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>{suit}</span>}
              </div>
            )
          })}
        </div>

        <div className={styles.movesChip}>
          <span className={styles.movesN}>{moves}</span>
          <span className={styles.movesL}>Moves</span>
        </div>
      </div>

      {/* Tableau */}
      <div className={styles.tableau}>
        {tableau.map((col, colIdx) => (
          <div key={colIdx} className={styles.tableauCol}
            onClick={col.length === 0 ? () => clickEmptyTableau(colIdx) : undefined}>
            {col.length === 0
              ? <div className={styles.emptyPile} />
              : col.map((card, cardIdx) => (
                <div key={cardIdx} className={styles.tableauCard}
                  style={{ marginTop: cardIdx === 0 ? 0 : card.faceUp ? faceUpOffset : faceDownOffset }}>
                  <SCard
                    card={card}
                    onClick={() => clickTableau(colIdx, cardIdx)}
                    onAuto={() => autoFoundation(colIdx, cardIdx, 'tableau')}
                    sel={isSel('tableau', colIdx, cardIdx)}
                  />
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className={styles.hint}>Draw 3 · Tap top waste card to select · Long-press to send to foundation</div>

      {won && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>🎉</div>
            <h2 className={styles.winTitle}>You Won!</h2>
            <p className={styles.winSub}>Completed in {moves} moves</p>
            <button className={styles.winBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}

      <button className={styles.resetBtn} onClick={reset}>↺ New Game</button>
    </div>
  )
}
