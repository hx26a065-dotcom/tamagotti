/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameMode, Character, DifficultyLevel, GameState, Particle } from '../types';
import { BACKGROUND_ART } from '../data/characters';
import { Synth } from '../utils/audio';
import { RotateCcw, Zap, HelpCircle, Flame, BarChart2, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticeArenaProps {
  difficulty: DifficultyLevel;
  swordColor: string;
  onExit: () => void;
  bestTime: number | null;
  onNewBest: (time: number) => void;
}

export default function PracticeArena({
  difficulty,
  swordColor,
  onExit,
  bestTime,
  onNewBest
}: PracticeArenaProps) {
  // Practice states
  const [subState, setSubState] = useState<GameState>('READY');
  const [instructionText, setInstructionText] = useState('修練を開始する。画面を叩くかスペースキーを押せ。');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [showZan, setShowZan] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Active timers
  const triggerTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const hasStruckRef = useRef(false);

  // FX States
  const [slashTriggered, setSlashTriggered] = useState(false);
  const [flashScreen, setFlashScreen] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [lastReflex, setLastReflex] = useState<number | null>(null);

  useEffect(() => {
    Synth.startWind();
    return () => {
      cleanActiveTimers();
      Synth.stopWind();
    };
  }, []);

  const cleanActiveTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
  };

  const startHeartbeats = () => {
    const thump = () => {
      if (subState !== 'TENSION') return;
      Synth.playHeartbeat(1.1);
      heartbeatRef.current = setTimeout(thump, 500);
    };
    heartbeatRef.current = setTimeout(thump, 500);
  };

  const startTension = () => {
    cleanActiveTimers();
    hasStruckRef.current = false;
    setSlashTriggered(false);
    setShowZan(false);
    setSubState('TENSION');
    setInstructionText('『 呼吸を整え、合図を待て 』');

    startHeartbeats();

    // Random timing 2.0s - 4.8s
    const randomDelay = 2000 + Math.random() * 2800;
    timeoutRef.current = setTimeout(() => {
      cleanActiveTimers();
      if (hasStruckRef.current) return;

      setSubState('ZAN_ACTIVE');
      setShowZan(true);
      triggerTimeRef.current = performance.now();
      Synth.playSlashSignal();
    }, randomDelay);
  };

  const handleActionTrigger = () => {
    if (subState === 'READY') {
      Synth.playSwordSwish();
      startTension();
    } else if (subState === 'TENSION') {
      // Premature false start
      handleFalseStart();
    } else if (subState === 'ZAN_ACTIVE') {
      // Cool strike!
      const elapsed = Math.round(performance.now() - triggerTimeRef.current);
      handleLegitimateStrike(elapsed);
    } else if (subState === 'STRIKE_OUTCOME' || subState === 'ERROR_EARLY') {
      startTension();
    }
  };

  // Keyboard hooks
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleActionTrigger();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [subState]);

  const handleFalseStart = () => {
    cleanActiveTimers();
    hasStruckRef.current = true;
    Synth.playFalseStartBuzz();
    setSubState('ERROR_EARLY');
    setCurrentStreak(0);
    setLastReflex(null);
    setInstructionText('『 お手つき！ 早すぎた抜刀 』');
  };

  const handleLegitimateStrike = (elapsed: number) => {
    hasStruckRef.current = true;
    cleanActiveTimers();
    setShowZan(false);
    setSlashTriggered(true);
    setTimeout(() => {
      setSlashTriggered(false);
    }, 600);
    setLastReflex(elapsed);

    // Dynamic Slash Screen shake
    setFlashScreen(true);
    setScreenShake(true);
    Synth.playSlashSlice();

    setTimeout(() => setFlashScreen(false), 90);
    setTimeout(() => setScreenShake(false), 300);

    const updatedAttempts = [...attempts, elapsed];
    setAttempts(updatedAttempts);

    // Save new best if applicable
    if (bestTime === null || elapsed < bestTime) {
      onNewBest(elapsed);
    }

    // Determine target success
    let targetSpeed = 270;
    if (difficulty === 'EASY') targetSpeed = 380;
    if (difficulty === 'HARD') targetSpeed = 210;
    if (difficulty === 'KAMI') targetSpeed = 165;

    if (elapsed <= targetSpeed) {
      setCurrentStreak((prev) => prev + 1);
      setInstructionText(`『 極限の居合！ ${elapsed}ms （合格） 』`);
    } else {
      setCurrentStreak(0);
      setInstructionText(`『 抜刀完了。 ${elapsed}ms / 目標: ${targetSpeed}ms 』`);
    }

    setSubState('STRIKE_OUTCOME');
  };

  // Stats calculation
  const totalAttemptsCount = attempts.length;
  const averageTime = totalAttemptsCount > 0 
    ? Math.round(attempts.reduce((acc, c) => acc + c, 0) / totalAttemptsCount) 
    : 0;
  const localBest = totalAttemptsCount > 0 
    ? Math.min(...attempts) 
    : 0;

  // Custom SVG Chart parameters
  const chartHeight = 80;
  const chartWidth = 360;
  const maxPlottedPoints = 8;
  const plottedAttempts = attempts.slice(-maxPlottedPoints);

  const getRankName = (ms: number) => {
    if (ms <= 165) return '天神・武神神速 (Kami Grade)';
    if (ms <= 210) return '免許皆伝・達人 (Master Expert)';
    if (ms <= 270) return '並武芸・指南代行 (Swordmaster)';
    return '手解き・門下生 (Novice Apprentice)';
  };

  const getRankColor = (ms: number) => {
    if (ms <= 165) return 'text-yellow-400 font-extrabold';
    if (ms <= 210) return 'text-orange-400';
    if (ms <= 270) return 'text-emerald-400';
    return 'text-stone-400';
  };

  return (
    <div 
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-stone-950 select-none ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(20,15,10,0.7), rgba(0,0,0,0.9)), url(${BACKGROUND_ART})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {flashScreen && (
        <div className="absolute inset-0 bg-white z-40 transition-opacity pointer-events-none" />
      )}

      {/* Tension vignette */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,8,6,0.95)_100%)] pointer-events-none transition-all duration-1000 ${
        subState === 'TENSION' ? 'opacity-100 scale-95' : 'opacity-80'
      }`} />

      {/* Header */}
      <header className="relative w-full z-20 p-4 flex justify-between items-center bg-stone-950/50 backdrop-blur-sm border-b border-stone-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-xs font-serif font-bold rounded">
            抜刀特訓処
          </div>
          <span className="text-stone-400 text-xs font-mono hidden sm:inline">REFLEX TEST MATRIX</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-650 to-orange-650 border border-red-500/20 text-red-400 rounded-full">
              <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse animate-bounce" />
              <span>連続合格: <strong>{currentStreak}</strong></span>
            </div>
          )}

          <div className="bg-stone-900/80 px-2.5 py-1 border border-stone-800 rounded font-serif">
            修練強度: <strong className="text-yellow-400 font-mono">{difficulty}</strong>
          </div>
        </div>
      </header>

      {/* Interactive central focus */}
      <main 
        id="practice_tap_trigger_zone"
        onClick={handleActionTrigger}
        className="relative flex-grow flex flex-col justify-center items-center cursor-pointer z-10 p-4"
      >
        <span className="absolute top-4 font-serif text-stone-400 tracking-wider text-xs md:text-sm px-6 text-center leading-relaxed">
          {instructionText}
        </span>

        {/* Big visual circle target indicator */}
        <div className="relative w-40 h-40 flex items-center justify-center rounded-full border border-stone-800/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {/* Neon focus pulse rings */}
          {subState === 'TENSION' && (
            <div className="absolute inset-0 rounded-full border border-red-500/20 animate-vibrate" />
          )}

          <AnimatePresence>
            {showZan && (
              <motion.div
                initial={{ scale: 0.1, rotate: -45, opacity: 0 }}
                animate={{ scale: 1.1, rotate: 0, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                className="absolute text-8xl font-black font-serif text-red-600 filter drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]"
              >
                斬
              </motion.div>
            )}
          </AnimatePresence>

          {subState === 'READY' && (
            <div className="text-center font-serif text-stone-300">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-1.5 animate-pulse" />
              <span className="text-xs tracking-widest leading-loose">叩いて開始</span>
            </div>
          )}
        </div>

        {/* Blade slash color trace */}
        {slashTriggered && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div 
              className="w-full h-1.5 shadow-[0_0_15px_rgba(255,255,255,1)] animate-flash-trail"
              style={{
                background: `linear-gradient(to right, transparent, #ffffff, ${swordColor}, #ffffff, transparent)`,
                transform: 'rotate(-25deg)',
              }}
            />
          </div>
        )}

        {/* Dynamic score block overlay */}
        {lastReflex !== null && subState === 'STRIKE_OUTCOME' && (
          <div className="text-center mt-6">
            <span className="text-[10px] text-stone-500 font-mono tracking-widest uppercase block mb-1">REACTION MEASURE</span>
            <span className="text-5xl font-black font-mono text-yellow-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {lastReflex} <span className="text-lg font-normal text-stone-400">ms</span>
            </span>
            <div className={`text-xs font-serif mt-1.5 ${getRankColor(lastReflex)}`}>
              判定 【 {getRankName(lastReflex)} 】
            </div>
          </div>
        )}

        <div className="font-mono text-[10px] text-stone-500 mt-6 bg-stone-900/20 px-3 py-1 rounded">
          {subState === 'READY' && '【 クリック、Space / Fキーで開始 】'}
          {subState === 'TENSION' && '―― 静寂。合図を待て。 ――'}
          {subState === 'ZAN_ACTIVE' && '今だ！'}
          {subState === 'STRIKE_OUTCOME' && '【 クリックで再修練 】'}
          {subState === 'ERROR_EARLY' && '【 お手つき！ クリックで再試行 】'}
        </div>
      </main>

      {/* Dashboard Section: Stats scroll graph */}
      <section className="relative z-20 w-full max-w-xl mx-auto px-4 pb-6 select-none bg-stone-950/70 border-t border-stone-900/60 p-4 rounded-t-xl backdrop-blur-md">
        <h3 className="text-xs font-serif text-stone-400 font-bold border-b border-stone-900 pb-1.5 mb-3 tracking-widest flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-red-500" />
          <span>抜刀記録 (Logs)</span>
        </h3>

        {/* Micro statistics widgets Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div className="bg-stone-900/40 border border-stone-900 p-1.5 rounded">
            <span className="text-[9px] text-stone-500 font-serif block">修練総数</span>
            <strong className="text-sm font-mono text-stone-200">{totalAttemptsCount}</strong>
          </div>
          <div className="bg-stone-900/40 border border-stone-900 p-1.5 rounded">
            <span className="text-[9px] text-stone-500 font-serif block">平均速度</span>
            <strong className="text-sm font-mono text-emerald-400">{averageTime > 0 ? `${averageTime}ms` : '---'}</strong>
          </div>
          <div className="bg-stone-900/40 border border-stone-900 p-1.5 rounded">
            <span className="text-[9px] text-stone-500 font-serif block">修練内最速</span>
            <strong className="text-sm font-mono text-yellow-400">{localBest > 0 ? `${localBest}ms` : '---'}</strong>
          </div>
          <div className="bg-stone-900/40 border border-stone-900 p-1.5 rounded">
            <span className="text-[9px] text-stone-500 font-serif block">歴代最高</span>
            <strong className="text-sm font-mono text-amber-500">{bestTime !== null ? `${bestTime}ms` : '---'}</strong>
          </div>
        </div>

        {/* Draw Scroll Ink line graph (Responsive SVG Canvas drawing) */}
        {totalAttemptsCount > 0 ? (
          <div className="relative w-full border border-stone-900 bg-stone-900/20 p-2 rounded h-28 flex items-center justify-center overflow-hidden">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-full overflow-visible"
            >
              {/* Reference Gridlines (Horizontal targets) */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="rgba(239,68,68,0.15)" strokeWidth="1" strokeDasharray="3,3" />
              <text x={chartWidth - 5} y="15" fill="rgba(239,68,68,0.3)" textAnchor="end" className="text-[8px] font-mono">165ms (神速)</text>
              
              <line x1="0" y1="45" x2={chartWidth} y2="45" stroke="rgba(16,185,129,0.15)" strokeWidth="1" strokeDasharray="3,3" />
              <text x={chartWidth - 5} y="40" fill="rgba(16,185,129,0.3)" textAnchor="end" className="text-[8px] font-mono">270ms (並武)</text>

              {/* Draw connected ink stroke line */}
              {plottedAttempts.length > 1 ? (
                <>
                  <path
                    d={plottedAttempts.map((val, idx) => {
                      const xSpace = chartWidth / (maxPlottedPoints - 1);
                      // Normalized coordinates: max val 500ms, min val 100ms mapped to chartHeight range
                      const normalizedY = Math.min(chartHeight - 4, Math.max(4, ((val - 100) / 400) * (chartHeight - 8)));
                      const x = idx * xSpace;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${normalizedY}`;
                    }).join(' ')}
                    fill="none"
                    stroke={swordColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-glow-trail"
                  />
                  {/* Scatter markers */}
                  {plottedAttempts.map((val, idx) => {
                    const xSpace = chartWidth / (maxPlottedPoints - 1);
                    const normalizedY = Math.min(chartHeight - 4, Math.max(4, ((val - 100) / 400) * (chartHeight - 8)));
                    const x = idx * xSpace;
                    return (
                      <g key={idx}>
                        <circle 
                          cx={x} 
                          cy={normalizedY} 
                          r="3" 
                          fill={val <= 200 ? '#f59e0b' : '#334155'} 
                          stroke={swordColor}
                          strokeWidth="1"
                        />
                        <text x={x} y={normalizedY - 6} fill="#a8a29e" textAnchor="middle" className="text-[7px] font-mono font-bold">
                          {val}
                        </text>
                      </g>
                    );
                  })}
                </>
              ) : (
                <text x={chartWidth / 2} y={chartHeight / 2} fill="#57534e" textAnchor="middle" className="text-xs font-serif">
                  十分な修練データがありません（次の一撃を待つ）
                </text>
              )}
            </svg>
            {/* Ink drop stain background graphics */}
            <div className="absolute top-1 right-2 w-12 h-12 bg-black/10 rounded-full blur-sm border border-stone-800/10 pointer-events-none" />
          </div>
        ) : (
          <div className="border border-dashed border-stone-900 bg-stone-900/10 p-6 rounded text-center text-stone-600 text-xs font-serif leading-relaxed">
            刀を抜き、合図に合わせて斬るべし。
            <br />
            ここにあなたの抜刀速度（反応ミリ秒）の推移を巻物のように描画します。
          </div>
        )}
      </section>

      {/* Footer controls */}
      <footer className="relative w-full p-4 flex justify-between items-center bg-stone-950 border-t border-stone-900/40 z-20">
        <button 
          id="exit_practice_to_menu_btn"
          onClick={onExit}
          className="text-xs font-serif text-stone-400 hover:text-red-400 flex items-center gap-1.5 bg-stone-900 px-4 py-1.5 rounded border border-stone-850 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>修練を中止して道場へ戻る</span>
        </button>

        <span className="text-[10px] font-mono text-stone-500">
          修練難易度目標: {difficulty === 'EASY' ? '380ms' : difficulty === 'NORMAL' ? '270ms' : difficulty === 'HARD' ? '210ms' : '165ms'}
        </span>
      </footer>
    </div>
  );
}
