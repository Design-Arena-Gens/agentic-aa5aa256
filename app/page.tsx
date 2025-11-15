'use client';

import { useEffect, useRef, useState } from 'react';

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Snake {
  body: Position[];
  direction: Direction;
  color: string;
  targetFood: Position | null;
}

interface Message {
  from: number;
  targetingFood: boolean;
  foodPosition: Position | null;
}

const GRID_SIZE = 25;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);

  const snake1Ref = useRef<Snake>({
    body: [{ x: 5, y: 12 }],
    direction: 'RIGHT',
    color: '#00ff00',
    targetFood: null,
  });

  const snake2Ref = useRef<Snake>({
    body: [{ x: 19, y: 12 }],
    direction: 'LEFT',
    color: '#00ffff',
    targetFood: null,
  });

  const foodRef = useRef<Position[]>([]);
  const messageQueueRef = useRef<Message[]>([]);

  const addMessage = (msg: string) => {
    setMessages(prev => [...prev.slice(-4), msg]);
  };

  const generateFood = () => {
    const allSnakePositions = [
      ...snake1Ref.current.body,
      ...snake2Ref.current.body,
    ];

    let newFood: Position;
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      attempts < 100 &&
      (allSnakePositions.some(pos => pos.x === newFood.x && pos.y === newFood.y) ||
        foodRef.current.some(f => f.x === newFood.x && f.y === newFood.y))
    );

    foodRef.current.push(newFood);
  };

  const distance = (a: Position, b: Position) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  const getNextPosition = (head: Position, direction: Direction): Position => {
    switch (direction) {
      case 'UP': return { x: head.x, y: head.y - 1 };
      case 'DOWN': return { x: head.x, y: head.y + 1 };
      case 'LEFT': return { x: head.x - 1, y: head.y };
      case 'RIGHT': return { x: head.x + 1, y: head.y };
    }
  };

  const isValidMove = (pos: Position, snake: Snake, otherSnake: Snake): boolean => {
    if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) return false;
    if (snake.body.some(segment => segment.x === pos.x && segment.y === pos.y)) return false;
    if (otherSnake.body.some(segment => segment.x === pos.x && segment.y === pos.y)) return false;
    return true;
  };

  const findBestDirection = (
    snake: Snake,
    target: Position,
    otherSnake: Snake
  ): Direction => {
    const head = snake.body[0];
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

    const validDirections = directions.filter(dir => {
      const nextPos = getNextPosition(head, dir);
      return isValidMove(nextPos, snake, otherSnake);
    });

    if (validDirections.length === 0) return snake.direction;

    validDirections.sort((a, b) => {
      const posA = getNextPosition(head, a);
      const posB = getNextPosition(head, b);
      return distance(posA, target) - distance(posB, target);
    });

    return validDirections[0];
  };

  const processSnake = (
    snake: Snake,
    otherSnake: Snake,
    snakeId: number
  ): boolean => {
    const head = snake.body[0];

    // Check messages from other snake
    const otherSnakeMessage = messageQueueRef.current.find(m => m.from !== snakeId);

    // Decide target
    if (foodRef.current.length > 0) {
      if (otherSnakeMessage && otherSnakeMessage.targetingFood && otherSnakeMessage.foodPosition) {
        // Other snake is going for food
        const otherTargets = [otherSnakeMessage.foodPosition];
        const availableFood = foodRef.current.filter(
          f => !otherTargets.some(t => t.x === f.x && t.y === f.y)
        );

        if (availableFood.length > 0) {
          // Go for different food
          availableFood.sort((a, b) => distance(head, a) - distance(head, b));
          snake.targetFood = availableFood[0];
          addMessage(`Snake ${snakeId + 1}: Going for food at (${snake.targetFood.x}, ${snake.targetFood.y})`);
        } else {
          // Follow own tail
          snake.targetFood = null;
          addMessage(`Snake ${snakeId + 1}: Following my tail, optimizing space`);
        }
      } else {
        // Go for nearest food
        foodRef.current.sort((a, b) => distance(head, a) - distance(head, b));
        snake.targetFood = foodRef.current[0];
        addMessage(`Snake ${snakeId + 1}: Targeting nearest food at (${snake.targetFood.x}, ${snake.targetFood.y})`);
      }
    } else {
      snake.targetFood = null;
    }

    // Send message about intent
    messageQueueRef.current = messageQueueRef.current.filter(m => m.from !== snakeId);
    messageQueueRef.current.push({
      from: snakeId,
      targetingFood: snake.targetFood !== null,
      foodPosition: snake.targetFood,
    });

    // Determine target for movement
    let target: Position;
    if (snake.targetFood) {
      target = snake.targetFood;
    } else {
      // Follow own tail
      target = snake.body[snake.body.length - 1];
    }

    // Move towards target
    const newDirection = findBestDirection(snake, target, otherSnake);
    snake.direction = newDirection;

    const newHead = getNextPosition(head, snake.direction);

    // Check collision
    if (!isValidMove(newHead, snake, otherSnake)) {
      return false;
    }

    snake.body.unshift(newHead);

    // Check food consumption
    const foodIndex = foodRef.current.findIndex(
      f => f.x === newHead.x && f.y === newHead.y
    );

    if (foodIndex !== -1) {
      foodRef.current.splice(foodIndex, 1);
      setScore(s => s + 1);
      addMessage(`Snake ${snakeId + 1}: Ate food! Score +1`);
      generateFood();
      snake.targetFood = null;
    } else {
      snake.body.pop();
    }

    return true;
  };

  const gameLoop = () => {
    // Process Snake 1
    const snake1Alive = processSnake(snake1Ref.current, snake2Ref.current, 0);
    if (!snake1Alive) {
      setGameOver(true);
      addMessage('Game Over! Snake 1 crashed!');
      return;
    }

    // Process Snake 2
    const snake2Alive = processSnake(snake2Ref.current, snake1Ref.current, 1);
    if (!snake2Alive) {
      setGameOver(true);
      addMessage('Game Over! Snake 2 crashed!');
      return;
    }

    draw();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#222222';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Snake 1
    snake1Ref.current.body.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#00ff00' : '#00aa00';
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw Snake 2
    snake2Ref.current.body.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#00ffff' : '#0088aa';
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw food
    foodRef.current.forEach(food => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };

  useEffect(() => {
    // Initialize food
    for (let i = 0; i < 3; i++) {
      generateFood();
    }

    const interval = setInterval(() => {
      if (!gameOver) {
        gameLoop();
      }
    }, INITIAL_SPEED);

    return () => clearInterval(interval);
  }, [gameOver]);

  const resetGame = () => {
    snake1Ref.current = {
      body: [{ x: 5, y: 12 }],
      direction: 'RIGHT',
      color: '#00ff00',
      targetFood: null,
    };
    snake2Ref.current = {
      body: [{ x: 19, y: 12 }],
      direction: 'LEFT',
      color: '#00ffff',
      targetFood: null,
    };
    foodRef.current = [];
    messageQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    setMessages([]);

    for (let i = 0; i < 3; i++) {
      generateFood();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }}>
      <h1 style={{ marginBottom: '20px' }}>Collaborative Snake Game</h1>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        fontSize: '18px',
      }}>
        <div>Score: {score}</div>
        <div style={{ color: '#00ff00' }}>● Snake 1</div>
        <div style={{ color: '#00ffff' }}>● Snake 2</div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        style={{
          border: '2px solid #444',
          marginBottom: '20px',
        }}
      />

      {gameOver && (
        <div style={{
          fontSize: '24px',
          color: '#ff0000',
          marginBottom: '20px',
        }}>
          Game Over! Final Score: {score}
        </div>
      )}

      <button
        onClick={resetGame}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#444',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        {gameOver ? 'Play Again' : 'Reset Game'}
      </button>

      <div style={{
        width: '500px',
        maxWidth: '90vw',
        backgroundColor: '#222',
        padding: '15px',
        borderRadius: '5px',
        minHeight: '120px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Communication Log:</h3>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            fontSize: '14px',
            marginBottom: '5px',
            color: msg.includes('Snake 1') ? '#00ff00' : '#00ffff'
          }}>
            {msg}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '20px',
        fontSize: '14px',
        color: '#aaa',
        textAlign: 'center',
        maxWidth: '600px',
      }}>
        <p>Two autonomous snakes communicate and collaborate:</p>
        <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <li>Snakes process sequentially and share their food targets</li>
          <li>If one snake targets food, the other picks a different food</li>
          <li>When not targeting food, snakes follow their own tails to optimize space</li>
          <li>Watch the communication log to see their coordination!</li>
        </ul>
      </div>
    </div>
  );
}
