import { useState, useCallback } from 'react'
import styles from './Mahjong.module.css'

// ── Tiles ─────────────────────────────────────────────────────────────────
const TILE_SETS = [
  // Characters (万)
  ...['1万','2万','3万','4万','5万','6万','7万','8万','9万'],
  // Bamboo (竹)
  ...['1竹','2竹','3竹','4竹','5竹','6竹','7竹','8竹','9竹'],
  // Circles (筒)
  ...['1●','2●','3●','4●','5●','6●','7●','8●','9●'],
  // Winds
  '東','南','西','北',
  // Dragons
  '中','發','白',
  // Flowers (unique)
  '梅','蘭','菊','竹花',
  // Seasons (unique)
  '春','夏','秋','冬',
]

// Standard turtle layout [layer, row, col]
// Each entry: position in 3D space
function buildLayout() {
  const tiles = []
  let id = 0

  const place = (layer, row, col) => tiles.push({ id: id++, layer, row, col, tileType: null, faceUp: true, removed: false })

  // Layer 0 (bottom) — 8×6 grid mostly
  const l0 = [
    [0,0],[0,2],[0,4],[0,6],[0,8],[0,10],[0,12],[0,14],
    [1,0],[1,2],[1,4],[1,6],[1,8],[1,10],[1,12],[1,14],
    [2,0],[2,2],[2,4],[2,6],[2,8],[2,10],[2,12],[2,14],
    [3,0],[3,2],[3,4],[3,6],[3,8],[3,10],[3,12],[3,14],
    [4,0],[4,2],[4,4],[4,6],[4,8],[4,10],[4,12],[4,14],
    [5,0],[5,2],[5,4],[5,6],[5,8],[5,10],[5,12],[5,14],
    // Extra row
    [2,-2],[3,-2],[2,16],[3,16],
  ]
  l0.forEach(([r,c]) => place(0, r, c))

  // Layer 1
  const l1 = [
    [0,2],[0,4],[0,6],[0,8],[0,10],[0,12],
    [1,2],[1,4],[1,6],[1,8],[1,10],[1,12],
    [2,2],[2,4],[2,6],[2,8],[2,10],[2,12],
    [3,2],[3,4],[3,6],[3,8],[3,10],[3,12],
    [4,2],[4,4],[4,6],[4,8],[4,10],[4,12],
    [5,2],[5,4],[5,6],[5,8],[5,10],[5,12],
  ]
  l1.forEach(([r,c]) => place(1, r, c))

  // Layer 2
  const l2 = [
    [1,4],[1,6],[1,8],[1,10],
    [2,4],[2,6],[2,8],[2,10],
    [3,4],[3,6],[3,8],[3,10],
    [4,4],[4,6],[4,8],[4,10],
  ]
  l2.forEach(([r,c]) => place(2, r, c))

  // Layer 3 (top)
  const l3 = [[2,6],[2,8],[3,6],[3,8]]
  l3.forEach(([r,c]) => place(3, r, c))

  // Single top cap
  place(4, 2.5, 7)

  return tiles
}

function assignTiles(positions) {
  const count = positions.length
  // Build pairs
  const types = []
  for (let i = 0; i < Math.floor(count / 2); i++) {
    const t = TILE_SETS[i % TILE_SETS.length]
    types.push(t, t)
  }
  if (count % 2 !== 0) types.push(TILE_SETS[0])
  // Shuffle
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[types[i],types[j]]=[types[j],types[i]] }
  return positions.map((p, i) => ({ ...p, tileType: types[i] }))
}

function isBlocked(tile, tiles) {
  if (tile.removed) return true
  // Left or right blocked
  const hasLeft  = tiles.some(t => !t.removed && t.layer === tile.layer && Math.abs(t.row - tile.row) < 1.5 && t.col === tile.col - 2)
  const hasRight = tiles.some(t => !t.removed && t.layer === tile.layer && Math.abs(t.row - tile.row) < 1.5 && t.col === tile.col + 2)
  if (hasLeft && hasRight) return true
  // Covered from above
  const hasCover = tiles.some(t => !t.removed && t.layer === tile.layer + 1 && Math.abs(t.row - tile.row) < 1.5 && Math.abs(t.col - tile.col) < 2)
  return hasCover
}

function canMatch(a, b) {
  if (a.tileType === b.tileType) return true
  // Flowers match each other, seasons match each other
  const flowers = ['梅','蘭','菊','竹花']
  const seasons = ['春','夏','秋','冬']
  if (flowers.includes(a.tileType) && flowers.includes(b.tileType)) return true
  if (seasons.includes(a.tileType) && seasons.includes(b.tileType)) return true
  return false
}

function tileColor(type) {
  if (!type) return '#888'
  if (['中','發','白'].includes(type)) return '#22c55e'
  if (['東','南','西','北'].includes(type)) return '#3b82f6'
  if (['梅','蘭','菊','竹花'].includes(type)) return '#ec4899'
  if (['春','夏','秋','冬'].includes(type)) return '#f59e0b'
  if (type.includes('万')) return '#ef4444'
  if (type.includes('竹')) return '#10b981'
  return '#a78bfa'
}

export default function Mahjong() {
  const [tiles, setTiles]   = useState(() => assignTiles(buildLayout()))
  const [selected, setSelected] = useState(null)
  const [moves, setMoves]   = useState(0)
  const [pairs, setPairs]   = useState(0)
  const [message, setMessage] = useState('Select matching tiles to remove them')
  const [won, setWon]       = useState(false)
  const [noMoves, setNoMoves] = useState(false)

  const totalPairs = Math.floor(tiles.length / 2)

  const checkNoMoves = (tileList) => {
    const free = tileList.filter(t => !t.removed && !isBlocked(t, tileList))
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) return false
      }
    }
    return true
  }

  const clickTile = (tile) => {
    if (tile.removed || isBlocked(tile, tiles)) return
    if (selected?.id === tile.id) { setSelected(null); return }

    if (selected) {
      if (canMatch(selected, tile)) {
        const newTiles = tiles.map(t =>
          t.id === selected.id || t.id === tile.id ? { ...t, removed: true } : t
        )
        setTiles(newTiles)
        setSelected(null)
        setMoves(m => m + 1)
        const newPairs = pairs + 1
        setPairs(newPairs)
        if (newPairs === totalPairs) { setWon(true); setMessage('🎉 You cleared the board!'); return }
        if (checkNoMoves(newTiles)) { setNoMoves(true); setMessage('No more moves available.') }
        else setMessage(`${totalPairs - newPairs} pairs remaining`)
      } else {
        setMessage('Tiles don\'t match — try again!')
        setSelected(tile)
      }
    } else {
      setSelected(tile)
      setMessage('Now select a matching tile')
    }
  }

  const reset = () => {
    setTiles(assignTiles(buildLayout()))
    setSelected(null); setMoves(0); setPairs(0)
    setMessage('Select matching tiles to remove them')
    setWon(false); setNoMoves(false)
  }

  const hint = () => {
    const free = tiles.filter(t => !t.removed && !isBlocked(t, tiles))
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) {
          setSelected(free[i])
          setMessage(`Hint: try ${free[i].tileType} ↔ ${free[j].tileType}`)
          return
        }
      }
    }
    setMessage('No hints available!')
  }

  // Render: group by layer for proper z-ordering
  const visibleTiles = tiles.filter(t => !t.removed)
  const maxCol = Math.max(...visibleTiles.map(t => t.col)) + 2
  const maxRow = Math.max(...visibleTiles.map(t => t.row)) + 1

  const CELL_W = 44, CELL_H = 52, OFFSET = 3

  return (
    <div className={styles.container}>
      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}><span className={styles.statN}>{pairs}</span><span className={styles.statL}>Pairs</span></div>
        <div className={styles.statMsg}>{message}</div>
        <div className={styles.stat}><span className={styles.statN} style={{ color: '#f59e0b' }}>{moves}</span><span className={styles.statL}>Moves</span></div>
      </div>

      {/* Board */}
      <div className={styles.boardWrap}>
        <div className={styles.board} style={{ width: (maxCol/2 + 1) * CELL_W + 20, height: (maxRow + 1) * CELL_H + 20 }}>
          {[0,1,2,3,4].map(layer =>
            visibleTiles.filter(t => t.layer === layer).map(tile => {
              const blocked = isBlocked(tile, tiles)
              const isSel   = selected?.id === tile.id
              const color   = tileColor(tile.tileType)
              const x = (tile.col / 2) * CELL_W + layer * OFFSET + 10
              const y = tile.row * (CELL_H * 0.62) + layer * (-OFFSET) + 10

              return (
                <div key={tile.id}
                  className={`${styles.tile} ${blocked ? styles.tileBlocked : styles.tileFree} ${isSel ? styles.tileSelected : ''}`}
                  style={{
                    left: x, top: y,
                    zIndex: layer * 100 + Math.floor(tile.row) + Math.floor(tile.col),
                    borderColor: isSel ? '#fff' : `${color}55`,
                    boxShadow: isSel ? `0 0 0 2px #fff, 0 4px 20px ${color}88` : blocked ? 'none' : `0 2px 8px rgba(0,0,0,0.4)`,
                  }}
                  onClick={() => clickTile(tile)}
                >
                  <div className={styles.tileInner} style={{ background: blocked ? 'rgba(255,255,255,0.04)' : `${color}18`, borderColor: `${color}33` }}>
                    <span className={styles.tileChar} style={{ color: blocked ? 'rgba(255,255,255,0.2)' : color }}>
                      {tile.tileType}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button className={styles.hintBtn} onClick={hint}>💡 Hint</button>
        <button className={styles.resetBtn} onClick={reset}>New Game</button>
      </div>

      {/* Win / No-moves overlay */}
      {(won || noMoves) && (
        <div className={styles.winOverlay}>
          <div className={styles.winBox}>
            <div className={styles.winEmoji}>{won ? '🎉' : '😔'}</div>
            <h2>{won ? 'Board Cleared!' : 'No More Moves'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              {won ? `Completed in ${moves} moves` : `Cleared ${pairs} of ${totalPairs} pairs`}
            </p>
            <button className={styles.resetBtn} onClick={reset}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}
