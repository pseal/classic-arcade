import { useState, useEffect, useCallback } from 'react'
import styles from './Uno.module.css'

// ── Constants ──────────────────────────────────────────────────────────────
const COLORS  = ['red','yellow','green','blue']
const NUMBERS = ['0','1','2','3','4','5','6','7','8','9']
const SPECIALS = ['Skip','Reverse','+2']
const WILDS   = ['Wild','Wild+4']
const COLOR_HEX = { red:'#ef4444', yellow:'#eab308', green:'#22c55e', blue:'#3b82f6', black:'#312e81' }

function makeDeck() {
  const deck = []
  for (const color of COLORS) {
    deck.push({ color, value: '0' })
    for (const n of NUMBERS.slice(1)) { deck.push({ color, value: n }); deck.push({ color, value: n }) }
    for (const s of SPECIALS) { deck.push({ color, value: s }); deck.push({ color, value: s }) }
  }
  for (const w of WILDS) { for (let i = 0; i < 4; i++) deck.push({ color: 'black', value: w }) }
  return shuffle(deck)
}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]] }
  return b
}

function canPlay(card, topCard, currentColor) {
  if (card.color === 'black') return true
  if (card.color === currentColor) return true
  if (card.value === topCard.value) return true
  return false
}

function applyCardEffect(card, state, pickedColor) {
  let { drawPile, cpuHand, playerHand, currentColor, direction, skipNext } = state
  currentColor = card.color === 'black' ? pickedColor : card.color

  if (card.value === '+2') {
    const drawn = drawPile.slice(0, 2)
    drawPile = drawPile.slice(2)
    // If player just played, CPU draws; if CPU played, player draws (handled in turn logic)
    skipNext = true
    return { drawPile, cpuHand, playerHand, currentColor, direction, skipNext, extraDraw: drawn }
  }
  if (card.value === 'Wild+4') {
    const drawn = drawPile.slice(0, 4)
    drawPile = drawPile.slice(4)
    skipNext = true
    return { drawPile, cpuHand, playerHand, currentColor, direction, skipNext, extraDraw: drawn }
  }
  if (card.value === 'Skip')    { skipNext = true }
  if (card.value === 'Reverse') { direction = -direction }

  return { drawPile, cpuHand, playerHand, currentColor, direction, skipNext, extraDraw: [] }
}

// ── Wild Color Picker ─────────────────────────────────────────────────────
function ColorPicker({ onPick }) {
  return (
    <div className={styles.colorPicker}>
      <p className={styles.pickerLabel}>Choose a color</p>
      <div className={styles.pickerColors}>
        {COLORS.map(c => (
          <button key={c} className={styles.pickerBtn}
            style={{ background: COLOR_HEX[c], boxShadow: `0 4px 16px ${COLOR_HEX[c]}66` }}
            onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  )
}

// ── UNO Card ──────────────────────────────────────────────────────────────
function UnoCard({ card, onClick, disabled, selected, faceDown, small }) {
  if (faceDown) return <div className={`${styles.card} ${styles.cardBack} ${small ? styles.cardSm : ''}`} />
  const isWild = card.color === 'black'
  return (
    <div
      className={`${styles.card} ${selected ? styles.cardSelected : ''} ${disabled ? styles.cardDisabled : styles.cardPlayable} ${small ? styles.cardSm : ''}`}
      style={{ background: isWild ? 'linear-gradient(135deg,#ef4444 25%,#eab308 25%,#eab308 50%,#22c55e 50%,#22c55e 75%,#3b82f6 75%)' : COLOR_HEX[card.color], boxShadow: !disabled ? `0 4px 16px ${isWild ? 'rgba(108,99,255,0.4)' : COLOR_HEX[card.color]+'66'}` : 'none' }}
      onClick={!disabled ? onClick : undefined}
    >
      <div className={styles.cardInner}>
        <span className={styles.cardVal}>{card.value}</span>
      </div>
      <div className={styles.cardCornerTL}>{isWild ? '🌈' : card.value}</div>
      <div className={styles.cardCornerBR}>{isWild ? '🌈' : card.value}</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Uno({ diff = 'medium' }) {
  const initState = useCallback(() => {
    let deck = makeDeck()
    const playerHand = deck.splice(0, 7)
    const cpuHand    = deck.splice(0, 7)
    // Ensure first card is not a wild
    let topIdx = deck.findIndex(c => c.color !== 'black')
    const topCard = deck.splice(topIdx, 1)[0]
    return {
      playerHand,
      cpuHand,
      drawPile: deck,
      discardPile: [topCard],
      currentColor: topCard.color,
      turn: 'player',
      direction: 1,
      skipNext: false,
      status: 'Your turn — play or draw a card',
      winner: null,
      awaitingColor: false,
      pendingCard: null,
      log: [],
    }
  }, [])

  const [state, setState] = useState(initState)

  const addLog = (msg, s) => ({ ...s, log: [msg, ...(s.log || [])].slice(0, 5) })

  // ── Player plays a card ──
  const playCard = (cardIdx) => {
    setState(s => {
      if (s.turn !== 'player' || s.winner || s.awaitingColor) return s
      const card = s.playerHand[cardIdx]
      const topCard = s.discardPile[s.discardPile.length - 1]
      if (!canPlay(card, topCard, s.currentColor)) return s

      const newHand = s.playerHand.filter((_, i) => i !== cardIdx)
      if (newHand.length === 0) return addLog('You played your last card!', { ...s, playerHand: newHand, discardPile: [...s.discardPile, card], winner: 'player' })

      if (card.color === 'black') {
        return { ...s, playerHand: newHand, discardPile: [...s.discardPile, card], awaitingColor: true, pendingCard: card, status: 'Choose a color!' }
      }

      const effect = applyCardEffect(card, { ...s, playerHand: newHand }, null)
      const newState = {
        ...s,
        playerHand: newHand,
        discardPile: [...s.discardPile, card],
        drawPile: effect.drawPile,
        currentColor: effect.currentColor,
        direction: effect.direction,
        skipNext: false,
        turn: 'cpu',
        status: 'CPU thinking...',
      }
      if (effect.skipNext) {
        // CPU draws extra and gets skipped
        newState.cpuHand = [...s.cpuHand, ...(effect.extraDraw || [])]
        newState.turn = 'player'
        newState.status = `CPU ${card.value === '+2' ? 'draws 2' : 'skipped'}! Your turn.`
        return addLog(`You played ${card.value}`, newState)
      }
      return addLog(`You played ${card.value}`, newState)
    })
  }

  // ── Player picks wild color ──
  const pickColor = (color) => {
    setState(s => {
      if (!s.awaitingColor) return s
      const card = s.pendingCard
      const effect = applyCardEffect(card, { ...s }, color)
      const newState = {
        ...s,
        drawPile: effect.drawPile,
        currentColor: color,
        direction: effect.direction,
        skipNext: false,
        awaitingColor: false,
        pendingCard: null,
        turn: 'cpu',
        status: 'CPU thinking...',
      }
      if (effect.skipNext) {
        newState.cpuHand = [...s.cpuHand, ...(effect.extraDraw || [])]
        newState.turn = 'player'
        newState.status = `CPU draws ${card.value === 'Wild+4' ? 4 : 2}! Your turn.`
      }
      return addLog(`You played ${card.value} → ${color}`, newState)
    })
  }

  // ── Player draws ──
  const drawCard = () => {
    setState(s => {
      if (s.turn !== 'player' || s.winner || s.awaitingColor) return s
      if (!s.drawPile.length) return s
      const card = { ...s.drawPile[0], drawn: true }
      const newState = {
        ...s,
        playerHand: [...s.playerHand, card],
        drawPile: s.drawPile.slice(1),
        status: 'You drew a card.',
      }
      // If drawn card is playable, allow play; else pass
      if (!canPlay(card, s.discardPile[s.discardPile.length - 1], s.currentColor)) {
        newState.turn = 'cpu'
        newState.status = 'Drew a card — CPU\'s turn.'
      }
      return addLog('You drew a card', newState)
    })
  }

  // ── CPU turn ──
  useEffect(() => {
    if (state.turn !== 'cpu' || state.winner || state.awaitingColor) return
    const timer = setTimeout(() => {
      setState(s => {
        if (s.turn !== 'cpu' || s.winner) return s
        const topCard = s.discardPile[s.discardPile.length - 1]
        const playable = s.cpuHand.map((c, i) => canPlay(c, topCard, s.currentColor) ? i : null).filter(i => i !== null)

        if (!playable.length) {
          // Draw
          if (!s.drawPile.length) return { ...s, turn: 'player', status: 'CPU passed. Your turn.' }
          const drawn = s.drawPile[0]
          const newCpu = [...s.cpuHand, drawn]
          const newDraw = s.drawPile.slice(1)
          const canPlayDrawn = canPlay(drawn, topCard, s.currentColor)
          if (canPlayDrawn) {
            // CPU plays drawn card
            const newCpu2 = newCpu.filter((_, i) => i !== newCpu.length - 1)
            if (newCpu2.length === 0) return addLog('CPU played last card!', { ...s, cpuHand: [], drawPile: newDraw, discardPile: [...s.discardPile, drawn], winner: 'cpu' })
            const color = drawn.color === 'black' ? COLORS[Math.floor(Math.random() * 4)] : drawn.color
            const effect = applyCardEffect(drawn, { ...s, cpuHand: newCpu2, drawPile: newDraw }, color)
            const ns = { ...s, cpuHand: newCpu2, drawPile: effect.drawPile, discardPile: [...s.discardPile, drawn], currentColor: effect.currentColor, direction: effect.direction, turn: 'player', status: 'Your turn!' }
            if (effect.skipNext) { ns.playerHand = [...s.playerHand, ...(effect.extraDraw||[])]; ns.status = `CPU played ${drawn.value}! You draw. Your turn.` }
            return addLog(`CPU drew & played ${drawn.value}`, ns)
          }
          return addLog('CPU drew a card', { ...s, cpuHand: newCpu, drawPile: newDraw, turn: 'player', status: 'CPU drew. Your turn!' })
        }

        // Pick best card
        let idx = playable[0]
        if (diff !== 'easy') {
          // Prefer specials if CPU has many cards, prefer matching color
          const specials = playable.filter(i => SPECIALS.includes(s.cpuHand[i].value) || s.cpuHand[i].value.includes('+'))
          const matching = playable.filter(i => s.cpuHand[i].color === s.currentColor)
          if (s.cpuHand.length > 5 && specials.length) idx = specials[0]
          else if (matching.length) idx = matching[0]
        }

        const card = s.cpuHand[idx]
        const newCpu = s.cpuHand.filter((_, i) => i !== idx)
        if (newCpu.length === 0) return addLog('CPU wins!', { ...s, cpuHand: [], discardPile: [...s.discardPile, card], winner: 'cpu' })

        const color = card.color === 'black' ? COLORS[Math.floor(Math.random() * 4)] : card.color
        const effect = applyCardEffect(card, { ...s, cpuHand: newCpu }, color)
        const ns = { ...s, cpuHand: newCpu, drawPile: effect.drawPile, discardPile: [...s.discardPile, card], currentColor: effect.currentColor, direction: effect.direction, turn: 'player', status: 'Your turn!' }
        if (effect.skipNext) { ns.playerHand = [...s.playerHand, ...(effect.extraDraw||[])]; ns.status = `CPU played ${card.value}! You draw. Your turn.` }
        if (newCpu.length === 1) ns.status = '⚠️ CPU says UNO! ' + ns.status
        return addLog(`CPU played ${card.value}`, ns)
      })
    }, diff === 'easy' ? 1200 : 800)
    return () => clearTimeout(timer)
  }, [state.turn, state.winner, state.awaitingColor, diff])

  const { playerHand, cpuHand, discardPile, drawPile, currentColor, turn, status, winner, awaitingColor, log } = state
  const topCard = discardPile[discardPile.length - 1]

  return (
    <div className={styles.container}>
      {/* CPU hand */}
      <div className={styles.cpuArea}>
        <div className={styles.playerLabel}>🤖 CPU — {cpuHand.length} cards {cpuHand.length === 1 ? '⚠️ UNO!' : ''}</div>
        <div className={styles.cpuHand}>
          {cpuHand.map((_, i) => <UnoCard key={i} card={_} faceDown small />)}
        </div>
      </div>

      {/* Table */}
      <div className={styles.table}>
        {/* Draw pile */}
        <div className={styles.pileArea}>
          <div className={`${styles.card} ${styles.cardBack}`} onClick={drawCard} style={{ cursor: 'pointer' }}>
            <div className={styles.cardInner}><span className={styles.cardVal} style={{ fontSize: 11 }}>{drawPile.length}</span></div>
          </div>
          <div className={styles.pileLabel}>Draw</div>
        </div>

        {/* Status + color */}
        <div className={styles.tableCenter}>
          <div className={styles.colorIndicator} style={{ background: COLOR_HEX[currentColor], boxShadow: `0 0 20px ${COLOR_HEX[currentColor]}88` }}>
            <span className={styles.colorLabel}>{currentColor.toUpperCase()}</span>
          </div>
          <div className={styles.statusBubble}>{status}</div>
          {awaitingColor && <ColorPicker onPick={pickColor} />}
        </div>

        {/* Discard */}
        <div className={styles.pileArea}>
          {topCard && <UnoCard card={topCard} disabled />}
          <div className={styles.pileLabel}>Discard</div>
        </div>
      </div>

      {/* Player hand */}
      <div className={styles.playerArea}>
        <div className={styles.playerLabel}>🧑 You — {playerHand.length} cards {playerHand.length === 1 ? '⚠️ UNO!' : ''}</div>
        <div className={styles.playerHand}>
          {playerHand.map((card, i) => {
            const playable = turn === 'player' && !winner && !awaitingColor && canPlay(card, topCard, currentColor)
            return <UnoCard key={i} card={card} onClick={() => playCard(i)} disabled={!playable} />
          })}
        </div>
      </div>

      {/* Log */}
      <div className={styles.log}>
        {log.map((l, i) => <div key={i} className={styles.logLine}>{l}</div>)}
      </div>

      {/* Win overlay */}
      {winner && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>{winner === 'player' ? '🎉' : '🤖'}</div>
            <h2 style={{ color: winner === 'player' ? '#a78bfa' : '#ef4444' }}>
              {winner === 'player' ? 'UNO! You Win!' : 'CPU Wins!'}
            </h2>
            <button className={styles.resetBtn} onClick={() => setState(initState())}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}
