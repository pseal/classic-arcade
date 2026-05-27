import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './Uno.module.css'

// ── Constants ──────────────────────────────────────────────────────────────
const CARD_COLORS  = ['red','yellow','green','blue']
const NUMBERS      = ['0','1','2','3','4','5','6','7','8','9']
const SPECIALS     = ['Skip','Reverse','+2']
const WILDS        = ['Wild','Wild+4']

const COLOR_HEX = {
  red:'#ef4444', yellow:'#eab308', green:'#22c55e',
  blue:'#3b82f6', black:'#4c1d95',
}

const PLAYERS = [
  { id:'you',    name:'You',    pos:'bottom', color:'#a78bfa', avatar:'🧑' },
  { id:'cpu1',   name:'CPU 1', pos:'left',   color:'#34d399', avatar:'🤖' },
  { id:'cpu2',   name:'CPU 2', pos:'top',    color:'#f87171', avatar:'🤖' },
  { id:'cpu3',   name:'CPU 3', pos:'right',  color:'#fbbf24', avatar:'🤖' },
]

function makeDeck() {
  const deck = []
  for (const color of CARD_COLORS) {
    deck.push({ color, value:'0' })
    for (const n of NUMBERS.slice(1)) { deck.push({ color, value:n }); deck.push({ color, value:n }) }
    for (const s of SPECIALS) { deck.push({ color, value:s }); deck.push({ color, value:s }) }
  }
  for (const w of WILDS) for (let i=0;i<4;i++) deck.push({ color:'black', value:w })
  return shuffle(deck)
}

function shuffle(a) {
  const b=[...a]
  for (let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]] }
  return b
}

function canPlay(card, topCard, currentColor) {
  if (card.color==='black') return true
  if (card.color===currentColor) return true
  if (card.value===topCard.value) return true
  return false
}

function initGame() {
  let deck = makeDeck()
  const hands = {}
  for (const p of PLAYERS) { hands[p.id] = deck.splice(0,7) }
  // First card must not be wild
  let topIdx = deck.findIndex(c => c.color !== 'black')
  const topCard = deck.splice(topIdx,1)[0]
  return {
    hands,
    drawPile: deck,
    discardPile: [topCard],
    currentColor: topCard.color,
    currentPlayerIdx: 0,   // 0=you, 1=cpu1, 2=cpu2, 3=cpu3
    direction: 1,           // 1=clockwise, -1=counter
    status: 'Your turn!',
    winner: null,
    awaitingColor: false,
    pendingWildPlayer: null,
    log: [],
    drawnCard: null,        // card just drawn, may be playable
  }
}

function nextPlayerIdx(currentIdx, direction, skip=false) {
  const step = skip ? direction * 2 : direction
  return ((currentIdx + step) % 4 + 4) % 4
}

// ── Card Component ─────────────────────────────────────────────────────────
function UnoCard({ card, onClick, playable, selected, faceDown, tiny, horizontal }) {
  if (faceDown) return (
    <div className={`${styles.card} ${styles.cardBack} ${tiny?styles.cardTiny:''} ${horizontal?styles.cardH:''}`}/>
  )
  const isWild = card.color==='black'
  return (
    <div
      className={[
        styles.card,
        playable ? styles.cardPlayable : styles.cardDim,
        selected ? styles.cardSelected : '',
        tiny ? styles.cardTiny : '',
        horizontal ? styles.cardH : '',
      ].join(' ')}
      style={{
        background: isWild
          ? 'linear-gradient(135deg,#ef4444 25%,#eab308 25%,#eab308 50%,#22c55e 50%,#22c55e 75%,#3b82f6 75%)'
          : COLOR_HEX[card.color],
        boxShadow: playable ? `0 4px 16px ${isWild?'rgba(124,58,237,0.5)':COLOR_HEX[card.color]+'88'}` : 'none',
      }}
      onClick={playable ? onClick : undefined}
    >
      <div className={styles.cardInner}>
        <span className={styles.cardVal}>{isWild?'🌈':card.value}</span>
      </div>
      <div className={styles.cornerTL}>{isWild?'W':card.value}</div>
      <div className={styles.cornerBR}>{isWild?'W':card.value}</div>
    </div>
  )
}

// ── Color Picker ───────────────────────────────────────────────────────────
function ColorPicker({ onPick }) {
  return (
    <div className={styles.colorPicker}>
      <p className={styles.pickerLabel}>Choose a color</p>
      <div className={styles.pickerBtns}>
        {CARD_COLORS.map(c=>(
          <button key={c} className={styles.pickerBtn}
            style={{ background:COLOR_HEX[c], boxShadow:`0 4px 14px ${COLOR_HEX[c]}77` }}
            onClick={()=>onPick(c)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Player Panel ───────────────────────────────────────────────────────────
function PlayerPanel({ player, hand, isActive, isYou, direction }) {
  const count = hand?.length || 0
  return (
    <div className={`${styles.panel} ${isActive?styles.panelActive:''}`}
      style={{ '--pc': player.color }}>
      <div className={styles.panelAvatar}>{player.avatar}</div>
      <div className={styles.panelInfo}>
        <div className={styles.panelName} style={{ color: player.color }}>{player.name}</div>
        <div className={styles.panelCount}>{count} card{count!==1?'s':''}{count===1?' 🔔 UNO!':''}</div>
      </div>
      {isActive && <div className={styles.panelTurnDot} style={{ background: player.color }}/>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Uno({ diff='medium' }) {
  const [game, setGame]       = useState(initGame)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const processingRef         = useRef(false)

  const addLog = useCallback((msg, g) => ({
    ...g, log: [msg, ...(g.log||[])].slice(0,8)
  }), [])

  // ── Apply a card play ──
  const applyPlay = useCallback((g, playerId, cardIdx, chosenColor=null) => {
    const playerIdx = PLAYERS.findIndex(p=>p.id===playerId)
    const hand = [...g.hands[playerId]]
    const card = hand[cardIdx]
    hand.splice(cardIdx,1)

    let { drawPile, discardPile, currentColor, direction } = g
    discardPile = [...discardPile, card]
    currentColor = card.color==='black' ? chosenColor : card.color

    // Check win
    if (hand.length===0) {
      return addLog(`${PLAYERS[playerIdx].name} wins! 🎉`, {
        ...g, hands:{...g.hands,[playerId]:hand},
        drawPile, discardPile, currentColor, direction,
        winner: playerId, status:`${PLAYERS[playerIdx].name} wins!`
      })
    }

    let skip=false
    // Reverse
    if (card.value==='Reverse') {
      direction = -direction
      // In 4-player, Reverse just changes direction (no skip)
    }
    // Skip
    if (card.value==='Skip') skip=true
    // +2
    let extraDraw = []
    if (card.value==='+2') {
      skip=true
      const nextIdx = nextPlayerIdx(playerIdx, direction)
      const nextId  = PLAYERS[nextIdx].id
      extraDraw = drawPile.slice(0,2)
      drawPile  = drawPile.slice(2)
      const nextHand = [...g.hands[nextId], ...extraDraw]
      g = { ...g, hands: { ...g.hands, [nextId]: nextHand } }
    }
    // Wild+4
    if (card.value==='Wild+4') {
      skip=true
      const nextIdx = nextPlayerIdx(playerIdx, direction)
      const nextId  = PLAYERS[nextIdx].id
      extraDraw = drawPile.slice(0,4)
      drawPile  = drawPile.slice(4)
      const nextHand = [...g.hands[nextId], ...extraDraw]
      g = { ...g, hands: { ...g.hands, [nextId]: nextHand } }
    }

    const nextIdx = nextPlayerIdx(playerIdx, direction, skip)
    const nextPlayer = PLAYERS[nextIdx]
    const unoWarning = hand.length===1 ? ` (${PLAYERS[playerIdx].name}: UNO!)` : ''

    return addLog(`${PLAYERS[playerIdx].name} played ${card.value}${chosenColor?' → '+chosenColor:''}${unoWarning}`, {
      ...g,
      hands: { ...g.hands, [playerId]: hand },
      drawPile, discardPile, currentColor, direction,
      currentPlayerIdx: nextIdx,
      status: nextPlayer.id==='you' ? 'Your turn!' : `${nextPlayer.name} is thinking...`,
      drawnCard: null,
    })
  }, [addLog])

  // ── Player draws ──
  const drawCard = () => {
    const g = game
    if (g.currentPlayerIdx!==0||g.winner||g.awaitingColor||processingRef.current) return
    if (!g.drawPile.length) return
    const card = g.drawPile[0]
    const newHand = [...g.hands.you, card]
    const playable = canPlay(card, g.discardPile[g.discardPile.length-1], g.currentColor)
    setGame(prev=>({
      ...prev,
      hands: { ...prev.hands, you: newHand },
      drawPile: prev.drawPile.slice(1),
      drawnCard: playable ? card : null,
      status: playable ? 'You drew — you can play it!' : 'Drew a card — turn passes.',
    }))
    if (!playable) {
      // Pass to next player
      setTimeout(()=>{
        setGame(prev=>({
          ...prev,
          drawnCard: null,
          currentPlayerIdx: nextPlayerIdx(0, prev.direction),
          status: `${PLAYERS[nextPlayerIdx(0,game.direction)].name} is thinking...`,
        }))
      }, 800)
    }
    setSelectedIdx(null)
  }

  // ── Player plays a card ──
  const playCard = (cardIdx) => {
    const g = game
    if (g.currentPlayerIdx!==0||g.winner||g.awaitingColor||processingRef.current) return
    const card = g.hands.you[cardIdx]
    const topCard = g.discardPile[g.discardPile.length-1]
    if (!canPlay(card, topCard, g.currentColor)) return

    if (card.color==='black') {
      // Need color pick
      const newHand = g.hands.you.filter((_,i)=>i!==cardIdx)
      setGame(prev=>({
        ...prev,
        hands:{...prev.hands, you:newHand},
        discardPile:[...prev.discardPile, card],
        awaitingColor: true,
        pendingWildCard: card,
        status: 'Choose a color!',
        drawnCard: null,
      }))
      setSelectedIdx(null)
      return
    }

    setSelectedIdx(null)
    setGame(prev => applyPlay(prev, 'you', cardIdx))
  }

  // ── Player picks wild color ──
  const pickColor = (color) => {
    setGame(prev => {
      const card = prev.pendingWildCard
      let g = { ...prev, awaitingColor:false, pendingWildCard:null, currentColor:color }
      // Apply effects (skip/draw) for the wild
      let { drawPile, direction } = g
      let skip=false
      if (card.value==='Wild+4') {
        skip=true
        const nextIdx = nextPlayerIdx(0, direction)
        const nextId  = PLAYERS[nextIdx].id
        const extra   = drawPile.slice(0,4)
        drawPile      = drawPile.slice(4)
        g = { ...g, drawPile, hands: { ...g.hands, [nextId]: [...g.hands[nextId], ...extra] } }
      }
      const nextIdx = nextPlayerIdx(0, direction, skip)
      const nextPlayer = PLAYERS[nextIdx]
      return addLog(`You played Wild → ${color}`, {
        ...g,
        currentPlayerIdx: nextIdx,
        status: nextPlayer.id==='you' ? 'Your turn!' : `${nextPlayer.name} is thinking...`,
      })
    })
  }

  // ── CPU turn ──
  useEffect(()=>{
    const g = game
    if (g.currentPlayerIdx===0||g.winner||g.awaitingColor) return
    if (processingRef.current) return
    processingRef.current = true

    const delay = diff==='easy'?1400:900
    const timer = setTimeout(()=>{
      setGame(prev=>{
        if (prev.currentPlayerIdx===0||prev.winner) { processingRef.current=false; return prev }
        const playerIdx = prev.currentPlayerIdx
        const player    = PLAYERS[playerIdx]
        const hand      = prev.hands[player.id]
        const topCard   = prev.discardPile[prev.discardPile.length-1]

        const playable  = hand.map((c,i)=>canPlay(c,topCard,prev.currentColor)?i:null).filter(i=>i!==null)

        if (!playable.length) {
          // Draw
          if (!prev.drawPile.length) {
            const nextIdx = nextPlayerIdx(playerIdx,prev.direction)
            processingRef.current=false
            return addLog(`${player.name} passed`,{
              ...prev,
              currentPlayerIdx:nextIdx,
              status:PLAYERS[nextIdx].id==='you'?'Your turn!':`${PLAYERS[nextIdx].name} is thinking...`
            })
          }
          const card    = prev.drawPile[0]
          const newHand = [...hand, card]
          const newDraw = prev.drawPile.slice(1)
          // Can play drawn card?
          if (canPlay(card,topCard,prev.currentColor)) {
            let g2 = { ...prev, hands:{...prev.hands,[player.id]:newHand}, drawPile:newDraw }
            const color = card.color==='black' ? CARD_COLORS[Math.floor(Math.random()*4)] : card.color
            processingRef.current=false
            return applyPlay(g2, player.id, newHand.length-1, color)
          }
          const nextIdx = nextPlayerIdx(playerIdx,prev.direction)
          processingRef.current=false
          return addLog(`${player.name} drew a card`,{
            ...prev,
            hands:{...prev.hands,[player.id]:newHand},
            drawPile:newDraw,
            currentPlayerIdx:nextIdx,
            status:PLAYERS[nextIdx].id==='you'?'Your turn!':`${PLAYERS[nextIdx].name} is thinking...`
          })
        }

        // Pick best card
        let idx=playable[0]
        if (diff!=='easy') {
          // Prefer: finishing > +4 > +2 > skip > reverse > high numbers
          const score = i => {
            const c=hand[i]
            if (c.value==='Wild+4') return 100
            if (c.value==='+2')     return 80
            if (c.value==='Skip')   return 60
            if (c.value==='Wild')   return 50
            if (c.value==='Reverse')return 40
            const n=parseInt(c.value)
            return isNaN(n)?20:n
          }
          idx=playable.reduce((best,i)=>score(i)>score(best)?i:best,playable[0])
          if (diff==='medium'&&Math.random()<0.3) idx=playable[Math.floor(Math.random()*playable.length)]
        }

        const card   = hand[idx]
        const color  = card.color==='black' ? CARD_COLORS[Math.floor(Math.random()*4)] : card.color
        processingRef.current=false
        return applyPlay(prev, player.id, idx, color)
      })
    }, delay)

    return ()=>{ clearTimeout(timer); processingRef.current=false }
  },[game.currentPlayerIdx, game.winner, game.awaitingColor, diff, applyPlay, addLog])

  // ── Render ──
  const { hands, discardPile, drawPile, currentColor, currentPlayerIdx,
          status, winner, awaitingColor, log, drawnCard } = game
  const topCard   = discardPile[discardPile.length-1]
  const isMyTurn  = currentPlayerIdx===0 && !winner && !awaitingColor

  return (
    <div className={styles.container}>

      {/* Top player (CPU2) */}
      <div className={styles.topArea}>
        <PlayerPanel player={PLAYERS[2]} hand={hands.cpu2} isActive={currentPlayerIdx===2} />
        <div className={styles.cpuHandTop}>
          {hands.cpu2.map((_,i)=>(
            <div key={i} className={styles.cpuCardTop}/>
          ))}
        </div>
      </div>

      {/* Middle row: left CPU | table | right CPU */}
      <div className={styles.middleRow}>

        {/* Left (CPU1) */}
        <div className={styles.sideArea}>
          <PlayerPanel player={PLAYERS[1]} hand={hands.cpu1} isActive={currentPlayerIdx===1} />
          <div className={styles.cpuHandLeft}>
            {hands.cpu1.map((_,i)=>(
              <div key={i} className={styles.cpuCardSide}/>
            ))}
          </div>
        </div>

        {/* Center table */}
        <div className={styles.table}>
          {/* Color indicator */}
          <div className={styles.colorRing}
            style={{ background:COLOR_HEX[currentColor], boxShadow:`0 0 24px ${COLOR_HEX[currentColor]}88` }}>
            <span className={styles.colorLabel}>{currentColor?.toUpperCase()}</span>
          </div>

          {/* Discard */}
          <div className={styles.pileWrap}>
            <UnoCard card={topCard} />
            <span className={styles.pileLabel}>Discard</span>
          </div>

          {/* Draw */}
          <div className={styles.pileWrap} onClick={isMyTurn ? drawCard : undefined}
            style={{ cursor: isMyTurn?'pointer':'default' }}>
            <div className={`${styles.card} ${styles.cardBack} ${isMyTurn?styles.cardPlayable:''}`}
              style={{ position:'relative' }}>
              <span style={{ position:'absolute', bottom:4, right:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)' }}>{drawPile.length}</span>
            </div>
            <span className={styles.pileLabel}>Draw</span>
          </div>

          {/* Status */}
          <div className={styles.statusBubble}
            style={{ color: winner?'#fbbf24':awaitingColor?'#f472b6':'rgba(255,255,255,0.7)' }}>
            {status}
          </div>

          {/* Wild color picker */}
          {awaitingColor && <ColorPicker onPick={pickColor}/>}

          {/* Turn arrow */}
          <div className={styles.dirArrow}>
            {game.direction===1 ? '↻ Clockwise' : '↺ Counter'}
          </div>
        </div>

        {/* Right (CPU3) */}
        <div className={styles.sideArea}>
          <PlayerPanel player={PLAYERS[3]} hand={hands.cpu3} isActive={currentPlayerIdx===3} />
          <div className={styles.cpuHandRight}>
            {hands.cpu3.map((_,i)=>(
              <div key={i} className={styles.cpuCardSide}/>
            ))}
          </div>
        </div>
      </div>

      {/* Player hand (bottom) */}
      <div className={styles.bottomArea}>
        <PlayerPanel player={PLAYERS[0]} hand={hands.you} isActive={currentPlayerIdx===0} isYou />
        <div className={styles.playerHand}>
          {hands.you.map((card,i)=>{
            const playable = isMyTurn && canPlay(card,topCard,currentColor)
            return (
              <UnoCard key={i} card={card}
                playable={playable}
                selected={selectedIdx===i}
                onClick={()=>{ if(playable){ setSelectedIdx(i); playCard(i) } }}
              />
            )
          })}
        </div>
      </div>

      {/* Log */}
      <div className={styles.log}>
        {log.map((l,i)=>(
          <div key={i} className={styles.logLine} style={{ opacity:1-i*0.15 }}>{l}</div>
        ))}
      </div>

      {/* Winner overlay */}
      {winner && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>{winner==='you'?'🎉':'🤖'}</div>
            <h2 className={styles.winTitle} style={{ color:winner==='you'?'#a78bfa':'#f87171' }}>
              {winner==='you'?'UNO! You Win!': `${PLAYERS.find(p=>p.id===winner)?.name} Wins!`}
            </h2>
            <button className={styles.winBtn} onClick={()=>{ processingRef.current=false; setGame(initGame()); setSelectedIdx(null) }}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
