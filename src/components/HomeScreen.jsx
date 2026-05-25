import { GAMES } from '../games'
import styles from './HomeScreen.module.css'

const BADGES = {
  ttt:      { label: 'Classic',   color: '#a78bfa' },
  chess:    { label: 'Strategy',  color: '#fbbf24' },
  c4:       { label: 'Puzzle',    color: '#60a5fa' },
  snakes:   { label: 'Luck',      color: '#34d399' },
  ludo:     { label: '4 Player',  color: '#f87171' },
  cc:       { label: 'Strategy',  color: '#f472b6' },
  uno:      { label: 'Cards',     color: '#fb923c' },
  mahjong:  { label: 'Tiles',     color: '#c084fc' },
  solitaire:{ label: 'Solo',      color: '#2dd4bf' },
}

export default function HomeScreen({ onSelect }) {
  return (
    <div className={styles.bg}>
      <header className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.heroBlobA} />
          <div className={styles.heroBlobB} />
        </div>

        <div className={styles.logoWrap}>
          <span className={styles.logoEmoji}>🕹️</span>
          <span className={styles.logoBadge}>v2.0</span>
        </div>

        <h1 className={styles.title}>Classic Arcade</h1>
        <p className={styles.subtitle}>Nine games. Zero downloads. Infinite vibes.</p>

        <div className={styles.pills}>
          <span className={styles.pill}>🤖 Smart AI opponents</span>
          <span className={styles.pill}>⚡ Instant play</span>
          <span className={styles.pill}>🎯 3 difficulty levels</span>
          <span className={styles.pill}>🖥️ Fullscreen mode</span>
          <span className={styles.pill}>📱 Mobile friendly</span>
        </div>
      </header>

      <div className={styles.grid}>
        {GAMES.map(g => {
          const badge = BADGES[g.id] || { label: 'Game', color: g.color }
          return (
            <div
              key={g.id}
              className={styles.card}
              onClick={() => onSelect(g.id)}
              style={{ '--c': g.color }}
            >
              <div className={styles.cardNoise} />
              <div
                className={styles.cardAccent}
                style={{ background: `linear-gradient(90deg, ${g.color}, ${badge.color})` }}
              />

              <div className={styles.cardHeader}>
                <div
                  className={styles.cardIconWrap}
                  style={{ boxShadow: `0 0 24px ${g.color}30, inset 0 0 0 1px ${g.color}20` }}
                >
                  {g.icon}
                </div>
                <span
                  className={styles.cardBadge}
                  style={{ borderColor: `${badge.color}44`, color: badge.color, background: `${badge.color}10` }}
                >
                  {badge.label}
                </span>
              </div>

              <h3 className={styles.cardName} style={{ color: g.color }}>{g.name}</h3>
              <p className={styles.cardDesc}>{g.desc}</p>

              <div className={styles.cardFooter}>
                <button
                  className={styles.playBtn}
                  style={{
                    background: `linear-gradient(135deg, ${g.color}, ${g.color}99)`,
                    boxShadow: `0 4px 20px ${g.color}40`,
                  }}
                >
                  Play Now →
                </button>
                <div className={styles.cardMeta}>
                  {[g.color, badge.color, '#fff'].map((c, i) => (
                    <div key={i} className={styles.metaDot} style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <footer className={styles.footer}>
        Classic Arcade · Built with React + Vite · No signup needed
      </footer>
    </div>
  )
}
