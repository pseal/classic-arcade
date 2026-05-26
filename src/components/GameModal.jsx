import { useState, useEffect, useRef, useCallback } from 'react'
import { GAMES } from '../games'
import DiffSelector from './DiffSelector'
import TicTacToe       from '../games/TicTacToe'
import Chess           from '../games/Chess'
import ConnectFour     from '../games/ConnectFour'
import SnakesLadders   from '../games/SnakesLadders'
import Ludo            from '../games/Ludo'
import ChineseCheckers from '../games/ChineseCheckers'
import Uno             from '../games/Uno'
import Mahjong         from '../games/Mahjong'
import Solitaire       from '../games/Solitaire'
import styles from './GameModal.module.css'

const GAME_MAP = {
  ttt: TicTacToe, chess: Chess, c4: ConnectFour,
  snakes: SnakesLadders, ludo: Ludo, cc: ChineseCheckers,
  uno: Uno, mahjong: Mahjong, solitaire: Solitaire,
}

const NO_DIFF = new Set(['mahjong', 'solitaire'])

export default function GameModal({ gameId, onClose }) {
  const [diff, setDiff] = useState('medium')
  const [isFS, setIsFS] = useState(false)
  const containerRef    = useRef(null)
  const game            = GAMES.find(g => g.id === gameId)
  const GameComponent   = GAME_MAP[gameId]

  const toggleFS = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  useEffect(() => {
    const cb = () => setIsFS(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  }, [])

  useEffect(() => {
    const cb = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) onClose() }
    window.addEventListener('keydown', cb)
    return () => window.removeEventListener('keydown', cb)
  }, [onClose])

  return (
    <div
      ref={containerRef}
      className={`${styles.overlay} ${isFS ? styles.overlayFS : ''}`}
      onClick={e => { if (e.target === e.currentTarget && !isFS) onClose() }}
    >
      <div className={`${styles.modal} ${isFS ? styles.modalFS : ''}`}>
        <div className={`${styles.modalInner} ${isFS ? styles.modalInnerFS : ''}`}>

          {/* Header — always visible, never pushed off screen */}
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>
              <div className={styles.modalIconWrap}
                style={{ boxShadow: `0 0 18px ${game?.color}44, inset 0 0 0 1px ${game?.color}22` }}>
                {game?.icon}
              </div>
              <h2 style={{ color: game?.color }}>{game?.name}</h2>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.fsBtn} onClick={toggleFS}>
                {isFS ? '⛶ Exit FS' : '⛶ Fullscreen'}
              </button>
              {!isFS && (
                <button className={styles.closeBtn} onClick={onClose}>✕ Close</button>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {!NO_DIFF.has(gameId) && (
            <div style={{ flexShrink: 0 }}>
              <DiffSelector diff={diff} setDiff={setDiff} color={game?.color} />
            </div>
          )}

          {/* Game area:
              - Normal mode: scrolls naturally
              - Fullscreen: scrolls vertically, centered horizontally,
                board stays at natural size, controls flow below
          */}
          <div className={isFS ? styles.gameAreaFS : styles.gameArea}>
            <div className={isFS ? styles.gameContentFS : ''}>
              {GameComponent
                ? <GameComponent diff={diff} />
                : <p className={styles.comingSoon}>Coming soon!</p>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
