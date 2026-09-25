import { useEffect, useRef, useState } from 'react'

// Difficulty definitions strictly adhering to required symbols
const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    pairs: 6,
    gridClass: 'grid-easy',
    symbols: ['🍎', '🍕', '🐶', '🐱', '🚀', '🌈'],
  },
  medium: {
    label: 'Medium',
    pairs: 8,
    gridClass: 'grid-medium',
    symbols: ['🍎', '🍕', '🐶', '🐱', '🚀', '🌈', '⚽', '🦋'],
  },
  hard: {
    label: 'Hard',
    pairs: 12,
    gridClass: 'grid-hard',
    symbols: ['🍎', '🍕', '🐶', '🐱', '🚀', '🌈', '⚽', '🦋', '🌸', '🌙', '⭐', '🎵'],
  },
}

const BEST_SCORES_KEY = 'thirora_mind_relax_best_scores'
const SOUND_SETTING_KEY = 'thirora_mind_relax_sound_enabled'

// Web Audio API Synthesizer for relaxing, soothing sound effects
function playSoundEffect(type, isSoundEnabled) {
  if (!isSoundEnabled) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'flip') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.08)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      osc.start(now)
      osc.stop(now + 0.09)
    } else if (type === 'match') {
      // Harmonic pleasant chord
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18) // E5
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(783.99, now + 0.05) // G5
      gain2.gain.setValueAtTime(0.12, now + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.start(now)
      osc.stop(now + 0.23)
      osc2.start(now + 0.05)
      osc2.stop(now + 0.26)
    } else if (type === 'win') {
      // Gentle celebratory victory melody
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator()
        const noteGain = ctx.createGain()
        noteOsc.connect(noteGain)
        noteGain.connect(ctx.destination)

        noteOsc.type = 'sine'
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.12)
        noteGain.gain.setValueAtTime(0.15, now + idx * 0.12)
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3)

        noteOsc.start(now + idx * 0.12)
        noteOsc.stop(now + idx * 0.12 + 0.32)
      })
    }
  } catch {
    // AudioContext failure gracefully ignored
  }
}

// Generate shuffled deck based on selected difficulty
function createDeck(difficultyKey) {
  const config = DIFFICULTY_CONFIG[difficultyKey] || DIFFICULTY_CONFIG.medium
  const symbols = config.symbols

  const rawCards = []
  symbols.forEach((symbol, index) => {
    rawCards.push({ id: `card_${index}_a`, symbol, pairId: index })
    rawCards.push({ id: `card_${index}_b`, symbol, pairId: index })
  })

  // Fisher-Yates Shuffle
  for (let i = rawCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rawCards[i], rawCards[j]] = [rawCards[j], rawCards[i]]
  }

  return rawCards.map((card, index) => ({
    ...card,
    uniqueIndex: index,
    isFlipped: false,
    isMatched: false,
  }))
}

// Format seconds to MM:SS
function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function MindRelax() {
  // Game Navigation & State
  const [gameState, setGameState] = useState('intro') // 'intro' | 'playing' | 'won'
  const [difficulty, setDifficulty] = useState('medium') // 'easy' | 'medium' | 'hard'
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  // Game board state
  const [cards, setCards] = useState([])
  const [flippedIndices, setFlippedIndices] = useState([])
  const [isLocked, setIsLocked] = useState(false)

  // Real gameplay metrics
  const [moves, setMoves] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [finalGameScore, setFinalGameScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)

  // Settings & Sound
  const [isSoundOn, setIsSoundOn] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUND_SETTING_KEY)
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  // Real Best Scores from localStorage (null if no previous score)
  const [bestScores, setBestScores] = useState(() => {
    try {
      const saved = localStorage.getItem(BEST_SCORES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          easy: typeof parsed.easy === 'number' ? parsed.easy : null,
          medium: typeof parsed.medium === 'number' ? parsed.medium : null,
          hard: typeof parsed.hard === 'number' ? parsed.hard : null,
        }
      }
    } catch {
      // ignore
    }
    return { easy: null, medium: null, hard: null }
  })

  // Timer Ref
  const timerRef = useRef(null)

  // Sound setting persistence
  function toggleSound() {
    setIsSoundOn((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SOUND_SETTING_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Start new game
  function startNewGame(selectedDifficulty = difficulty) {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setDifficulty(selectedDifficulty)
    setCards(createDeck(selectedDifficulty))
    setFlippedIndices([])
    setIsLocked(false)
    setMoves(0)
    setMatchedCount(0)
    setTimerSeconds(0)
    setFinalGameScore(0)
    setIsNewRecord(false)
    setGameState('playing')
  }

  // Active Timer Effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState])

  // Card click handler
  function handleCardClick(clickedIndex) {
    if (isLocked) return
    const card = cards[clickedIndex]
    if (!card || card.isMatched || card.isFlipped) return

    // Play soft flip tone
    playSoundEffect('flip', isSoundOn)

    // Flip the clicked card
    const updatedCards = cards.map((c, idx) =>
      idx === clickedIndex ? { ...c, isFlipped: true } : c
    )
    setCards(updatedCards)

    const newFlipped = [...flippedIndices, clickedIndex]
    setFlippedIndices(newFlipped)

    // If second card flipped
    if (newFlipped.length === 2) {
      const firstIdx = newFlipped[0]
      const secondIdx = newFlipped[1]
      const firstCard = updatedCards[firstIdx]
      const secondCard = updatedCards[secondIdx]

      setMoves((prev) => prev + 1)

      // Check for match
      if (firstCard.symbol === secondCard.symbol) {
        // MATCH FOUND
        playSoundEffect('match', isSoundOn)
        const matchedCards = updatedCards.map((c, idx) =>
          idx === firstIdx || idx === secondIdx ? { ...c, isMatched: true } : c
        )
        setCards(matchedCards)
        setFlippedIndices([])

        const newMatched = matchedCount + 1
        setMatchedCount(newMatched)

        // Check if all pairs are matched
        const totalPairs = DIFFICULTY_CONFIG[difficulty].pairs
        if (newMatched === totalPairs) {
          handleGameWon(moves + 1, timerSeconds)
        }
      } else {
        // MISMATCH -> Flip back after a short delay
        setIsLocked(true)
        setTimeout(() => {
          setCards((prevCards) => {
            const resetCards = [...prevCards]
            if (resetCards[firstIdx]) resetCards[firstIdx].isFlipped = false
            if (resetCards[secondIdx]) resetCards[secondIdx].isFlipped = false
            return resetCards
          })
          setFlippedIndices([])
          setIsLocked(false)
        }, 850)
      }
    }
  }

  // Game Won Handler with consistent, transparent scoring formula
  function handleGameWon(finalMoves, finalTimeSeconds) {
    if (timerRef.current) clearInterval(timerRef.current)
    playSoundEffect('win', isSoundOn)

    const totalPairs = DIFFICULTY_CONFIG[difficulty].pairs
    // Transparent score formula: Rewards efficiency in moves and speed
    const baseDifficultyBonus = difficulty === 'hard' ? 600 : difficulty === 'medium' ? 400 : 250
    const moveBonus = Math.max(0, (totalPairs * 2.5 - finalMoves) * 20)
    const timeBonus = Math.max(0, (totalPairs * 12 - finalTimeSeconds) * 8)
    const calculatedScore = Math.max(120, Math.round(baseDifficultyBonus + (totalPairs * 80) + moveBonus + timeBonus))

    setFinalGameScore(calculatedScore)

    // Update localStorage Best Scores
    const currentBest = bestScores[difficulty]
    const isRecord = currentBest === null || calculatedScore > currentBest
    setIsNewRecord(isRecord)

    if (isRecord) {
      const updatedBestScores = {
        ...bestScores,
        [difficulty]: calculatedScore,
      }
      setBestScores(updatedBestScores)
      try {
        localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(updatedBestScores))
      } catch {
        // ignore
      }
    }

    setGameState('won')
  }

  // Calculate live indicative score during gameplay
  const totalPairs = DIFFICULTY_CONFIG[difficulty]?.pairs || 8
  const currentLiveScore = Math.max(
    0,
    Math.round(
      (difficulty === 'hard' ? 600 : difficulty === 'medium' ? 400 : 250) +
      matchedCount * 80 -
      moves * 5 -
      timerSeconds * 2
    )
  )

  return (
    <div className="mind-relax-page">
      {/* 1. INTRO VIEW */}
      {gameState === 'intro' && (
        <div className="relax-intro-container">
          <header className="page-header">
            <div>
              <p className="eyebrow">Mind Relax</p>
              <h1>Memory Match</h1>
              <p className="page-subtitle">
                Take a short break, relax your mind, and challenge your memory.
              </p>
            </div>

            <div className="header-sound-control">
              <button
                type="button"
                className={`sound-toggle-btn ${isSoundOn ? 'sound-on' : 'sound-off'}`}
                onClick={toggleSound}
                title={isSoundOn ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                aria-label={isSoundOn ? 'Sound On' : 'Sound Off'}
              >
                <span>{isSoundOn ? '🔊 Sound On' : '🔇 Sound Off'}</span>
              </button>
            </div>
          </header>

          <div className="relax-intro-card">
            <div className="intro-badge-pill">Stress-Free Mini Game</div>
            <h2>Match the pairs and improve your memory and concentration.</h2>
            <p className="intro-card-desc">
              Flip the cards, memorize their locations, and pair every matching symbol. Enjoy a calm, relaxing break during your study sessions.
            </p>

            {/* Difficulty Selector */}
            <div className="difficulty-selection-wrap">
              <label className="difficulty-label">Choose Difficulty</label>
              <div className="difficulty-options" role="radiogroup" aria-label="Difficulty Levels">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
                  const isSelected = difficulty === key
                  return (
                    <button
                      type="button"
                      key={key}
                      role="radio"
                      aria-checked={isSelected}
                      className={`difficulty-card-btn ${isSelected ? 'difficulty-selected' : ''}`}
                      onClick={() => setDifficulty(key)}
                    >
                      <span className="diff-name">{config.label}</span>
                      <span className="diff-pairs">{config.pairs} pairs ({config.pairs * 2} cards)</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="intro-actions-row">
              <button
                type="button"
                className="btn-play-primary"
                onClick={() => startNewGame(difficulty)}
              >
                <span>Play Game</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className="btn-how-secondary"
                onClick={() => setShowHowToPlay(true)}
              >
                <span>How to Play</span>
              </button>
            </div>

            {/* Real Best Scores Record Table */}
            <div className="best-scores-panel">
              <h3>Your Personal Records</h3>
              <div className="best-scores-grid">
                <div className="best-score-item">
                  <span className="score-tier">Easy (6 pairs)</span>
                  <strong className={bestScores.easy !== null ? 'has-score' : 'no-score'}>
                    {bestScores.easy !== null ? `${bestScores.easy} pts` : 'No best score yet'}
                  </strong>
                </div>

                <div className="best-score-item">
                  <span className="score-tier">Medium (8 pairs)</span>
                  <strong className={bestScores.medium !== null ? 'has-score' : 'no-score'}>
                    {bestScores.medium !== null ? `${bestScores.medium} pts` : 'No best score yet'}
                  </strong>
                </div>

                <div className="best-score-item">
                  <span className="score-tier">Hard (12 pairs)</span>
                  <strong className={bestScores.hard !== null ? 'has-score' : 'no-score'}>
                    {bestScores.hard !== null ? `${bestScores.hard} pts` : 'No best score yet'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div
          className="how-to-play-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHowToPlay(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-heading"
        >
          <div className="how-to-play-card">
            <div className="how-to-play-header">
              <h2 id="how-to-play-heading">How to Play Memory Match</h2>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowHowToPlay(false)}
                aria-label="Close rules dialog"
              >
                ✕
              </button>
            </div>

            <ol className="how-to-play-steps">
              <li>
                <span className="step-num">1</span>
                <div>
                  <strong>Flip one card</strong>
                  <p>Click any face-down card on the grid to reveal its symbol.</p>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  <strong>Flip another card</strong>
                  <p>Pick a second card to see if it matches the first one.</p>
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  <strong>Find the matching pair</strong>
                  <p>If they match, they remain open. If not, they flip back over smoothly.</p>
                </div>
              </li>
              <li>
                <span className="step-num">4</span>
                <div>
                  <strong>Match all pairs to complete the game</strong>
                  <p>Clear the board with the fewest moves and fastest time for a high score!</p>
                </div>
              </li>
            </ol>

            <div className="how-to-play-footer">
              <button
                type="button"
                className="btn-play-primary"
                onClick={() => {
                  setShowHowToPlay(false)
                  startNewGame(difficulty)
                }}
              >
                Start Playing →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE GAME PLAY VIEW */}
      {gameState === 'playing' && (
        <div className="relax-game-container">
          {/* Game Header Bar */}
          <div className="game-top-bar">
            <div className="game-title-group">
              <h2>Memory Match</h2>
              <span className="difficulty-badge">{DIFFICULTY_CONFIG[difficulty].label} ({totalPairs} Pairs)</span>
            </div>

            <div className="game-controls-group">
              <button
                type="button"
                className={`sound-toggle-btn ${isSoundOn ? 'sound-on' : 'sound-off'}`}
                onClick={toggleSound}
                title={isSoundOn ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                aria-label={isSoundOn ? 'Sound On' : 'Sound Off'}
              >
                <span>{isSoundOn ? '🔊 Sound' : '🔇 Muted'}</span>
              </button>

              <button
                type="button"
                className="game-control-btn restart-btn"
                onClick={() => startNewGame(difficulty)}
                title="Shuffle & Restart"
              >
                <span>↻ Restart</span>
              </button>

              <button
                type="button"
                className="game-control-btn exit-btn"
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current)
                  setGameState('intro')
                }}
                title="Change difficulty or go back"
              >
                <span>Menu</span>
              </button>
            </div>
          </div>

          {/* Real-time Game Statistics Dashboard */}
          <div className="game-stats-bar" role="region" aria-label="Game Progress">
            <div className="stat-box">
              <span className="stat-label">Moves</span>
              <strong className="stat-val">{moves}</strong>
            </div>

            <div className="stat-box">
              <span className="stat-label">Matches</span>
              <strong className="stat-val">{matchedCount} / {totalPairs}</strong>
            </div>

            <div className="stat-box">
              <span className="stat-label">Time</span>
              <strong className="stat-val">{formatTime(timerSeconds)}</strong>
            </div>

            <div className="stat-box">
              <span className="stat-label">Score</span>
              <strong className="stat-val">{currentLiveScore}</strong>
            </div>
          </div>

          {/* 3D Interactive Card Grid */}
          <main className={`memory-grid-board ${DIFFICULTY_CONFIG[difficulty].gridClass}`} role="grid" aria-label="Memory Card Board">
            {cards.map((card, index) => {
              const isFlipped = card.isFlipped || card.isMatched
              const isMatched = card.isMatched

              return (
                <button
                  type="button"
                  key={card.id}
                  className={`memory-card-wrap ${isFlipped ? 'card-open' : ''} ${isMatched ? 'card-matched' : ''}`}
                  onClick={() => handleCardClick(index)}
                  disabled={isMatched || isLocked}
                  aria-label={
                    isMatched
                      ? `Matched pair: ${card.symbol}`
                      : isFlipped
                      ? `Card flipped: ${card.symbol}`
                      : `Hidden memory card ${index + 1}`
                  }
                >
                  <div className={`memory-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                    {/* Card Back (Face Down) */}
                    <div className="memory-card-face memory-card-back">
                      <span className="card-back-pattern" aria-hidden="true">✦</span>
                    </div>

                    {/* Card Front (Face Up with Symbol) */}
                    <div className={`memory-card-face memory-card-front ${isMatched ? 'matched-front' : ''}`}>
                      <span className="card-emoji-symbol" role="img" aria-label={card.symbol}>
                        {card.symbol}
                      </span>
                      {isMatched && <span className="matched-indicator" aria-hidden="true">✓</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </main>
        </div>
      )}

      {/* 4. CELEBRATION / WIN VIEW */}
      {gameState === 'won' && (
        <div className="relax-win-container" role="alert" aria-live="polite">
          <div className="celebration-confetti" aria-hidden="true">
            <span className="confetti-piece" style={{ left: '10%', animationDelay: '0s' }} />
            <span className="confetti-piece" style={{ left: '25%', animationDelay: '0.2s' }} />
            <span className="confetti-piece" style={{ left: '40%', animationDelay: '0.4s' }} />
            <span className="confetti-piece" style={{ left: '60%', animationDelay: '0.1s' }} />
            <span className="confetti-piece" style={{ left: '75%', animationDelay: '0.3s' }} />
            <span className="confetti-piece" style={{ left: '90%', animationDelay: '0.5s' }} />
          </div>

          <div className="win-card">
            <div className="win-badge-icon" aria-hidden="true">🎉</div>
            <h1>You Won!</h1>
            <p className="win-subtitle">
              Great job! You completed the memory challenge.
            </p>

            {isNewRecord && (
              <div className="new-record-pill">
                ⭐ New Personal Best Score!
              </div>
            )}

            {/* Results Grid */}
            <div className="win-stats-grid">
              <div className="win-stat-cell">
                <span>Final Score</span>
                <strong>{finalGameScore}</strong>
              </div>

              <div className="win-stat-cell">
                <span>Total Moves</span>
                <strong>{moves}</strong>
              </div>

              <div className="win-stat-cell">
                <span>Completion Time</span>
                <strong>{formatTime(timerSeconds)}</strong>
              </div>

              <div className="win-stat-cell">
                <span>Best Score ({DIFFICULTY_CONFIG[difficulty].label})</span>
                <strong>
                  {bestScores[difficulty] !== null ? `${bestScores[difficulty]} pts` : `${finalGameScore} pts`}
                </strong>
              </div>
            </div>

            {/* Win Actions */}
            <div className="win-actions-row">
              <button
                type="button"
                className="btn-play-primary"
                onClick={() => startNewGame(difficulty)}
              >
                Play Again
              </button>

              <button
                type="button"
                className="btn-how-secondary"
                onClick={() => setGameState('intro')}
              >
                Back to Mind Relax
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
