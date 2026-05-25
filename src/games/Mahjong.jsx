import { useState, useCallback } from 'react'
import styles from './Mahjong.module.css'

// ── Tile definitions ───────────────────────────────────────────────────────
const TILE_TYPES = [
  // Characters
  { id:'c1',glyph:'一',label:'1 Man',cat:'man',color:'#f87171' },
  { id:'c2',glyph:'二',label:'2 Man',cat:'man',color:'#f87171' },
  { id:'c3',glyph:'三',label:'3 Man',cat:'man',color:'#f87171' },
  { id:'c4',glyph:'四',label:'4 Man',cat:'man',color:'#f87171' },
  { id:'c5',glyph:'五',label:'5 Man',cat:'man',color:'#f87171' },
  { id:'c6',glyph:'六',label:'6 Man',cat:'man',color:'#f87171' },
  { id:'c7',glyph:'七',label:'7 Man',cat:'man',color:'#f87171' },
  { id:'c8',glyph:'八',label:'8 Man',cat:'man',color:'#f87171' },
  { id:'c9',glyph:'九',label:'9 Man',cat:'man',color:'#f87171' },
  // Bamboo
  { id:'b1',glyph:'🎋',label:'1 Bam',cat:'bam',color:'#4ade80' },
  { id:'b2',glyph:'🎍',label:'2 Bam',cat:'bam',color:'#4ade80' },
  { id:'b3',glyph:'③',label:'3 Bam',cat:'bam',color:'#4ade80' },
  { id:'b4',glyph:'④',label:'4 Bam',cat:'bam',color:'#4ade80' },
  { id:'b5',glyph:'⑤',label:'5 Bam',cat:'bam',color:'#4ade80' },
  { id:'b6',glyph:'⑥',label:'6 Bam',cat:'bam',color:'#4ade80' },
  { id:'b7',glyph:'⑦',label:'7 Bam',cat:'bam',color:'#4ade80' },
  { id:'b8',glyph:'⑧',label:'8 Bam',cat:'bam',color:'#4ade80' },
  { id:'b9',glyph:'⑨',label:'9 Bam',cat:'bam',color:'#4ade80' },
  // Circles
  { id:'d1',glyph:'①',label:'1 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d2',glyph:'②',label:'2 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d3',glyph:'③',label:'3 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d4',glyph:'④',label:'4 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d5',glyph:'⑤',label:'5 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d6',glyph:'⑥',label:'6 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d7',glyph:'⑦',label:'7 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d8',glyph:'⑧',label:'8 Pin',cat:'pin',color:'#60a5fa' },
  { id:'d9',glyph:'⑨',label:'9 Pin',cat:'pin',color:'#60a5fa' },
  // Winds
  { id:'we',glyph:'東',label:'East',  cat:'wind',color:'#e2e8f0' },
  { id:'ws',glyph:'南',label:'South', cat:'wind',color:'#e2e8f0' },
  { id:'ww',glyph:'西',label:'West',  cat:'wind',color:'#e2e8f0' },
  { id:'wn',glyph:'北',label:'North', cat:'wind',color:'#e2e8f0' },
  // Dragons
  { id:'dr',glyph:'中',label:'Chun',  cat:'dragon',color:'#ef4444' },
  { id:'dg',glyph:'發',label:'Hatsu', cat:'dragon',color:'#22c55e' },
  { id:'dw',glyph:'白',label:'Haku',  cat:'dragon',color:'#e2e8f0' },
  // Flowers (unique — match any flower)
  { id:'f1',glyph:'梅',label:'Plum',    cat:'flower',color:'#f472b6' },
  { id:'f2',glyph:'蘭',label:'Orchid',  cat:'flower',color:'#f472b6' },
  { id:'f3',glyph:'菊',label:'Chrysan', cat:'flower',color:'#f472b6' },
  { id:'f4',glyph:'竹',label:'Bamboo',  cat:'flower',color:'#f472b6' },
  // Seasons (unique — match any season)
  { id:'s1',glyph:'春',label:'Spring',  cat:'season',color:'#fb923c' },
  { id:'s2',glyph:'夏',label:'Summer',  cat:'season',color:'#fb923c' },
  { id:'s3',glyph:'秋',label:'Autumn',  cat:'season',color:'#fb923c' },
  { id:'s4',glyph:'冬',label:'Winter',  cat:'season',color:'#fb923c' },
]

const TYPE_MAP = Object.fromEntries(TILE_TYPES.map(t => [t.id, t]))

function canMatch(a, b) {
  if (a.typeId === b.typeId) return true
  const ta = TYPE_MAP[a.typeId], tb = TYPE_MAP[b.typeId]
  if (ta.cat === 'flower' && tb.cat === 'flower') return true
  if (ta.cat === 'season' && tb.cat === 'season') return true
  return false
}

// ── Classic turtle layout ──────────────────────────────────────────────────
// Each entry: [layer, col, row]  (col=x, row=y on a grid where each unit = half tile)
// Using the traditional 144-tile turtle layout
function buildLayout() {
  const positions = []

  // Layer 0: 8 rows × ~14 cols (the body)
  const body = [
    // row 0
    [0,2],[0,4],[0,6],[0,8],[0,10],[0,12],[0,14],[0,16],[0,18],[0,20],[0,22],[0,24],
    // row 1
    [1,0],[1,2],[1,4],[1,6],[1,8],[1,10],[1,12],[1,14],[1,16],[1,18],[1,20],[1,22],[1,24],[1,26],
    // row 2
    [2,0],[2,2],[2,4],[2,6],[2,8],[2,10],[2,12],[2,14],[2,16],[2,18],[2,20],[2,22],[2,24],[2,26],
    // row 3
    [3,0],[3,2],[3,4],[3,6],[3,8],[3,10],[3,12],[3,14],[3,16],[3,18],[3,20],[3,22],[3,24],[3,26],
    // row 4
    [4,0],[4,2],[4,4],[4,6],[4,8],[4,10],[4,12],[4,14],[4,16],[4,18],[4,20],[4,22],[4,24],[4,26],
    // row 5
    [5,0],[5,2],[5,4],[5,6],[5,8],[5,10],[5,12],[5,14],[5,16],[5,18],[5,20],[5,22],[5,24],[5,26],
    // row 6
    [6,2],[6,4],[6,6],[6,8],[6,10],[6,12],[6,14],[6,16],[6,18],[6,20],[6,22],[6,24],
    // row 7
    [7,2],[7,4],[7,6],[7,8],[7,10],[7,12],[7,14],[7,16],[7,18],[7,20],[7,22],[7,24],
    // Wings
    [3,-4],[3,-2],[4,-4],[4,-2],
    [3,28],[3,30],[4,28],[4,30],
  ]
  body.forEach(([r,c]) => positions.push([0, c, r]))

  // Layer 1
  const l1 = [
    [1,4],[1,6],[1,8],[1,10],[1,12],[1,14],[1,16],[1,18],[1,20],[1,22],
    [2,4],[2,6],[2,8],[2,10],[2,12],[2,14],[2,16],[2,18],[2,20],[2,22],
    [3,4],[3,6],[3,8],[3,10],[3,12],[3,14],[3,16],[3,18],[3,20],[3,22],
    [4,4],[4,6],[4,8],[4,10],[4,12],[4,14],[4,16],[4,18],[4,20],[4,22],
    [5,4],[5,6],[5,8],[5,10],[5,12],[5,14],[5,16],[5,18],[5,20],[5,22],
    [6,4],[6,6],[6,8],[6,10],[6,12],[6,14],[6,16],[6,18],[6,20],[6,22],
  ]
  l1.forEach(([r,c]) => positions.push([1, c, r]))

  // Layer 2
  const l2 = [
    [2,8],[2,10],[2,12],[2,14],[2,16],[2,18],
    [3,8],[3,10],[3,12],[3,14],[3,16],[3,18],
    [4,8],[4,10],[4,12],[4,14],[4,16],[4,18],
    [5,8],[5,10],[5,12],[5,14],[5,16],[5,18],
  ]
  l2.forEach(([r,c]) => positions.push([2, c, r]))

  // Layer 3
  const l3 = [
    [3,10],[3,12],[3,14],[3,16],
    [4,10],[4,12],[4,14],[4,16],
  ]
  l3.forEach(([r,c]) => positions.push([3, c, r]))

  // Layer 4 (top cap)
  positions.push([4, 13, 3])

  // Single on the far right (traditional)
  positions.push([0, 32, 3])
  positions.push([0, -8, 3])

  return positions.map(([layer, col, row], i) => ({ id: i, layer, col, row, typeId: null, removed: false }))
}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]] }
  return b
}

function assignTypes(tiles) {
  const n = tiles.length
  // Build pairs list
  const pairs = []
  const repeatable = TILE_TYPES.filter(t => t.cat !== 'flower' && t.cat !== 'season')
  const unique      = TILE_TYPES.filter(t => t.cat === 'flower' || t.cat === 'season')

  // Add all unique tiles once each
  unique.forEach(t => pairs.push(t.id, t.id))
  // Fill rest with pairs from repeatable
  let ri = 0
  while (pairs.length < n) {
    pairs.push(repeatable[ri % repeatable.length].id, repeatable[ri % repeatable.length].id)
    ri++
  }
  const shuffled = shuffle(pairs.slice(0, n))
  return tiles.map((t, i) => ({ ...t, typeId: shuffled[i] }))
}

function isBlocked(tile, tiles) {
  if (tile.removed) return true
  // Covered from above: any tile on layer+1 overlapping
  const covered = tiles.some(t =>
    !t.removed &&
    t.layer === tile.layer + 1 &&
    Math.abs(t.col - tile.col) < 2 &&
    Math.abs(t.row - tile.row) < 2
  )
  if (covered) return true
  // Sandwiched left AND right
  const hasLeft  = tiles.some(t => !t.removed && t.layer === tile.layer && t.row === tile.row && t.col === tile.col - 2)
  const hasRight = tiles.some(t => !t.removed && t.layer === tile.layer && t.row === tile.row && t.col === tile.col + 2)
  return hasLeft && hasRight
}

function findHints(tiles) {
  const free = tiles.filter(t => !t.removed && !isBlocked(t, tiles))
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (canMatch(free[i], free[j])) return [free[i].id, free[j].id]
    }
  }
  return null
}

function hasMovesLeft(tiles) {
  return findHints(tiles) !== null
}

// ── Tile Component ─────────────────────────────────────────────────────────
function MahjongTile({ tile, blocked, selected, hinted, onClick }) {
  const type = TYPE_MAP[tile.typeId]
  if (!type) return null

  return (
    <div
      className={[
        styles.tile,
        blocked  ? styles.tileBlocked  : styles.tileFree,
        selected ? styles.tileSelected : '',
        hinted   ? styles.tileHinted   : '',
      ].join(' ')}
      style={{
        '--tile-color': type.color,
        left: tile.col * 26 + tile.layer * 4,
        top:  tile.row * 34 + tile.layer * (-4),
        zIndex: tile.layer * 200 + tile.row * 2 + tile.col,
      }}
      onClick={!blocked ? onClick : undefined}
    >
      <div className={styles.tileBody}>
        <div className={styles.tileFace}>
          <span className={styles.tileGlyph} style={{ color: type.color }}>{type.glyph}</span>
          <span className={styles.tileCat}>{type.cat}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Mahjong() {
  const makeGame = () => assignTypes(buildLayout())

  const [tiles, setTiles]     = useState(makeGame)
  const [selected, setSelected] = useState(null)
  const [hintIds, setHintIds] = useState(null)
  const [pairs, setPairs]     = useState(0)
  const [moves, setMoves]     = useState(0)
  const [msg, setMsg]         = useState('Select two matching free tiles to remove them')
  const [won, setWon]         = useState(false)
  const [stuck, setStuck]     = useState(false)

  const total = Math.floor(tiles.length / 2)

  const clickTile = (tile) => {
    setHintIds(null)
    if (tile.removed || isBlocked(tile, tiles)) return

    if (selected?.id === tile.id) {
      setSelected(null); setMsg('Select a tile'); return
    }

    if (selected) {
      if (canMatch(selected, tile)) {
        const newTiles = tiles.map(t =>
          t.id === selected.id || t.id === tile.id ? { ...t, removed: true } : t
        )
        setTiles(newTiles)
        setSelected(null)
        setPairs(p => p + 1)
        setMoves(m => m + 1)
        const newPairs = pairs + 1
        if (newPairs >= total) { setWon(true); return }
        if (!hasMovesLeft(newTiles)) { setStuck(true); setMsg('No more moves!'); return }
        setMsg(`${total - newPairs} pairs remaining`)
      } else {
        setMsg("Those don't match — try again!")
        setSelected(tile)
      }
    } else {
      setSelected(tile)
      setMsg(`Selected ${TYPE_MAP[tile.typeId]?.label} — find its match`)
    }
  }

  const hint = () => {
    const h = findHints(tiles)
    if (h) { setHintIds(h); setMsg('Hint: matching tiles are highlighted!') }
    else setMsg('No hints available!')
  }

  const reset = () => {
    setTiles(makeGame()); setSelected(null); setHintIds(null)
    setPairs(0); setMoves(0); setWon(false); setStuck(false)
    setMsg('Select two matching free tiles to remove them')
  }

  const remaining = tiles.filter(t => !t.removed).length

  return (
    <div className={styles.container}>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statChip}>
          <span className={styles.statVal} style={{ color: '#a78bfa' }}>{pairs}</span>
          <span className={styles.statKey}>Pairs</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statVal} style={{ color: '#10b981' }}>{remaining}</span>
          <span className={styles.statKey}>Remaining</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statVal} style={{ color: '#f59e0b' }}>{moves}</span>
          <span className={styles.statKey}>Moves</span>
        </div>
      </div>

      {/* Message */}
      <div className={styles.msgBar}>{msg}</div>

      {/* Board */}
      <div className={styles.boardScroll}>
        <div className={styles.boardInner}>
          {tiles.filter(t => !t.removed).map(tile => (
            <MahjongTile
              key={tile.id}
              tile={tile}
              blocked={isBlocked(tile, tiles)}
              selected={selected?.id === tile.id}
              hinted={hintIds?.includes(tile.id)}
              onClick={() => clickTile(tile)}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button className={styles.hintBtn} onClick={hint}>💡 Hint</button>
        <button className={styles.shuffleBtn} onClick={() => {
          setTiles(t => {
            const active = t.filter(x => !x.removed)
            const types  = shuffle(active.map(x => x.typeId))
            return t.map(x => x.removed ? x : { ...x, typeId: types.splice(0,1)[0] })
          })
          setSelected(null); setHintIds(null); setMsg('Tiles reshuffled!')
          setStuck(false)
        }}>🔀 Shuffle</button>
        <button className={styles.resetBtn} onClick={reset}>↺ New Game</button>
      </div>

      {/* Win overlay */}
      {(won || stuck) && (
        <div className={styles.overlay}>
          <div className={styles.overlayBox}>
            <div className={styles.overlayEmoji}>{won ? '🎉' : '😮'}</div>
            <h2 className={styles.overlayTitle}>{won ? 'Board Cleared!' : 'No More Moves'}</h2>
            <p className={styles.overlaySub}>
              {won ? `Cleared in ${moves} moves` : `Cleared ${pairs} of ${total} pairs`}
            </p>
            <div className={styles.overlayBtns}>
              {!won && <button className={styles.shuffleBtn} onClick={() => {
                setTiles(t => {
                  const active = t.filter(x => !x.removed)
                  const types  = shuffle(active.map(x => x.typeId))
                  return t.map(x => x.removed ? x : { ...x, typeId: types.splice(0,1)[0] })
                })
                setSelected(null); setHintIds(null)
                setStuck(false); setMsg('Tiles reshuffled — keep going!')
              }}>🔀 Shuffle & Continue</button>}
              <button className={styles.resetBtn} onClick={reset}>↺ New Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
