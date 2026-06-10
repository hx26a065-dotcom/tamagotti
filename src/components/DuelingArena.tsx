/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameMode, Character, DifficultyLevel, GameState, Particle } from '../types';
import { BACKGROUND_ART } from '../data/characters';
import { Synth } from '../utils/audio';
import { Swords, RotateCcw, Award, Zap, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DuelingArenaProps {
  mode: GameMode;
  playerChar: Character;
  opponentChar: Character;
  difficulty: DifficultyLevel;
  swordColor: string;
  onExit: () => void;
  onSaveRecord: (outcome: 'WIN' | 'LOSS' | 'DRAW' | 'FALSE_START_LOSS' | 'FALSE_START_WIN', playerTime: number | null, opponentTime: number | null) => void;
}

type RoundWinner = 'player' | 'opponent' | 'none';

interface RoundResult {
  round: number;
  winner: RoundWinner;
  playerTime: number | null;
  opponentTime: number | null;
  isFalseStart: boolean;
  reason: string;
}

export default function DuelingArena({
  mode,
  playerChar,
  opponentChar,
  difficulty,
  swordColor,
  onExit,
  onSaveRecord,
}: DuelingArenaProps) {
  // Game Play States
  const [round, setRound] = useState(1);
  const [playerWins, setPlayerWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [subState, setSubState] = useState<GameState>('INTRO');
  
  // Tactical parameters
  const [instructionText, setInstructionText] = useState('己の精神を統一し、目を澄ませ...');
  const [reactionLog, setReactionLog] = useState<string>('');
  const [roundLogs, setRoundLogs] = useState<RoundResult[]>([]);
  
  // Active timing markers
  const triggerTimeRef = useRef<number>(0);
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStruckRef = useRef<boolean>(false);
  
  // Player times for current round
  const [p1ReactionTime, setP1ReactionTime] = useState<number | null>(null);
  const [p2ReactionTime, setP2ReactionTime] = useState<number | null>(null); // For local 2P
  
  // Visual effects trigger
  const [showZan, setShowZan] = useState(false);
  const [slashTriggered, setSlashTriggered] = useState<RoundWinner | 'both' | 'none'>('none');
  const [slashAngle, setSlashAngle] = useState(45);
  const [flashScreen, setFlashScreen] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [inkSplats, setInkSplats] = useState<{ id: number; x: number; y: number; s: number }[]>([]);
  
  // Canvas refs for wind particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Character graphic offsets for visual feedback
  const [playerXOffset, setPlayerXOffset] = useState(0);
  const [opponentXOffset, setOpponentXOffset] = useState(0);
  const [playerAnimState, setPlayerAnimState] = useState<'idle' | 'drawing' | 'slashed' | 'dead'>('idle');
  const [opponentAnimState, setOpponentAnimState] = useState<'idle' | 'drawing' | 'slashed' | 'dead'>('idle');

  // Sword sweep visual duration controllers to prevent infinite loop glow overlay
  const [showPlayerSwordArc, setShowPlayerSwordArc] = useState(false);
  const [showOpponentSwordArc, setShowOpponentSwordArc] = useState(false);

  // Multi-round loop: Handle INTRO progression
  useEffect(() => {
    Synth.startWind();
    Synth.playIntroMelody();

    const introTimer = setTimeout(() => {
      setSubState('READY');
      setInstructionText('『一本目、構え』');
    }, 2800);

    return () => {
      clearTimeout(introTimer);
      cleanActiveTimers();
      Synth.stopWind();
    };
  }, []);

  const cleanActiveTimers = () => {
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
  };

  // Canvas Drawing Particles Loop (leaves and wind lines)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize nice red and black particle leaves
    const particles: Particle[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: -(Math.random() * 2 + 1.2),
        vy: Math.random() * 0.8 - 0.4,
        size: Math.random() * 5 + 3,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.4 ? 'rgba(127, 29, 29, 0.65)' : 'rgba(28, 25, 23, 0.45)', // crimson leaves and charcoal dust
      });
    }
    particlesRef.current = particles;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw dust particle wind lines
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) {
          p.x = canvas.width + 10;
          p.y = Math.random() * canvas.height;
        }

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Draw leaf/sakura petal shape
        ctx.translate(p.x, p.y);
        ctx.rotate(p.x * 0.015);
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Special visual ink smoke effects if ZAN_ACTIVE
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Heartbeat sound timing acceleration during target delay
  const startHeartbeatPacing = (estimateDelay: number) => {
    let speedMs = 700;
    const playAndReschedule = () => {
      if (subState !== 'TENSION') return;
      Synth.playHeartbeat(1.15);
      
      // Speed up heartbeat as tension peaks
      speedMs = Math.max(300, speedMs - 80);
      heartbeatIntervalRef.current = setTimeout(playAndReschedule, speedMs);
    };
    heartbeatIntervalRef.current = setTimeout(playAndReschedule, speedMs);
  };

  // State trigger: Handle READY -> TENSION -> TRIGGER (ZAN)
  const handleStartTensionPhase = () => {
    cleanActiveTimers();
    hasStruckRef.current = false;
    setP1ReactionTime(null);
    setP2ReactionTime(null);
    setShowZan(false);
    setSlashTriggered('none');
    setSubState('TENSION');
    setInstructionText('『心を鎮め、待て』');

    // Random timing delay for the quick draw call (Edo style randomized interval: 2.5s - 5.2s)
    const randomDelay = 2300 + Math.random() * 2900;
    startHeartbeatPacing(randomDelay);

    timerTimeoutRef.current = setTimeout(() => {
      // Transition to active strike window! "斬" is displayed!
      cleanActiveTimers();
      
      // Safety guard in case player premature draw clicked (false start) right as this timers fire
      if (hasStruckRef.current) return;

      setSubState('ZAN_ACTIVE');
      setShowZan(true);
      triggerTimeRef.current = performance.now();
      Synth.playSlashSignal();
      
      // Determine CPU strike delay if NOT in local player 2P mode
      if (mode !== 'LOCAL_2P') {
        const cpuReactionTarget = getCPUReactionDelay();
        timerTimeoutRef.current = setTimeout(() => {
          triggerCPUSlash(cpuReactionTarget);
        }, cpuReactionTarget);
      }
    }, randomDelay);
  };

  // Calculate Base CPU Reaction based on selected character or difficulty
  const getCPUReactionDelay = (): number => {
    let baseTime = 250;
    if (mode === 'STORY_CPU') {
      baseTime = opponentChar.reactionBaseMs;
    } else {
      // Reflex practice modes
      switch (difficulty) {
        case 'EASY': baseTime = 380; break;
        case 'NORMAL': baseTime = 270; break;
        case 'HARD': baseTime = 205; break;
        case 'KAMI': baseTime = 165; break;
      }
    }
    // Add realistic millisecond jitter (+- 20ms)
    const jitter = Math.random() * 30 - 15;
    return Math.max(120, baseTime + jitter);
  };

  // CPU executes its strike
  const triggerCPUSlash = (cpuTime: number) => {
    if (hasStruckRef.current || subState !== 'ZAN_ACTIVE') return;
    executeDuelResolution('opponent', cpuTime);
  };

  // User Action inputs (Keydown / Big screen touch click)
  const handleTouchZoneTrigger = () => {
    if (subState === 'READY') {
      Synth.playSwordSwish();
      handleStartTensionPhase();
    } else if (subState === 'TENSION') {
      // Oh no, PREMATURE DRAW! お手つき!
      handleFalseStart('player');
    } else if (subState === 'ZAN_ACTIVE') {
      // Legitimate fast stroke!
      const elapsed = performance.now() - triggerTimeRef.current;
      handlePlayerStrikeAction('player', Math.round(elapsed));
    } else if (subState === 'STRIKE_OUTCOME' || subState === 'VICTORY_SCREEN' || subState === 'ERROR_EARLY') {
      // Skip or tap to reset
      triggerNextRound();
    }
  };

  // Key-listener binds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (subState === 'READY' && (key === ' ' || key === 'f' || key === 'j')) {
        Synth.playSwordSwish();
        handleStartTensionPhase();
        return;
      }

      // Check false start/early clicks during TENSION
      if (subState === 'TENSION') {
        if (mode === 'LOCAL_2P') {
          if (key === 'f') {
            handleFalseStart('player'); // Player 1
          } else if (key === 'j') {
            handleFalseStart('opponent'); // Player 2 represents the opponent slot locally
          }
        } else {
          if (key === ' ' || key === 'f') {
            handleFalseStart('player');
          }
        }
        return;
      }

      // Check legitimate quick-strike during ZAN_ACTIVE
      if (subState === 'ZAN_ACTIVE') {
        const elapsed = Math.round(performance.now() - triggerTimeRef.current);
        
        if (mode === 'LOCAL_2P') {
          if (key === 'f') {
            handlePlayerStrikeAction('player', elapsed);
          } else if (key === 'j') {
            handlePlayerStrikeAction('opponent', elapsed);
          }
        } else {
          if (key === ' ' || key === 'f' || key === 'j') {
            handlePlayerStrikeAction('player', elapsed);
          }
        }
      }

      // Space key to proceed to next round when round is resolved
      if (subState === 'STRIKE_OUTCOME' && key === ' ') {
        e.preventDefault();
        triggerNextRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [subState, mode, round, playerWins, opponentWins, roundLogs]);

  // Record player timing but allow both in 1v1 local before immediate cutscene
  const handlePlayerStrikeAction = (role: 'player' | 'opponent', elapsed: number) => {
    if (hasStruckRef.current) return; // Cutoff, already decided
    
    if (mode === 'LOCAL_2P') {
      if (role === 'player') {
        setP1ReactionTime(elapsed);
        // Instant win for P1 unless P2 also plays super-close.
        executeDuelResolution('player', elapsed);
      } else {
        setP2ReactionTime(elapsed);
        executeDuelResolution('opponent', elapsed);
      }
    } else {
      // Vs CPU
      setP1ReactionTime(elapsed);
      executeDuelResolution('player', elapsed);
    }
  };

  // Handle Premature Draw ("お手つき")
  const handleFalseStart = (culprit: 'player' | 'opponent') => {
    cleanActiveTimers();
    hasStruckRef.current = true;
    Synth.playFalseStartBuzz();
    
    setSubState('ERROR_EARLY');
    setSlashTriggered('none');
    
    // Set animations: offender is dazed, other slashes beautifully in leisure
    if (culprit === 'player') {
      setPlayerAnimState('dead');
      setInstructionText('『 お手つき！ 早すぎた抜刀 』');
      
      // Delay and slice the player down
      setTimeout(() => {
        setOpponentAnimState('drawing');
        setShowOpponentSwordArc(true);
        setTimeout(() => setShowOpponentSwordArc(false), 600);
        setSlashTriggered('opponent');
        setTimeout(() => setSlashTriggered('none'), 600);
        
        triggerSplatsAndShakes(3);
        Synth.playSlashSlice();
        
        // Opponent flashes past player
        setOpponentXOffset(-240);
        
        const newLogs: RoundResult[] = [
          ...roundLogs,
          {
            round,
            winner: 'opponent',
            playerTime: null,
            opponentTime: 0,
            isFalseStart: true,
            reason: 'プレイヤーのお手つき'
          }
        ];
        setRoundLogs(newLogs);
        setOpponentWins((prev) => prev + 1);
        setSubState('STRIKE_OUTCOME');
      }, 950);
    } else {
      // Opponent false start (In Local 2-Player J Key pressed prematurely)
      setOpponentAnimState('dead');
      setInstructionText('『 お手つき！ 早すぎた抜刀 』');

      setTimeout(() => {
        setPlayerAnimState('drawing');
        setShowPlayerSwordArc(true);
        setTimeout(() => setShowPlayerSwordArc(false), 600);
        setSlashTriggered('player');
        setTimeout(() => setSlashTriggered('none'), 600);
        
        triggerSplatsAndShakes(3);
        Synth.playSlashSlice();
        
        setPlayerXOffset(240);
        
        const newLogs: RoundResult[] = [
          ...roundLogs,
          {
            round,
            winner: 'player',
            playerTime: 0,
            opponentTime: null,
            isFalseStart: true,
            reason: '対戦相手のお手つき'
          }
        ];
        setRoundLogs(newLogs);
        setPlayerWins((prev) => prev + 1);
        setSubState('STRIKE_OUTCOME');
      }, 950);
    }
  };

  // Trigger screen shakes, randomized diagonal slashes and any round effects (ink splats are removed for text readability)
  const triggerSplatsAndShakes = (count: number) => {
    setFlashScreen(true);
    setScreenShake(true);
    setSlashAngle(Math.random() > 0.5 ? 35 : -35);
    
    setTimeout(() => setFlashScreen(false), 120);
    setTimeout(() => setScreenShake(false), 500);

    // Ink splatters are disabled to keep text highly visible in the center of the screen
    setInkSplats([]);
  };

  // Core Duel Decider
  const executeDuelResolution = (pushedFirst: 'player' | 'opponent', speedTime: number) => {
    cleanActiveTimers();
    hasStruckRef.current = true;
    setShowZan(false);

    let winnerChar: RoundWinner = 'none';
    let cpuSpeed = 0;
    let actualP1Time = p1ReactionTime;

    if (mode !== 'LOCAL_2P') {
      // VS CPU mode
      cpuSpeed = getCPUReactionDelay();
      actualP1Time = speedTime;

      // Tight tie check: if speeds are within 15ms, it's a mutual blocking clash!
      if (Math.abs(actualP1Time - cpuSpeed) < 18) {
        winnerChar = 'none';
      } else if (actualP1Time < cpuSpeed) {
        winnerChar = 'player';
      } else {
        winnerChar = 'opponent';
      }
    } else {
      // Local 2-Player mode: Whoever pushes first wins
      winnerChar = pushedFirst;
    }

    // Trigger visual slashes
    setSlashTriggered(winnerChar === 'none' ? 'both' : winnerChar);
    setTimeout(() => {
      setSlashTriggered('none');
    }, 600);

    if (winnerChar === 'player') {
      // Player slashed faster!
      setPlayerAnimState('drawing');
      setShowPlayerSwordArc(true);
      setTimeout(() => setShowPlayerSwordArc(false), 600);
      setOpponentAnimState('slashed');
      Synth.playSlashSlice();
      triggerSplatsAndShakes(4);
      
      // Dynamic anime slide step: Player glides past the opponent rightward
      setPlayerXOffset(250);
      setInstructionText(`『 一閃！ (${speedTime}ms) 』`);
      
      const newRoundLogs: RoundResult[] = [
        ...roundLogs,
        {
          round,
          winner: 'player',
          playerTime: speedTime,
          opponentTime: mode !== 'LOCAL_2P' ? Math.round(cpuSpeed) : null,
          isFalseStart: false,
          reason: '電光石火の一撃'
        }
      ];
      setRoundLogs(newRoundLogs);
      setPlayerWins((prev) => prev + 1);
      
      setTimeout(() => {
        setOpponentAnimState('dead');
      }, 700);

    } else if (winnerChar === 'opponent') {
      // Opponent/Rightside hit faster!
      setOpponentAnimState('drawing');
      setShowOpponentSwordArc(true);
      setTimeout(() => setShowOpponentSwordArc(false), 600);
      setPlayerAnimState('slashed');
      Synth.playSlashSlice();
      triggerSplatsAndShakes(4);
      
      // Opponent glides past player leftward
      setOpponentXOffset(-250);
      
      const displayTime = mode === 'LOCAL_2P' ? speedTime : Math.round(cpuSpeed);
      setInstructionText(`『 無念！ 敗北。 (${displayTime}ms) 』`);
      
      const newRoundLogs: RoundResult[] = [
        ...roundLogs,
        {
          round,
          winner: 'opponent',
          playerTime: mode !== 'LOCAL_2P' ? speedTime : null,
          opponentTime: displayTime,
          isFalseStart: false,
          reason: '対戦相手の電光一閃'
        }
      ];
      setRoundLogs(newRoundLogs);
      setOpponentWins((prev) => prev + 1);

      setTimeout(() => {
        setPlayerAnimState('dead');
      }, 700);

    } else {
      // TIE CLASH!
      setShowPlayerSwordArc(true);
      setShowOpponentSwordArc(true);
      setTimeout(() => {
        setShowPlayerSwordArc(false);
        setShowOpponentSwordArc(false);
      }, 600);
      Synth.playSwordClash();
      triggerSplatsAndShakes(2);
      
      // Push characters together and bounce back
      setPlayerXOffset(80);
      setOpponentXOffset(-80);
      setInstructionText(`『 相打ち！ (${speedTime}ms) 』`);
      
      const newRoundLogs: RoundResult[] = [
        ...roundLogs,
        {
          round,
          winner: 'none',
          playerTime: speedTime,
          opponentTime: Math.round(cpuSpeed),
          isFalseStart: false,
          reason: '鍔迫り合い (同時刃)'
        }
      ];
      setRoundLogs(newRoundLogs);

      setTimeout(() => {
        // bounce back sheathing
        setPlayerXOffset(0);
        setOpponentXOffset(0);
      }, 600);
    }

    setSubState('STRIKE_OUTCOME');
  };

  // Progression of rounds
  const triggerNextRound = () => {
    // Check match victory constraints: Best of 3 rounds (first to 2 wins)
    const finalWinsRequired = 2;

    if (playerWins >= finalWinsRequired || opponentWins >= finalWinsRequired) {
      setSubState('VICTORY_SCREEN');
      
      // Save logs to history
      const finalOutcome = playerWins >= finalWinsRequired ? 'WIN' : 'LOSS';
      const bestP1Time = roundLogs
        .filter((r) => r.winner === 'player' && r.playerTime !== null && r.playerTime > 0)
        .map((r) => r.playerTime!)
        .reduce((min, cur) => (cur < min ? cur : min), 9999);

      onSaveRecord(
        finalOutcome,
        bestP1Time === 9999 ? null : bestP1Time,
        roundLogs.length > 0 ? roundLogs[0].opponentTime : null
      );
      
      if (playerWins >= finalWinsRequired) {
        Synth.playVictoryMelody();
      } else {
        Synth.playFalseStartBuzz();
      }
    } else {
      // Setup next round
      setRound((prev) => prev + 1);
      setSubState('READY');
      setPlayerAnimState('idle');
      setOpponentAnimState('idle');
      setPlayerXOffset(0);
      setOpponentXOffset(0);
      setInkSplats([]);
      setP1ReactionTime(null);
      setP2ReactionTime(null);
      setSlashTriggered('none');
      setShowPlayerSwordArc(false);
      setShowOpponentSwordArc(false);
      setInstructionText(`『 ${round + 1}本目、構え 』`);
    }
  };

  const handleResetMatch = () => {
    setRound(1);
    setPlayerWins(0);
    setOpponentWins(0);
    setRoundLogs([]);
    setInkSplats([]);
    setPlayerAnimState('idle');
    setOpponentAnimState('idle');
    setPlayerXOffset(0);
    setOpponentXOffset(0);
    setSlashTriggered('none');
    setShowPlayerSwordArc(false);
    setShowOpponentSwordArc(false);
    setSubState('READY');
    setInstructionText('『一本目、構え』');
    Synth.playIntroMelody();
  };

  const latestLog = roundLogs[roundLogs.length - 1];

  return (
    <div 
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-stone-950 select-none ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(71,10,10,0.4), rgba(0,0,0,0.85)), url(${BACKGROUND_ART})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Absolute dramatic flash block overlay */}
      {flashScreen && (
        <div className="absolute inset-0 bg-red-600 z-40 transition-opacity pointer-events-none" />
      )}

      {/* Ink Splatter overlays - Removed for readability */}

      {/* Wind particle Canvas layer */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />

      {/* RED/CHARCOAL VIGNETTE SHADING */}
      <div 
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(16,13,12,0.95)_100%)] pointer-events-none transition-all duration-1000 ${
          subState === 'TENSION' ? 'opacity-100 scale-95 shadow-inner' : 'opacity-85'
        }`} 
      />

      {/* Dynamic Header: Blossom Cherry Round Indicators */}
      <header className="relative w-full z-20 p-4 flex justify-between items-center bg-stone-950/40 backdrop-blur-sm border-b border-stone-900/50">
        {/* Left Side: Player Bio */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-stone-950 border border-stone-800 overflow-hidden bg-cover bg-center">
            <img src={playerChar.avatar} alt={playerChar.name} className="w-full h-full object-cover grayscale active:grayscale-0" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-stone-200">{playerChar.name}</div>
            <div className="flex gap-1.5 mt-1 font-serif">
              {[...Array(2)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-sm ${i < playerWins ? 'text-red-500 hover:scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'text-stone-700'}`}
                >
                  🌸
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Central HUD Panel */}
        <div className="text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500/80 font-bold block mb-0.5">
            {mode === 'LOCAL_2P' ? '双刃相打 (1v1 LOCAL)' : `第 ${round} 本目 / 剣豪決戦`}
          </span>
          <div className="px-3 py-1 border border-stone-800/80 bg-stone-950/80 text-[11px] font-mono text-stone-300 rounded inline-block">
            {mode !== 'LOCAL_2P' && (
              <span>難易度: <strong className="text-amber-500 font-bold">{difficulty}</strong></span>
            )}
            {mode === 'LOCAL_2P' && (
              <span>[ F ] P1左 ‖ [ J ] P2右</span>
            )}
          </div>
        </div>

        {/* Right Side: Opponent Bio */}
        <div className="flex items-center gap-3 text-right flex-row-reverse">
          <div className="w-10 h-10 rounded bg-stone-950 border border-red-950/40 overflow-hidden bg-cover bg-center">
            <img src={opponentChar.avatar} alt={opponentChar.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-stone-200">
              {mode === 'LOCAL_2P' ? '二首・右剣士 (J)' : opponentChar.name}
            </div>
            <div className="flex flex-row-reverse gap-1.5 mt-1 font-serif">
              {[...Array(2)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-sm ${i < opponentWins ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'text-stone-700'}`}
                >
                  🌸
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Central Interactive Playground / Canvas */}
      <main 
        id="duel_tap_play_zone"
        onClick={handleTouchZoneTrigger}
        className="relative flex-grow flex flex-col justify-center items-center cursor-pointer z-10 w-full"
      >
        {/* Calligraphy / Background Atmosphere message */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-stone-400/80 text-xs text-center font-serif tracking-[0.2em] pointer-events-none select-none max-w-sm px-4">
          {instructionText}
        </div>

        <div className="relative w-full max-w-4xl h-80 flex justify-between items-end px-12 md:px-24 mb-6">
          
          {/* PLAYER FIGURE (LEFT) */}
          <div 
            className={`flex flex-col items-center select-none ${
              playerAnimState === 'drawing' 
                ? 'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.15,0.85,0.35,1)]' 
                : 'transition-all duration-700 ease-out'
            }`}
            style={{ 
              transform: `translateX(${playerXOffset}px)`,
              opacity: playerAnimState === 'dead' ? 0.45 : playerAnimState === 'slashed' ? 0.75 : 1 
            }}
          >
            {/* Visual Portrait overlapping near base of player */}
            <div className="w-20 h-24 mb-2 bg-stone-950 rounded border border-indigo-500/40 bg-cover bg-center shadow-lg relative shrink-0">
              <img 
                src={playerChar.avatar} 
                className={`w-full h-full object-cover transition-all ${
                  subState === 'TENSION' ? 'contrast-125 brightness-75 grayscale-[40%]' : 'contrast-100 opacity-90'
                }`} 
                alt="player face"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-1 right-1 bg-stone-900 border border-indigo-500/50 rounded-full w-2.5 h-2.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>

            {/* Simple Dynamic SVG stance depicting beautiful samurai women */}
            <div className="relative h-40 w-24">
              <svg viewBox="0 0 120 180" className="w-full h-full overflow-visible">
                <defs>
                  {/* Neon sword blade light */}
                  <linearGradient id="pSwordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor={swordColor} />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>
                  {/* Dynamic sword visual arc */}
                  <radialGradient id="pSlashArc" cx="30%" cy="80%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="30%" stopColor={swordColor} stopOpacity="0.8" />
                    <stop offset="70%" stopColor={swordColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                  {/* Kimono shadows */}
                  <linearGradient id="pKimonoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f5f5f4" />
                    <stop offset="100%" stopColor="#d6d3d1" />
                  </linearGradient>
                  <linearGradient id="pHakamaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* 抜刀時の流麗な剣閃アーク(巨大弧月) */}
                {showPlayerSwordArc && (
                  <path 
                    d="M 35 110 A 70 70 0 0 1 115 50 L 95 45 A 50 50 0 0 0 40 100 Z" 
                    fill="url(#pSlashArc)" 
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 15px ${swordColor})` }}
                  />
                )}

                {/* 風に舞う長い漆黒の髪 (1P: ポニーテール＆なびく髪) */}
                <ellipse cx="48" cy="37" rx="10" ry="14" fill="#0f0f11" />
                <path d="M48,32 Q25,40 20,62 Q28,52 38,42" fill="#0f0f11" />
                <path d="M48,24 Q10,12 15,48 Q32,32 46,30" fill="#09090b" opacity="0.9" />
                
                {/* 居合の低重心・前傾スタンス（白の着物と藍の袴） */}
                {/* 体のベース（肌・首） */}
                <ellipse cx="50" cy="48" rx="5" ry="6" fill="#fbcfe8" />

                {/* 袴 (低重心、片足が大きく踏み込む流線的な袴) */}
                <path 
                  d="M18,90 L75,90 L85,165 L10,165 Z" 
                  fill="url(#pHakamaGrad)" 
                  className={subState === 'TENSION' ? 'animate-wind-sway' : ''}
                />
                
                {/* 白い着物（前傾のために斜めに傾いている） */}
                <path d="M30,65 L70,62 L75,95 L25,95 Z" fill="url(#pKimonoGrad)" />
                <path d="M38,64 L62,62 L60,88 L32,88 Z" fill="#e7e5e4" />

                {/* 真紅の帯 (Obi) */}
                <rect x="25" y="88" width="50" height="7" fill="#be185d" transform="rotate(-2 50 91)" />
                
                {/* 風で後ろになびく袂（袖）のダイナミック、かつシャープな折り目 */}
                <path d="M30,65 Q5,85 15,115 Q30,105 32,92 Z" fill="#e7e5e4" />
                <path d="M70,62 Q88,80 82,108 Q70,95 72,85" fill="#d6d3d1" />

                {/* 片手を鞘口に、もう片手は抜き手のために重心を下げる腕のライン */}
                {/* 左腕（鞘側） */}
                <path d="M35,66 Q15,82 28,102" fill="none" stroke="#f5f5f4" strokeWidth="7" strokeLinecap="round" />
                {/* 右腕（抜刀。drawing中は前を薙ぐ、idle中は鞘に添える） */}
                {playerAnimState === 'drawing' ? (
                  <path d="M68,64 Q95,78 110,65" fill="none" stroke="#f5f5f4" strokeWidth="6.5" strokeLinecap="round" />
                ) : (
                  <path d="M55,64 Q40,82 30,94" fill="none" stroke="#f5f5f4" strokeWidth="6.5" strokeLinecap="round" />
                )}

                {/* 抜刀した瞬間の刀身 (メタリックな反り、光の軌跡) */}
                {playerAnimState === 'drawing' ? (
                  <path 
                    d="M 30,94 Q 85,70 115,55" 
                    fill="none" 
                    stroke="url(#pSwordGrad)" 
                    strokeWidth="5" 
                    strokeLinecap="round"
                    className="animate-glow-trail"
                    style={{ filter: `drop-shadow(0 0 10px ${swordColor})` }}
                  />
                ) : (
                  // 黒漆塗りの上品な鞘（腰に差す）
                  <path d="M28,94 L5,108" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                )}

                {/* 美しい顔立ち（陰影・目元） */}
                <ellipse cx="50" cy="38" rx="8.5" ry="10" fill="#fee2e2" />
                {/* 凛々しい黒髪の束 */}
                <circle cx="50" cy="28" r="3.5" fill="#0f0f11" />
                <path d="M50,28 Q65,12 55,42" fill="none" stroke="#09090b" strokeWidth="3.5" strokeLinecap="round" />
                
                {/* クールな目元あるいは眼光エフェクト */}
                {subState === 'TENSION' ? (
                  // 静寂の中の鮮緑の眼光
                  <path d="M44,38 L56,38" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px #10b981)' }} />
                ) : playerAnimState === 'drawing' ? (
                  // 抜刀時は雷撃のような鋭いシアン眼光
                  <path d="M42,36 L58,36" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px #06b6d4)' }} />
                ) : (
                  // 平常時
                  <line x1="43" y1="38" x2="57" y2="38" stroke="#1c1917" strokeWidth="2" />
                )}

                {/* 闘気 or 心の集中表示（TENSION中） */}
                {subState === 'TENSION' && (
                  <g className="animate-pulse">
                    <circle cx="50" cy="12" r="1.5" fill="#10b981" />
                    <path d="M50,14 L50,18" stroke="#10b981" strokeWidth="1" />
                  </g>
                )}
              </svg>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 tracking-wider">
              {playerChar.swordName}
            </span>
          </div>

          {/* DYNAMIC SHINING "斬" INDICATOR IN DEAD-CENTER */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-20">
            <AnimatePresence>
              {showZan && (
                <motion.div
                  initial={{ scale: 0.1, y: 15, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.35, 1], 
                    rotate: [0, -5, 0],
                    opacity: 1 
                  }}
                  exit={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex flex-col items-center"
                >
                  {/* Huge dramatic calligraphy Kanji */}
                  <div className="text-8xl md:text-9xl font-black font-serif text-red-600 tracking-widest drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-glow-zan filter">
                    斬
                  </div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 140 }}
                    className="h-[3px] bg-red-600 mt-2 rounded shadow-[0_0_10px_rgb(239,68,68)]"
                  />
                  <span className="text-[10px] font-serif uppercase tracking-[0.4em] text-red-100 font-extrabold mt-1.5 drop-shadow-md">
                    DRAW ! (引き抜け!)
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cinematic Center-Screen Round Outcomes */}
            {subState === 'STRIKE_OUTCOME' && latestLog && latestLog.winner === 'player' && (
              <motion.div
                initial={{ scale: 0.2, opacity: 0, rotate: -15 }}
                animate={{ scale: [1.4, 0.9, 1.1, 1], opacity: 1, rotate: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex flex-col items-center bg-stone-950/90 border border-amber-500/35 px-10 py-5 rounded-md backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.25)] min-w-[240px]"
              >
                <div className="text-7xl md:text-8xl font-black font-serif text-yellow-500 tracking-widest drop-shadow-[0_0_20px_rgba(234,179,8,0.85)] text-center whitespace-nowrap">
                  {mode === 'LOCAL_2P' ? '左・1本' : '1本'}
                </div>
                <div className="h-[2px] w-32 bg-yellow-500 mt-2 rounded shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
                {latestLog.isFalseStart && (
                  <span className="text-xs font-serif text-yellow-100 font-bold mt-1.5 drop-shadow">
                    相手のお手つきにより勝利！
                  </span>
                )}
                {latestLog.playerTime && latestLog.playerTime > 0 ? (
                  <span className="text-[10px] font-mono text-yellow-400 mt-1 opacity-90">
                    反応速度: {latestLog.playerTime}ms
                  </span>
                ) : null}
              </motion.div>
            )}

            {subState === 'STRIKE_OUTCOME' && latestLog && latestLog.winner === 'opponent' && (
              <motion.div
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: [1.2, 0.95, 1], opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeIn' }}
                className="flex flex-col items-center bg-stone-950/90 border border-red-950/50 px-10 py-5 rounded-md backdrop-blur-md shadow-[0_0_50px_rgba(239,68,68,0.2)] min-w-[240px]"
              >
                <div className="text-6xl md:text-7xl font-black font-serif text-red-600 tracking-wider drop-shadow-[0_0_25px_rgba(185,28,28,0.95)] text-center whitespace-nowrap">
                  {mode === 'LOCAL_2P' ? '右・1本' : '討たれた'}
                </div>
                <div className="h-[2px] w-32 bg-red-800 mt-2 rounded shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <span className="text-xs font-serif text-red-400 font-bold mt-1.5 drop-shadow">
                  {latestLog.isFalseStart ? 'お手つきによる敗北' : '敵手鮮烈なる一刀'}
                </span>
                {latestLog.opponentTime && latestLog.opponentTime > 0 ? (
                  <span className="text-[10px] font-mono text-red-500/80 mt-1">
                    {mode === 'LOCAL_2P' ? `反応速度: ${latestLog.opponentTime}ms` : `敵の速度: ${latestLog.opponentTime}ms`}
                  </span>
                ) : null}
              </motion.div>
            )}

            {subState === 'STRIKE_OUTCOME' && latestLog && latestLog.winner === 'none' && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center bg-stone-950/90 border border-stone-800 px-10 py-5 rounded-md backdrop-blur-md shadow-[0_0_40px_rgba(255,255,255,0.05)] min-w-[240px]"
              >
                <div className="text-6xl md:text-7xl font-black font-serif text-stone-300 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                  相打ち
                </div>
                <div className="h-[2px] w-32 bg-stone-600 mt-2 rounded" />
                <span className="text-xs font-serif text-stone-400 font-bold mt-1.5 drop-shadow">
                  一瞬の差もなき同時刃
                </span>
                <span className="text-[10px] font-mono text-stone-400 mt-1">
                  反応速度: {latestLog.playerTime}ms
                </span>
              </motion.div>
            )}

            {/* Late click alerts */}
            {subState === 'READY' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-11 h-11 rounded-full border border-stone-800 bg-stone-900/90 flex items-center justify-center text-red-500 animate-pulse text-lg font-serif tracking-widest shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  庵
                </div>
                <span className="text-[9px] text-stone-500 font-mono tracking-widest mt-1 uppercase">TAP TO INITIATE (叩いて構え)</span>
              </motion.div>
            )}
          </div>

          {/* RIVAL/OPPONENT FIGURE (RIGHT) */}
          <div 
            className={`flex flex-col items-center select-none ${
              opponentAnimState === 'drawing' 
                ? 'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.15,0.85,0.35,1)]' 
                : 'transition-all duration-700 ease-out'
            }`}
            style={{ 
              transform: `translateX(${opponentXOffset}px)`,
              opacity: opponentAnimState === 'dead' ? 0.45 : opponentAnimState === 'slashed' ? 0.75 : 1 
            }}
          >
            {/* Visual Portrait overlaying near base of rival */}
            <div className="w-20 h-24 mb-2 bg-stone-950 rounded border border-rose-500/40 bg-cover bg-center shadow-lg relative shrink-0">
              <img 
                src={opponentChar.avatar} 
                className={`w-full h-full object-cover transition-all ${
                  subState === 'TENSION' ? 'contrast-130 brightness-75 grayscale-[30%] scale-102' : 'contrast-100 opacity-90'
                }`} 
                alt="rival face"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-1 left-1 bg-stone-900 border border-rose-500/50 rounded-full w-2.5 h-2.5 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            </div>

            {/* Opponent dynamic SVG structure */}
            <div className="relative h-40 w-24">
              <svg viewBox="0 0 120 180" className="w-full h-full overflow-visible">
                <defs>
                  {/* Neon sword blade light (Rival) */}
                  <linearGradient id="oSwordGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>
                  {/* Dynamic sword visual arc (Rival) */}
                  <radialGradient id="oSlashArc" cx="70%" cy="80%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="30%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="70%" stopColor="#991b1b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                  {/* Kimono shadows (Rival) */}
                  <linearGradient id="oKimonoGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e1916" />
                    <stop offset="100%" stopColor="#292524" />
                  </linearGradient>
                  <linearGradient id="oHakamaGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#991b1b" />
                    <stop offset="100%" stopColor="#450a0a" />
                  </linearGradient>
                </defs>

                {/* 抜刀時の流麗な剣閃アーク(巨大弧月) */}
                {showOpponentSwordArc && (
                  <path 
                    d="M 85 110 A 70 70 0 0 0 5 50 L 25 45 A 50 50 0 0 1 80 100 Z" 
                    fill="url(#oSlashArc)" 
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 15px #ef4444)` }}
                  />
                )}

                {/* 風に舞う長い宿敵の黒髪 */}
                <ellipse cx="52" cy="37" rx="10" ry="14" fill="#141416" />
                <path d="M52,32 Q75,40 80,62 Q72,52 62,42" fill="#141416" />
                <path d="M52,24 Q90,12 85,48 Q68,32 54,30" fill="#09090b" opacity="0.9" />
                
                {/* 居合の低重心・前傾スタンス（黒の着物と緋の袴） */}
                <ellipse cx="50" cy="48" rx="5" ry="6" fill="#fbcfe8" />

                {/* 緋の袴 (低重心片足踏み込み) */}
                <path 
                  d="M102,90 L45,90 L35,165 L110,165 Z" 
                  fill="url(#oHakamaGrad)" 
                  className={subState === 'TENSION' ? 'animate-wind-sway' : ''}
                />
                
                {/* 黒い着物（前傾のために斜めに傾いている） */}
                <path d="M90,65 L50,62 L45,95 L95,95 Z" fill="url(#oKimonoGrad)" />
                <path d="M82,64 L58,62 L60,88 L88,88 Z" fill="#292524" />

                {/* 琥珀色の帯 (Obi) */}
                <rect x="45" y="88" width="50" height="7" fill="#d97706" transform="rotate(2 50 91)" />
                
                {/* はためく袖 */}
                <path d="M90,65 Q115,85 105,115 Q90,105 88,92 Z" fill="#1e1916" />
                <path d="M30,62 Q12,80 18,108 Q30,95 28,85" fill="#1e293b" />

                {/* 腕の居合ライン */}
                {/* 右腕 */}
                <path d="M85,66 Q105,82 92,102" fill="none" stroke="#292524" strokeWidth="7" strokeLinecap="round" />
                {/* 左腕 */}
                {opponentAnimState === 'drawing' ? (
                  <path d="M52,64 Q25,78 10,65" fill="none" stroke="#fbcfe8" strokeWidth="6.5" strokeLinecap="round" />
                ) : (
                  <path d="M65,64 Q80,82 90,94" fill="none" stroke="#292524" strokeWidth="6.5" strokeLinecap="round" />
                )}

                {/* 抜刀した瞬間の刀身 (緋色のオーラ) */}
                {opponentAnimState === 'drawing' ? (
                  <path 
                    d="M 90,94 Q 35,70 5,55" 
                    fill="none" 
                    stroke="url(#oSwordGrad)" 
                    strokeWidth="5" 
                    strokeLinecap="round"
                    className="animate-glow-trail"
                    style={{ filter: `drop-shadow(0 0 10px #ef4444)` }}
                  />
                ) : (
                  // 黒漆塗りの鞘
                  <path d="M72,94 L95,108" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                )}

                {/* 顔立ち */}
                <ellipse cx="50" cy="38" rx="8.5" ry="10" fill="#fee2e2" />
                <circle cx="50" cy="28" r="3.5" fill="#141416" />
                <path d="M50,28 Q35,12 45,42" fill="none" stroke="#09090b" strokeWidth="3.5" strokeLinecap="round" />
                
                {/* 赤い目元の眼光 */}
                {subState === 'TENSION' ? (
                  <path d="M44,38 L56,38" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px #be185d)' }} />
                ) : opponentAnimState === 'drawing' ? (
                  <path d="M42,36 L58,36" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px #f43f5e)' }} />
                ) : (
                  <line x1="43" y1="38" x2="57" y2="38" stroke="#ef4444" strokeWidth="1.5" />
                )}

                {/* 闘気表示 */}
                {subState === 'TENSION' && (
                  <g className="animate-pulse">
                    <circle cx="50" cy="12" r="1.5" fill="#be185d" />
                    <path d="M50,14 L50,18" stroke="#be185d" strokeWidth="1" />
                  </g>
                )}
              </svg>
            </div>
            <span className="text-[10px] font-mono text-rose-400 tracking-wider">
              {opponentChar.swordName}
            </span>
          </div>

        </div>

        {/* NEON SWORD SLASH TRAIL EFFECT DISPLAY OVERLAY */}
        {slashTriggered !== 'none' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-35 overflow-hidden">
            {/* Main Thick blinding slash */}
            <div 
              className="w-full h-8 shadow-[0_0_40px_rgba(255,255,255,1)] animate-flash-trail"
              style={{
                background: `linear-gradient(to right, transparent, rgba(255,255,255,0.9), ${
                  slashTriggered === 'player' ? swordColor : '#ef4444'
                }, rgba(255,255,255,0.9), transparent)`,
                transform: `rotate(${slashAngle}deg)`,
              }}
            />
            {/* Secondary companion trace for speed feel */}
            <div 
              className="absolute w-full h-1.5 opacity-80 animate-flash-trail"
              style={{
                background: `linear-gradient(to right, transparent, #ffffff, ${
                  slashTriggered === 'player' ? '#ffffff' : '#f43f5e'
                }, transparent)`,
                transform: `rotate(${slashAngle + 8}deg) translateY(-20px)`,
                animationDelay: '0.04s'
              }}
            />
            <div 
              className="absolute w-full h-1.5 opacity-80 animate-flash-trail"
              style={{
                background: `linear-gradient(to right, transparent, #ffffff, ${
                  slashTriggered === 'player' ? swordColor : '#991b1b'
                }, transparent)`,
                transform: `rotate(${slashAngle - 8}deg) translateY(20px)`,
                animationDelay: '0.08s'
              }}
            />
            {/* Blazing Sparks burst */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const dist = 60 + Math.random() * 120;
                const dx = Math.cos(angle) * dist;
                const dy = Math.sin(angle) * dist;
                return (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white animate-ping"
                    style={{
                      transform: `translate(${dx}px, ${dy}px)`,
                      boxShadow: `0 0 10px 2px ${slashTriggered === 'player' ? swordColor : '#ef4444'}`,
                      animationDuration: '0.4s'
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button Indicator */}
        <div className="text-center font-mono text-[11px] text-stone-500 bg-stone-900/20 px-4 py-1.5 rounded border border-stone-800/20 max-w-xs mt-4">
          {subState === 'READY' && '【 画面を叩くか SPACE / F キーで開始 】'}
          {subState === 'TENSION' && '―― 呼吸を乱すな。待て。 ――'}
          {subState === 'ZAN_ACTIVE' && '斬れええ！！！ (TAP / CLICK/ KEYB)'}
          {subState === 'STRIKE_OUTCOME' && '【 叩いて次本（次ラウンド）へ 】'}
          {subState === 'ERROR_EARLY' && '【 焦りの極み！ 叩いて仕切り直し 】'}
          {subState === 'VICTORY_SCREEN' && '【 勝負終局 】'}
        </div>
      </main>

      {/* Match Post-Result Panel Overlay */}
      {subState === 'STRIKE_OUTCOME' && (
        <div className="px-6 py-3 bg-stone-950/80 border-t border-b border-stone-900/60 flex flex-col md:flex-row justify-between items-center z-20 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-red-500 font-serif font-black animate-bounce text-base">■</span>
            <div className="text-stone-300 font-sans text-xs">
              <span className="font-serif">第 {round} 本・決着：</span>
              {roundLogs[roundLogs.length - 1]?.isFalseStart ? (
                <span className="text-red-400 font-semibold">{roundLogs[roundLogs.length-1].reason}</span>
              ) : (
                <>
                  <span>
                    あなた: 
                    <strong className="text-indigo-400 font-mono ml-1">
                      {roundLogs[roundLogs.length - 1]?.playerTime ? `${roundLogs[roundLogs.length - 1].playerTime}ms` : '失格'}
                    </strong>
                  </span>
                  <span className="mx-2">に対し</span>
                  <span>
                    敵手: 
                    <strong className="text-rose-400 font-mono">
                      {roundLogs[roundLogs.length - 1]?.opponentTime ? `${roundLogs[roundLogs.length - 1].opponentTime}ms` : '失格'}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            id="next_round_btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerNextRound();
            }}
            className="px-6 py-1.5 bg-red-600/90 text-white font-serif tracking-widest hover:bg-red-500 text-xs border border-red-500/50 rounded transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)] shrink-0"
          >
            次 の 尋 常 へ 進 む
          </button>
        </div>
      )}

      {/* MATCH END FINAL VICTORY & SETTLEMENT SCREEN OVERLAY */}
      {subState === 'VICTORY_SCREEN' && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          id="victory_final_overlay"
        >
          <div className="bg-[radial-gradient(ellipse_at_center,#1e1b4b_0%,#09090b_100%)] border border-stone-800/80 p-8 rounded-lg max-w-xl w-full text-center relative shadow-[0_0_100px_rgba(239,68,68,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
            
            {/* Calligraphy Seal Backdrop */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl text-stone-900 font-black font-serif select-none -z-10 tracking-widest">
              勝
            </div>

            <div className="mb-6">
              <span className="text-stone-500 font-mono text-xs uppercase tracking-widest block mb-1">FINAL BATTLE OUTCOME （決着）</span>
              <h3 className={`text-4xl md:text-5xl font-extrabold font-serif tracking-widest ${
                playerWins > opponentWins ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'text-stone-400'
              }`}>
                {playerWins > opponentWins ? '【 見 事 勝利 】' : '【 敗 北 討 死 】'}
              </h3>
              <p className="text-stone-500 text-xs mt-3 leading-relaxed font-sans max-w-sm mx-auto">
                {playerWins > opponentWins 
                  ? `「流水の一閃」見事なり。あなたは美女剣士「${opponentChar.name}」を制し、己の剣心を示した。` 
                  : `強敵「${opponentChar.name}」の刃が一瞬早くあなたの胸を貫いた。修行を積み、再度挑め。`
                }
              </p>
            </div>

            {/* Statistics details */}
            <div className="bg-stone-950/60 border border-stone-900 rounded p-4 mb-6 text-left max-h-52 overflow-y-auto">
              <span className="text-[11px] font-serif tracking-widest text-red-500 block border-b border-stone-900 pb-1.5 mb-2 font-bold">一本ごとの記録 (Combat logs)</span>
              <div className="flex flex-col gap-2 font-mono text-xs max-h-40">
                {roundLogs.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-stone-900/50">
                    <span className="font-serif text-stone-400">一本目：P1: {log.playerTime ? `${log.playerTime}ms` : 'お手つき'} vs CPU: {log.opponentTime ? `${log.opponentTime}ms` : 'お手つき'}</span>
                    <span className={`font-bold ${log.winner === 'player' ? 'text-green-500' : log.winner === 'opponent' ? 'text-red-500' : 'text-stone-500'}`}>
                      {log.winner === 'player' ? '勝 (WIN)' : log.winner === 'opponent' ? '敗 (LOSS)' : '分 (TIE)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom menu buttons */}
            <div className="flex gap-4">
              <button
                id="victory_try_again_btn"
                onClick={handleResetMatch}
                className="w-1/2 py-2.5 bg-red-800/80 hover:bg-red-700 font-serif tracking-widest text-xs font-bold border border-red-500/30 text-white rounded transition-colors"
              >
                再 戦 す る
              </button>
              <button
                id="victory_to_menu_btn"
                onClick={onExit}
                className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-800 font-serif tracking-widest text-xs font-bold border border-stone-800 text-stone-300 rounded transition-colors"
              >
                道場へ戻る(終了)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Ambient footer */}
      <footer className="relative w-full text-center bg-stone-950/35 p-3 flex justify-between items-center px-4 border-t border-stone-900/40 z-20">
        <button 
          id="exit_duel_btn"
          onClick={onExit}
          className="text-[11px] font-serif text-stone-400 hover:text-red-400 flex items-center gap-1 bg-stone-950/40 border border-stone-900 px-3 py-1 rounded transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>決闘を放棄して道場へ戻る</span>
        </button>
        <span className="text-[10px] font-mono text-stone-500 hidden sm:inline">
          {subState === 'TENSION' ? '【 緊 張 】 呼吸頻度 42bpm' : '【 平常心 】'}
        </span>
      </footer>
    </div>
  );
}
