import { GAMES } from '../games'
import styles from './HomeScreen.module.css'

export default function HomeScreen({ onSelect }) {
  return (
    <div className={styles.bg}>
      <header className={styles.header}>
        <div className={styles.logo}>🎮</div>
        <h1 className={styles.title}>CLASSIC ARCADE</h1>
        <p className={styles.subtitle}>6 games · CPU opponents · Easy / Medium / Hard</p>
      </header>

      <div className={styles.grid}>
        {GAMES.map(g => (
          <div
            key={g.id}
            className={styles.card}
            style={{ borderColor: `${g.color}44` }}
            onClick={() => onSelect(g.id)}
          >
            <div className={styles.cardIcon}>{g.icon}</div>
            <h3 className={styles.cardName} style={{ color: g.color }}>{g.name}</h3>
            <p className={styles.cardDesc}>{g.desc}</p>
            <button
              className={styles.playBtn}
              style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}bb)` }}
            >
              Play Now →
            </button>
          </div>
        ))}
      </div>

      <footer className={styles.footer}>
        Classic Arcade · Built with React + Vite
      </footer>
    </div>
  )
}
