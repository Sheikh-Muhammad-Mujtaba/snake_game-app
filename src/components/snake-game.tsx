"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { PauseIcon, PlayIcon, RefreshCcwIcon, VolumeIcon, Volume2Icon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

enum GameState {
  START,
  PAUSE,
  RUNNING,
  GAME_OVER,
}

enum Direction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

interface Position {
  x: number
  y: number
}

const initialSnake: Position[] = [{ x: 0, y: 0 }]
const initialFood: Position = { x: 5, y: 5 }

const GRID_SIZE = 15

export default function SnakeGame() {
  const [gameState, setGameState] = useState<GameState>(GameState.START)
  const [snake, setSnake] = useState<Position[]>(initialSnake)
  const [food, setFood] = useState<Position>(initialFood)
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT)
  const [score, setScore] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const gameInterval = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchStartRef = useRef<Position | null>(null)

  const [speed, setSpeed] = useState<number>(200)


  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const newSnake = [...prevSnake]
      const head = newSnake[0]
      let newHead;

      switch (direction) {
        case Direction.UP:
          newHead = { x: head.x, y: (head.y - 1 + GRID_SIZE) % GRID_SIZE };
          break;
        case Direction.DOWN:
          newHead = { x: head.x, y: (head.y + 1) % GRID_SIZE };
          break;
        case Direction.LEFT:
          newHead = { x: (head.x - 1 + GRID_SIZE) % GRID_SIZE, y: head.y };
          break;
        case Direction.RIGHT:
          newHead = { x: (head.x + 1) % GRID_SIZE, y: head.y };
          break;
        default:
          console.error("Unexpected direction:", direction);
          return newSnake;
      }


      if (!newHead || !food) return prevSnake;


      if (newHead.x === food.x && newHead.y === food.y) {
        setFood({
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        })
        setScore((prevScore) => {
          const newScore = prevScore + 1
          if (newScore > 0 && newScore % 5 === 0) {
            setSpeed((prevSpeed) => Math.max(prevSpeed - 5, 40))
            playSound("levelUp")
            triggerConfetti()
          }
          return newScore
        })
        playSound("eat")
      } else {
        newSnake.pop()
      }

      if (newSnake.slice(1).some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameState(GameState.GAME_OVER)
        playSound("gameOver")
        return prevSnake
      }

      newSnake.unshift(newHead);
      return newSnake
    })
  }, [direction, food]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          if (direction !== Direction.DOWN) setDirection(Direction.UP)
          break
        case "ArrowDown":
          if (direction !== Direction.UP) setDirection(Direction.DOWN)
          break
        case "ArrowLeft":
          if (direction !== Direction.RIGHT) setDirection(Direction.LEFT)
          break
        case "ArrowRight":
          if (direction !== Direction.LEFT) setDirection(Direction.RIGHT)
          break
      }
    },
    [direction]
  )

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    }

    const dx = touchEnd.x - touchStartRef.current.x
    const dy = touchEnd.y - touchStartRef.current.y

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && direction !== Direction.LEFT) {
        setDirection(Direction.RIGHT)
      } else if (dx < 0 && direction !== Direction.RIGHT) {
        setDirection(Direction.LEFT)
      }
    } else {
      if (dy > 0 && direction !== Direction.UP) {
        setDirection(Direction.DOWN)
      } else if (dy < 0 && direction !== Direction.DOWN) {
        setDirection(Direction.UP)
      }
    }

    touchStartRef.current = null
  }

  useEffect(() => {
    if (gameState === GameState.RUNNING) {
      gameInterval.current = setInterval(moveSnake, speed)
      document.addEventListener("keydown", handleKeyPress)
    } else {
      if (gameInterval.current) clearInterval(gameInterval.current)
      document.removeEventListener("keydown", handleKeyPress)
    }

    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current)
      document.removeEventListener("keydown", handleKeyPress)
    }
  }, [gameState, moveSnake, handleKeyPress, speed])

  const startGame = () => {
    if (gameState === GameState.START || gameState === GameState.GAME_OVER) {
      setSnake(initialSnake);
      setFood(initialFood);
      setScore(0);
      setDirection(Direction.RIGHT);
      setSpeed(200);
      setGameState(GameState.RUNNING);
      playSound("start");
    } else if (gameState === GameState.PAUSE) {
      setGameState(GameState.RUNNING);
      playSound("click");
    }
  };

  const pauseGame = () => {
    if (gameState === GameState.RUNNING) {
      setGameState(GameState.PAUSE);
      playSound("click");
    }
  };


  const resetGame = () => {
    setGameState(GameState.START);
    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setSpeed(200);
    playSound("reset");
  }

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem("snakeHighScore", score.toString())
    }
  }, [score, highScore])

  useEffect(() => {
    const storedHighScore = localStorage.getItem("snakeHighScore")
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10))
    }
  }, [])

  const playSound = (soundName: string) => {
    if (!isMuted) {
      const audio = new Audio(`/sounds/${soundName}.mp3`)
      audio.play()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const triggerConfetti = () => {
    if (canvasRef.current) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800 rounded-lg shadow-2xl p-4 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl sm:text-3xl font-bold text-purple-400">Snake Game</div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-cyan-400"
              onClick={() => {
                if (gameState === GameState.RUNNING) {
                  pauseGame();
                } else {
                  startGame();
                }
              }}
            >
              {gameState === GameState.RUNNING ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              <span className="sr-only">Play/Pause</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-cyan-400" onClick={resetGame}>
              <RefreshCcwIcon className="w-5 h-5" />
              <span className="sr-only">Reset</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-cyan-400" onClick={toggleMute}>
              {isMuted ? <VolumeIcon className="w-5 h-5" /> : <Volume2Icon className="w-5 h-5" />}
              <span className="sr-only">Toggle Sound</span>
            </Button>
          </div>
        </div>
        <div
          className="bg-gray-900 rounded-lg p-2 sm:p-4 grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            aspectRatio: "1 / 1",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const isSnakePart = snake.some((part) => part.x === x && part.y === y)
              const isFood = food.x === x && food.y === y
              return (
                <motion.div
                  key={`${x}-${y}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-sm ${isSnakePart
                      ? "bg-purple-500 shadow-glow-purple"
                      : isFood
                        ? "bg-cyan-400 shadow-glow-cyan"
                        : "bg-gray-800"
                    }`}
                />
              )
            })}
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between mt-4 text-cyan-400 text-sm sm:text-base">
          <div>Score: {score}</div>
          <div>High Score: {highScore}</div>
        </div>
        {gameState === GameState.GAME_OVER && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-red-500 font-bold"
          >
            Game Over!
          </motion.div>
        )}
        <div className="mt-4 grid grid-cols-3">
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDirection(Direction.LEFT)}>
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="sr-only">Left</span>
          </Button>
          <div className="flex flex-col items-center justify-center p-0">
            <Button variant="outline" size="sm" onClick={() => setDirection(Direction.UP)}>
              <ArrowUpIcon className="w-4 h-4" />
              <span className="sr-only">Up</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setDirection(Direction.DOWN)}>
              <ArrowDownIcon className="w-4 h-4" />
              <span className="sr-only">Down</span>
            </Button>
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDirection(Direction.RIGHT)}>
            <ArrowRightIcon className="w-4 h-4" />
            <span className="sr-only">Right</span>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}