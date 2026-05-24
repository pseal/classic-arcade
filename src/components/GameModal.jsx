import { useState } from 'react'
import { GAMES } from '../games'
import DiffSelector from './DiffSelector'
import TicTacToe   from '../games/TicTacToe'
import Chess        from '../games/Chess'
import ConnectFour  from '../games/ConnectFour'
import SnakesLadders from '../games/SnakesLadders'
import Ludo         from '../games/Ludo'
import MemoryMatch  from '../games/MemoryMatch'
import Uno          from '../games/Uno'
import Mahjong      from '../games/Mahjong'
import Solitaire    from '../games/Solitaire'
import styles from './GameModal.module.css'

const GAME_MAP = {
  ttt: TicTacToe, chess: Chess, c4: ConnectFour,
  snakes: SnakesLadders, ludo: Ludo, memory: MemoryMatch,
  uno: Uno, mahjong: Mahjong, solitaire: Solitaire,
}

// Games where difficulty doesn't apply
const NO_DIFF = new Set(['mahjong','solitaire'])

export default function GameModal({ gameId, onClose }) {
  const [diff, setDiff] = useState('medium')
  const game = GAMES.find(g => g.id === gameId)
  const GameComponent = GAME_MAP[gameId]

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <div className={styles.modalIconWrap} style={{ boxShadow: `0 0 16px ${game?.color}44` }}>
              {game?.icon}
            </div>
            <h2 style={{ color: game?.color }}>{game?.name}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕ Close</button>
        </div>
        <div className={styles.divider} />
        {!NO_DIFF.has(gameId) && <DiffSelector diff={diff} setDiff={setDiff} />}
        <div className={styles.gameArea}>
          {GameComponent ? <GameComponent diff={diff} /> : <p className={styles.comingSoon}>Coming soon!</p>}
        </div>
      </div>
    </div>
  )
}
