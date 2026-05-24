import { GAMES } from '../games'
import styles from './HomeScreen.module.css'

const BADGES = {
  ttt:      { label: 'Classic',  color: '#6c63ff' },
  chess:    { label: 'Strategy', color: '#f59e0b' },
  c4:       { label: 'Puzzle',   color: '#3b82f6' },
  snakes:   { label: 'Luck',     color: '#10b981' },
  ludo:     { label: '4 Player', color: '#ef4444' },
  memory:   { label: 'Memory',   color: '#ec4899' },
  uno:      { label: 'Cards',    color: '#f97316' },
  mahjong:  { label: 'Tiles',    color: '#a855f7' },
  solitaire:{ label: 'Classic',  color: '#14b8a6' },
}

export default function HomeScreen({ onSelect }) {
  return (
    <div className={styles.bg}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.logo}>🎮</div>
        <h1 className={styles.title}>CLASSIC ARCADE</h1>
        <p className={styles.subtitle}>Nine timeless games. One destination.</p>
        <div className={styles.pills}>
          <span className={styles.pill}>🤖 CPU Opponents</span>
          <span className={styles.pill}>⚡ Instant Play</span>
          <span className={styles.pill}>🎯 3 Difficulty Levels</span>
          <span className={styles.pill}>📱 Mobile Ready</span>
        </div>
      </header>

      <div className={styles.grid}>
        {GAMES.map(g => {
          const badge = BADGES[g.id] || { label: 'Game', color: g.color }
          return (
            <div key={g.id} className={styles.card} onClick={() => onSelect(g.id)}
              style={{ '--card-color': g.color }}>
              <div className={styles.cardShine} />
              <div className={styles.cardTop}>
                <div className={styles.cardIcon} style={{ boxShadow: `0 0 20px ${g.color}33` }}>
                  {g.icon}
                </div>
                <span className={styles.cardBadge}
                  style={{ borderColor: `${badge.color}55`, color: badge.color, background: `${badge.color}11` }}>
                  {badge.label}
                </span>
              </div>
              <h3 className={styles.cardName} style={{ color: g.color }}>{g.name}</h3>
              <p className={styles.cardDesc}>{g.desc}</p>
              <div className={styles.cardFooter}>
                <button className={styles.playBtn}
                  style={{ background: `linear-gradient(135deg, ${g.color}dd, ${g.color}88)`, boxShadow: `0 4px 14px ${g.color}44` }}>
                  Play Now →
                </button>
                <div className={styles.cardDiff}>
                  {[1,2,3].map(i => <div key={i} className={styles.diffDot} style={{ background: g.color, opacity: i * 0.3 }} />)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <footer className={styles.footer}>
        CLASSIC ARCADE · Built with React + Vite · No account needed
      </footer>
    </div>
  )
}
