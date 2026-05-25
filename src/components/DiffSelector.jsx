import styles from './DiffSelector.module.css'

const OPTIONS = [
  { v:'easy',   label:'Easy',   icon:'🌿', color:'#34d399' },
  { v:'medium', label:'Medium', icon:'⚡', color:'#fbbf24' },
  { v:'hard',   label:'Hard',   icon:'🔥', color:'#f87171' },
]

export default function DiffSelector({ diff, setDiff, color }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Difficulty</span>
      <div className={styles.pills}>
        {OPTIONS.map(o => (
          <button key={o.v} className={`${styles.pill} ${diff===o.v ? styles.active : ''}`}
            onClick={() => setDiff(o.v)}
            style={diff===o.v ? {
              background: `${o.color}18`,
              borderColor: `${o.color}55`,
              color: o.color,
              boxShadow: `0 0 14px ${o.color}25`,
            } : {}}>
            <span className={styles.pillIcon}>{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
