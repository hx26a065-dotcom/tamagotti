/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, Character, DifficultyLevel, DuelRecord } from './types';
import StartScreen from './components/StartScreen';
import DuelingArena from './components/DuelingArena';
import PracticeArena from './components/PracticeArena';
import Leaderboard from './components/Leaderboard';
import { Play, Swords, Skull, ShieldCheck } from 'lucide-react';
import { Synth } from './utils/audio';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'TITLE' | 'DUEL' | 'PRACTICE'>('TITLE');
  
  // Tactical setups
  const [playerChar, setPlayerChar] = useState<Character | null>(null);
  const [opponentChar, setOpponentChar] = useState<Character | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('STORY_CPU');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('NORMAL');
  const [swordColor, setSwordColor] = useState('#3b82f6');
  
  // Persistent metrics
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [winStreak, setWinStreak] = useState<number>(0);
  const [records, setRecords] = useState<DuelRecord[]>([]);

  // Hydrate persistence stats on load
  useEffect(() => {
    try {
      // 1. Reaction speed
      const savedBest = localStorage.getItem('iaido_best_reaction_ms');
      if (savedBest) {
        setBestTime(parseInt(savedBest, 10));
      }

      // 2. Win streaks
      const savedStreak = localStorage.getItem('iaido_winstreak');
      if (savedStreak) {
        setWinStreak(parseInt(savedStreak, 10));
      }

      // 3. Duel histories
      const savedLogs = localStorage.getItem('iaido_duel_records');
      if (savedLogs) {
        setRecords(JSON.parse(savedLogs));
      }
    } catch (e) {
      console.warn('Could not read state from localStorage:', e);
    }
  }, []);

  // Save new best time helper
  const handleSaveBestTime = (time: number) => {
    localStorage.setItem('iaido_best_reaction_ms', time.toString());
    setBestTime(time);
  };

  // Record a finished duel match
  const handleSaveDuelRecord = (
    outcome: 'WIN' | 'LOSS' | 'DRAW' | 'FALSE_START_LOSS' | 'FALSE_START_WIN',
    playerTime: number | null,
    opponentTime: number | null
  ) => {
    const newRecord: DuelRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      mode: gameMode,
      opponentName: gameMode === 'LOCAL_2P' ? '二首・右剣士 (J)' : (opponentChar?.name || '修行CPU'),
      difficulty,
      outcome,
      playerTime,
      opponentTime
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    localStorage.setItem('iaido_duel_records', JSON.stringify(updatedRecords));

    // Handle Streak progression (Only for Singleplayer Story CPU)
    if (gameMode === 'STORY_CPU') {
      if (outcome === 'WIN' || outcome === 'FALSE_START_WIN') {
        const nextStreak = winStreak + 1;
        setWinStreak(nextStreak);
        localStorage.setItem('iaido_winstreak', nextStreak.toString());
      } else if (outcome === 'LOSS' || outcome === 'FALSE_START_LOSS') {
        setWinStreak(0);
        localStorage.setItem('iaido_winstreak', '0');
      }
    }

    // Save fast reaction values if player won legitimately
    if (playerTime && playerTime > 0 && (outcome === 'WIN' )) {
      if (bestTime === null || playerTime < bestTime) {
        handleSaveBestTime(playerTime);
      }
    }
  };

  const handleClearAllRecords = () => {
    localStorage.removeItem('iaido_best_reaction_ms');
    localStorage.removeItem('iaido_winstreak');
    localStorage.removeItem('iaido_duel_records');
    setBestTime(null);
    setWinStreak(0);
    setRecords([]);
  };

  const handleLaunchGame = (config: {
    mode: GameMode;
    playerChar: Character;
    opponentChar: Character;
    difficulty: DifficultyLevel;
    swordColor: string;
    customVolume: number;
  }) => {
    setGameMode(config.mode);
    setPlayerChar(config.playerChar);
    setOpponentChar(config.opponentChar);
    setDifficulty(config.difficulty);
    setSwordColor(config.swordColor);
    Synth.setVolume(config.customVolume);

    if (config.mode === 'PRACTICE') {
      setActiveScreen('PRACTICE');
    } else {
      setActiveScreen('DUEL');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col justify-between">
      {activeScreen === 'TITLE' && (
        <div className="flex flex-col gap-4 pb-6">
          {/* Main Title screen with customizers */}
          <StartScreen 
            onStartGame={handleLaunchGame} 
            bestTime={bestTime}
          />

          {/* Historical Scroll Ledger section */}
          <div className="container mx-auto px-4 mt-3 md:mt-1">
            <Leaderboard 
              records={records}
              onClearRecords={handleClearAllRecords}
              bestTime={bestTime}
            />
          </div>
        </div>
      )}

      {activeScreen === 'DUEL' && playerChar && opponentChar && (
        <DuelingArena 
          mode={gameMode}
          playerChar={playerChar}
          opponentChar={opponentChar}
          difficulty={difficulty}
          swordColor={swordColor}
          onExit={() => {
            Synth.playSwordSwish();
            setActiveScreen('TITLE');
          }}
          onSaveRecord={handleSaveDuelRecord}
        />
      )}

      {activeScreen === 'PRACTICE' && (
        <PracticeArena 
          difficulty={difficulty}
          swordColor={swordColor}
          onExit={() => {
            Synth.playSwordSwish();
            setActiveScreen('TITLE');
          }}
          bestTime={bestTime}
          onNewBest={handleSaveBestTime}
        />
      )}
    </div>
  );
}
