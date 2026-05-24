import styles from './DiffSelector.module.css'

const OPTIONS = [
  { v: 'easy',   label: 'Easy',   color: '#10b981', icon: '🌿' },
  { v: 'medium', label: 'Medium', color: '#f59e0b', icon: '⚡' },
  { v: 'hard',   label: 'Hard',   color: '#ef4444', icon: '🔥' },
]

export default function DiffSelector({ diff, setDiff }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Difficulty</span>
      {OPTIONS.map(o => (
        <button key={o.v} className={styles.btn} onClick={() => setDiff(o.v)}
          style={{
            borderColor: diff === o.v ? `${o.color}66` : 'transparent',
            background:   diff === o.v ? `${o.color}18` : 'transparent',
            color:        diff === o.v ? o.color : 'rgba(255,255,255,0.35)',
          }}>
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  )
}
