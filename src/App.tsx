import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Wand2 } from 'lucide-react';
import { levels, Level } from './puzzle';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { StarPop } from './StarPop';

export function useGameState() {
  const [stardust, setStardust] = useState<number>(() => {
    const saved = localStorage.getItem('cruzada_master_stardust');
    return saved ? parseInt(saved, 10) : 50;
  });

  const [bonusWordsFound, setBonusWordsFound] = useState<string[]>([]);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('cruzada_master_stardust', stardust.toString());
  }, [stardust]);

  const gainStardust = (amount: number) => {
    setStardust((prev) => prev + amount);
  };

  const spendStardust = (amount: number): boolean => {
    if (stardust >= amount) {
      setStardust((prev) => prev - amount);
      return true;
    }
    return false;
  };

  return {
    stardust,
    bonusWordsFound,
    setBonusWordsFound,
    revealedCells,
    setRevealedCells,
    gainStardust,
    spendStardust,
  };
}

function computeGridProps(level: Level) {
  let maxR = 0;
  let maxC = 0;
  level.words.forEach(w => {
    if (w.direction === 'across') {
      maxR = Math.max(maxR, w.row);
      maxC = Math.max(maxC, w.col + w.answer.length - 1);
    } else {
      maxR = Math.max(maxR, w.row + w.answer.length - 1);
      maxC = Math.max(maxC, w.col);
    }
  });

  const rows = maxR + 1;
  const cols = maxC + 1;

  const grid: { isLetter: boolean; letter: string; words: string[] }[][] = Array(rows).fill(null).map(() => 
    Array(cols).fill(null).map(() => ({ isLetter: false, letter: '', words: [] }))
  );

  level.words.forEach(w => {
    let r = w.row;
    let c = w.col;
    for (let i = 0; i < w.answer.length; i++) {
      grid[r][c].isLetter = true;
      grid[r][c].letter = w.answer[i];
      grid[r][c].words.push(w.answer);
      if (w.direction === 'across') c++;
      else r++;
    }
  });

  return { rows, cols, grid };
}

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<Level>(levels[0]);
  const [isLoadingLevel, setIsLoadingLevel] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [letterCenters, setLetterCenters] = useState<{ x: number; y: number }[]>([]);
  const [message, setMessage] = useState('');
  const [starPops, setStarPops] = useState<{x: number, y: number, id: number}[]>([]);
  
  const {
    stardust,
    bonusWordsFound,
    setBonusWordsFound,
    revealedCells,
    setRevealedCells,
    gainStardust,
    spendStardust,
  } = useGameState();

  const level = currentLevel;
  const { rows, cols, grid } = computeGridProps(level);
  
  const isCompleted = foundWords.length === level.words.length;
  
  const wheelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setFoundWords([]);
    setSelectedIndices([]);
    setIsDragging(false);
    setPointerPos(null);
    setBonusWordsFound([]);
    setRevealedCells(new Set());
  }, [currentLevel.id, setBonusWordsFound, setRevealedCells]);

  const handleNextLevel = async () => {
    setIsLoadingLevel(true);
    try {
      const nextId = currentLevel.id + 1;
      const res = await fetch('/api/generate-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: nextId })
      });
      if (res.ok) {
        const data = await res.json();
        const newLevel: Level = {
          id: nextId,
          difficulty: `Nível ${nextId}`,
          letters: Array.isArray(data.letters) ? data.letters : data.letters.split(''),
          words: data.words.map((w: any) => ({
            answer: w.answer,
            row: w.row,
            col: w.col,
            direction: w.orientation === 'down' ? 'down' : 'across'
          }))
        };
        setCurrentLevel(newLevel);
      } else {
        setMessage('Erro ao gerar nível com IA');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (e) {
      setMessage('Erro de conexão com servidor');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        if (!isLoadingLevel) {
          handleNextLevel();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isLoadingLevel]);

  useEffect(() => {
    const measure = () => {
      if (!wheelRef.current) return;
      const nodes = wheelRef.current.querySelectorAll('.letter-node');
      const centers: {x: number, y: number}[] = [];
      const wheelRect = wheelRef.current.getBoundingClientRect();
      
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        centers.push({
          x: rect.left + rect.width / 2 - wheelRect.left,
          y: rect.top + rect.height / 2 - wheelRect.top
        });
      });
      setLetterCenters(centers);
    };
    
    setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [currentLevel.id, level.letters]);

  const triggerMagicHint = () => {
    const HINT_COST = 20;

    if (stardust < HINT_COST) {
      setMessage("👁️ Você precisa de mais Brilho Estelar para esta dica!");
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const hiddenCells: {r: number, c: number, letter: string}[] = [];
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.isLetter) {
          const isWordFound = cell.words.some(w => foundWords.includes(w));
          const isCellRevealed = revealedCells.has(`${r}-${c}`);
          if (!isWordFound && !isCellRevealed) {
            hiddenCells.push({ r, c, letter: cell.letter });
          }
        }
      });
    });

    if (hiddenCells.length === 0) {
      setMessage("Todas as letras já estão brilhando!");
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (spendStardust(HINT_COST)) {
      const randomCell = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
      setRevealedCells(prev => {
        const next = new Set(prev);
        next.add(`${randomCell.r}-${randomCell.c}`);
        return next;
      });
      setMessage("✨ Uma estrela iluminou uma letra!");
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    if (isCompleted) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(true);
    setSelectedIndices([idx]);
    
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const idxStr = el.getAttribute('data-index');
        if (idxStr) {
          const idx = parseInt(idxStr, 10);
          if (idx !== selectedIndices[selectedIndices.length - 1]) {
            if (selectedIndices.length > 1 && selectedIndices[selectedIndices.length - 2] === idx) {
              setSelectedIndices(prev => prev.slice(0, -1));
            } else if (!selectedIndices.includes(idx)) {
              setSelectedIndices(prev => [...prev, idx]);
            }
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging) {
        const word = selectedIndices.map(i => level.letters[i]).join('');
        if (word.length >= 3) {
          const isCorrectInGrid = level.words.some(w => w.answer === word);
          
          let spawnX = 150; // default wheel center
          let spawnY = 150;
          if (wheelRef.current) {
            const rect = wheelRef.current.getBoundingClientRect();
            spawnX = e.clientX - rect.left;
            spawnY = e.clientY - rect.top;
          }

          if (isCorrectInGrid) {
            if (!foundWords.includes(word)) {
              setFoundWords(prev => [...prev, word]);
              gainStardust(10);
              
              const id = Date.now();
              setStarPops(prev => [...prev, { x: spawnX, y: spawnY, id }]);
              setTimeout(() => {
                setStarPops(prev => prev.filter(p => p.id !== id));
              }, 1000);
            } else {
              setMessage('Palavra já encontrada!');
              setTimeout(() => setMessage(''), 2000);
            }
          } else {
            // Stub valid list ou aceitar qualquer coisa acima de 3 letras por enquanto
            const checkValidBrazilianWord = (w: string) => {
              const bonusList = ['OBA', 'BOA', 'RABO', 'COBRA', 'ROCA', 'BROA', 'PAR', 'ATO', 'SOPA', 'PROA', 'POSTA', 'ASTRO', 'MAO', 'ANO', 'CANA', 'COCA'];
              return bonusList.includes(w) || w.length >= 3;
            };

            const isWordInDictionary = checkValidBrazilianWord(word);

            if (isWordInDictionary) {
              if (bonusWordsFound.includes(word)) {
                setMessage('Você já encontrou essa palavra celeste!');
                setTimeout(() => setMessage(''), 2000);
              } else {
                setBonusWordsFound(prev => [...prev, word]);
                gainStardust(25);
                setMessage(`✨ Incrível! Palavra Bônus: +25 Brilhos Estelares!`);
                setTimeout(() => setMessage(''), 2000);
                
                const id = Date.now();
                setStarPops(prev => [...prev, { x: spawnX, y: spawnY, id }]);
                setTimeout(() => {
                  setStarPops(prev => prev.filter(p => p.id !== id));
                }, 1000);
              }
            } else {
              setMessage('Essa combinação não formou uma palavra válida.');
              setTimeout(() => setMessage(''), 2000);
            }
          }
        }
        setIsDragging(false);
        setSelectedIndices([]);
        setPointerPos(null);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, selectedIndices, level, foundWords, bonusWordsFound, gainStardust, setBonusWordsFound]);

  const currentWordStr = selectedIndices.map(i => level.letters[i]).join('');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans py-4 sm:py-8 overflow-x-hidden flex flex-col gap-6 touch-none">
      <header className="max-w-7xl w-full mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/20">C</div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">Cruzada Master</h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">Nível {level.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] self-start md:self-auto">
          <span className="animate-pulse text-xl">✨</span>
          <div className="flex flex-col">
            <span className="text-xs text-purple-300 font-semibold tracking-wider uppercase leading-none">Brilho Estelar</span>
            <span className="text-lg font-bold text-white tabular-nums leading-none">{stardust}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 w-full flex flex-col items-center gap-8 justify-center pb-12">
        <section className="bg-slate-800/70 border border-white/10 rounded-[1.5rem] backdrop-blur-md p-6 sm:p-10 flex flex-col items-center shadow-xl w-full max-w-2xl min-h-[300px] justify-center">
          
          {isCompleted && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-emerald-500/20 text-emerald-100 rounded-xl border border-emerald-500/30 flex items-center gap-3 w-full justify-between"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Parabéns!</h3>
                  <p className="text-sm">Você encontrou todas as palavras.</p>
                </div>
              </div>
              
              {isLoadingLevel ? (
                <div className="px-4 py-2 bg-emerald-600/50 text-white font-bold rounded-lg shadow">Gerando IA...</div>
              ) : (
                <button 
                  onClick={handleNextLevel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-colors"
                >
                  Próximo
                </button>
              )}
            </motion.div>
          )}

          <div 
            className="relative select-none bg-[#0f1623] rounded-xl border border-[#1e2b40] p-3 sm:p-5 mx-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: '6px',
              width: 'fit-content'
            }}
          >
            {grid.map((row, r) => (
               row.map((cell, c) => {
                 if (!cell.isLetter) {
                   return (
                     <div 
                       key={`${r}-${c}`} 
                       className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-transparent"
                     />
                   );
                 }

                 const isRevealed = cell.words.some(w => foundWords.includes(w)) || revealedCells.has(`${r}-${c}`);

                 return (
                   <motion.div
                     key={`${r}-${c}`}
                     initial={false}
                     animate={isRevealed ? {
                       scale: [1, 1.15, 1],
                       backgroundColor: ["#1e1b4b", "#4c1d95", "#4f46e5"],
                       borderColor: ["#3b82f6", "#a855f7", "#6366f1"],
                       boxShadow: [
                         "0 0 0px rgba(0,0,0,0)",
                         "0 0 20px rgba(168,85,247,0.6)",
                         "0 0 0px rgba(0,0,0,0)"
                       ]
                     } : {}}
                     transition={{ duration: 0.4, ease: "easeInOut" }}
                     className={cn(
                       "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold rounded-lg shadow-sm selection:none",
                       isRevealed 
                         ? "bg-indigo-600 border-2 border-indigo-500 text-white shadow-indigo-500/30" 
                         : "bg-[#1e2b40] border-2 border-[#2b3b54] text-transparent"
                     )}
                   >
                     {isRevealed && (
                       <motion.span
                         initial={{ opacity: 0, scale: 0.5 }}
                         animate={{ opacity: 1, scale: 1 }}
                       >
                         {cell.letter}
                       </motion.span>
                     )}
                   </motion.div>
                 );
               })
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center gap-6 mt-4 relative">
          <div className="h-12 flex items-center justify-center flex-col relative w-full">
            <AnimatePresence mode="wait">
              {currentWordStr && (
                <motion.div
                  key="word-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-6 py-2 bg-slate-800 border border-slate-600 rounded-full font-mono text-2xl font-bold tracking-[0.2em] text-white shadow-lg z-20"
                >
                  {currentWordStr}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-14 text-sm font-bold text-red-400 bg-red-950/50 px-4 py-1.5 rounded-full border border-red-900/50"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-slate-800/50 bg-slate-800/30 shadow-inner select-none"
            ref={wheelRef}
            style={{ touchAction: 'none' }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              {selectedIndices.length > 0 && letterCenters.length > 0 && (
                <motion.polyline
                  points={[
                    ...selectedIndices.map(idx => `${letterCenters[idx].x},${letterCenters[idx].y}`),
                    ...(pointerPos ? [`${pointerPos.x},${pointerPos.y}`] : [])
                  ].join(' ')}
                  fill="none"
                  stroke="url(#purpleGradient)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'url(#glow)' }}
                  animate={{
                    strokeWidth: [6, 9, 6],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                  }}
                  opacity="0.8"
                />
              )}
            </svg>

            {starPops.map(p => (
              <StarPop key={p.id} x={p.x} y={p.y} />
            ))}

            {level.letters.map((letter, idx) => {
              const angle = (idx / level.letters.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 35;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);
              
              const isSelected = selectedIndices.includes(idx);

              return (
                <div
                  key={idx}
                  data-index={idx}
                  className={cn(
                    "letter-node absolute w-14 h-14 sm:w-16 sm:h-16 -ml-7 -mt-7 sm:-ml-8 sm:-mt-8 rounded-full flex items-center justify-center font-bold text-2xl sm:text-3xl cursor-pointer transition-colors z-20 shadow-lg",
                    isSelected
                      ? "bg-indigo-500 text-white shadow-indigo-500/50 scale-110"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  )}
                  style={{ left: `${x}%`, top: `${y}%`, touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, idx)}
                >
                  {letter}
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={triggerMagicHint}
            className="mt-4 flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-indigo-900 to-slate-900 border border-indigo-500/50 hover:border-purple-400 active:scale-95 transition shadow-lg group"
          >
            <span className="text-2xl group-hover:animate-spin">🔮</span>
            <span className="text-xs font-bold text-indigo-200 mt-1">Dica Mágica</span>
            <span className="text-[10px] text-purple-300 font-medium">✨ 20</span>
          </button>
        </section>
      </main>
    </div>
  );
}
