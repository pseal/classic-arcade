import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import GameModal from './components/GameModal'

export default function App() {
  const [activeGame, setActiveGame] = useState(null)

  return (
    <>
      <HomeScreen onSelect={setActiveGame} />
      {activeGame && (
        <GameModal gameId={activeGame} onClose={() => setActiveGame(null)} />
      )}
    </>
  )
}
