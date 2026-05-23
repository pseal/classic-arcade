import styles from './DiffSelector.module.css'

const OPTIONS = [
  { v: 'easy',   label: 'Easy',   color: '#10b981' },
  { v: 'medium', label: 'Medium', color: '#f59e0b' },
  { v: 'hard',   label: 'Hard',   color: '#ef4444' },
]

export default function DiffSelector({ diff, setDiff }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Difficulty:</span>
      {OPTIONS.map(o => (
        <button
          key={o.v}
          className={styles.btn}
          onClick={() => setDiff(o.v)}
          style={{
            borderColor: diff === o.v ? o.color : 'rgba(255,255,255,0.2)',
            background:   diff === o.v ? `${o.color}22` : 'transparent',
            color:        diff === o.v ? o.color : 'rgba(255,255,255,0.5)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
