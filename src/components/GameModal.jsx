import { useState } from 'react'
import { GAMES } from '../games'
import DiffSelector from './DiffSelector'
import TicTacToe from '../games/TicTacToe'
import Chess from '../games/Chess'
import ConnectFour from '../games/ConnectFour'
import SnakesLadders from '../games/SnakesLadders'
import Ludo from '../games/Ludo'
import MemoryMatch from '../games/MemoryMatch'
import styles from './GameModal.module.css'

const GAME_MAP = {
  ttt: TicTacToe,
  chess: Chess,
  c4: ConnectFour,
  snakes: SnakesLadders,
  ludo: Ludo,
  memory: MemoryMatch,
}

export default function GameModal({ gameId, onClose }) {
  const [diff, setDiff] = useState('medium')
  const game = GAMES.find(g => g.id === gameId)
  const GameComponent = GAME_MAP[gameId]

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span className={styles.modalIcon}>{game?.icon}</span>
            <h2 style={{ color: game?.color }}>{game?.name}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕ Close</button>
        </div>

        <DiffSelector diff={diff} setDiff={setDiff} />

        <div className={styles.gameArea}>
          {GameComponent
            ? <GameComponent diff={diff} />
            : <p className={styles.comingSoon}>Coming soon!</p>
          }
        </div>
      </div>
    </div>
  )
}
