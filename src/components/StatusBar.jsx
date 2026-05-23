import styles from './StatusBar.module.css'

export default function StatusBar({ children, color }) {
  return (
    <div className={styles.bar} style={color ? { color } : {}}>
      {children}
    </div>
  )
}
