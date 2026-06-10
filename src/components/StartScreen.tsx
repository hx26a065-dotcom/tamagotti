/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, Character, DifficultyLevel } from '../types';
import { PLAYERS, OPPONENTS, BACKGROUND_ART } from '../data/characters';
import { Synth } from '../utils/audio';
import { Swords, Play, Trophy, Sparkles, HelpCircle, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StartScreenProps {
  onStartGame: (config: {
    mode: GameMode;
    playerChar: Character;
    opponentChar: Character;
    difficulty: DifficultyLevel;
    swordColor: string;
    customVolume: number;
  }) => void;
  bestTime: number | null;
}

const SWORD_CHOICES = [
  { name: '神威・青光 (Kamui - Sacred Blue)', color: '#3b82f6', trail: 'rgba(59, 130, 246, 0.8)' },
  { name: '妖刀・鬼灯 (Muramasa - Ghost Fire Crimson)', color: '#ef4444', trail: 'rgba(239, 68, 68, 0.8)' },
  { name: '天雷・金閃 (Kamii - Golden Lightning)', color: '#eab308', trail: 'rgba(234, 179, 8, 0.8)' },
  { name: '霊桜・桜雪 (Sakura Blow - Pastel Pink)', color: '#ec4899', trail: 'rgba(236, 72, 153, 0.8)' },
  { name: '邪眼・鬼火 (Necromancer - Demon Green)', color: '#22c55e', trail: 'rgba(34, 197, 94, 0.8)' },
];

export default function StartScreen({ onStartGame, bestTime }: StartScreenProps) {
  const [mode, setMode] = useState<GameMode>('STORY_CPU');
  const [selectedOpponentIndex, setSelectedOpponentIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('NORMAL');
  const [selectedSwordIndex, setSelectedSwordIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [winStreak, setWinStreak] = useState(0);

  useEffect(() => {
    // Load local storage states
    const streak = localStorage.getItem('iaido_winstreak');
    if (streak) {
      setWinStreak(parseInt(streak, 10));
    }
  }, []);

  const handlePlayMelody = () => {
    Synth.playVictoryMelody();
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const newVolume = nextMuted ? 0 : 0.8;
    setSoundVolume(newVolume);
    Synth.setVolume(newVolume);
    if (!nextMuted) {
      Synth.playHeartbeat(0.8);
    }
  };

  const handleSelection = () => {
    Synth.playSwordSwish();
    onStartGame({
      mode,
      playerChar: PLAYERS[0],
      opponentChar: OPPONENTS[selectedOpponentIndex],
      difficulty,
      swordColor: SWORD_CHOICES[selectedSwordIndex].color,
      customVolume: soundVolume
    });
  };

  return (
    <div 
      className="relative w-full flex flex-col justify-between p-4 md:p-6 text-stone-100 overflow-hidden bg-cover bg-center select-none rounded-b-2xl border-b border-stone-900/60"
      style={{ 
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${BACKGROUND_ART})`
      }}
    >
      {/* Absolute decorative red particle float / vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(13,10,10,0.95)_100%)] pointer-events-none" />

      {/* Floating Cherry Blossoms/Red Leaves (CSS-Based Ambient) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-rose-900/40 blur-[1px]"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 10 + 6}px`,
              top: `${Math.random() * 110 - 10}%`,
              left: `${Math.random() * 110 - 10}%`,
              animation: `float-leaves ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Header Panel */}
      <header className="relative w-full flex justify-between items-center z-10 border-b border-stone-800/60 pb-3" id="main_header">
        <div className="flex items-center gap-3">
          <div className="bg-red-700/90 text-white font-serif px-3 py-1 text-sm tracking-widest rounded-sm border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            公式仕様
          </div>
          <span className="text-stone-400 font-mono text-xs hidden sm:inline-block">AI STUDIO APPLET</span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          {winStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>連勝: <strong>{winStreak}</strong></span>
            </div>
          )}

          {bestTime !== null && (
            <div className="text-right text-stone-300 text-xs hidden md:block">
              <span className="text-stone-500 mr-1.5 font-sans">極限最速抜刀:</span>
              <strong className="text-yellow-400 font-mono">{(bestTime / 1000).toFixed(3)}s</strong> 
              <span className="text-[10px] text-stone-500 ml-1">({bestTime}ms)</span>
            </div>
          )}

          <button 
            id="sound_toggle_btn"
            onClick={handleMuteToggle}
            className="p-2 rounded-full border border-stone-800 bg-stone-900/60 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
            title={isMuted ? "音量をオン" : "消音"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button 
            id="rules_modal_btn"
            onClick={() => {
              Synth.playSwordClash();
              setShowRules(!showRules);
            }}
            className="p-2 rounded-full border border-stone-800 bg-stone-900/60 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
            title="決闘心得 / ルール"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Title Layout */}
      <main className="relative flex flex-col justify-center items-center z-10 py-2 md:py-3 max-w-7xl mx-auto w-full">
        {/* Title Graphics */}
        <div className="text-center mb-5 md:mb-6 relative">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-block relative"
          >
            {/* Massive Kanji Accent */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 -z-10 text-7xl font-black font-serif text-red-950/15 tracking-wider pointer-events-none select-none blur-[1px]">
              斬
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-[0.3em] mr-[-0.3em] text-stone-150 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] select-none">
              居合一閃
            </h1>
            <div className="h-[1.5px] w-36 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto my-2" />
            <p className="text-[10px] md:text-xs text-stone-400 tracking-[0.15em] font-light">
              ― 刹那の一撃に魂を込めよ ―
            </p>
          </motion.div>
        </div>

        {/* Dynamic Center Setup: Selection Panels - Combined into a compact single-column flow */}
        <div className="flex flex-col gap-4 w-full max-w-2xl px-2">
          
          {/* Mode Selector - Top compact card (w-full instead of lg:col-span-4) */}
          <div className="w-full bg-stone-950/75 border border-stone-900/80 rounded-lg p-4 flex flex-col gap-3 backdrop-blur-md relative shadow-2xl">
            <h2 className="text-xs md:text-sm font-serif text-red-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
              <Swords className="w-3.5 h-3.5" />
              <span>其の一：決闘形式を選択</span>
            </h2>

            <div className="flex flex-col gap-2">
              {[
                { 
                  id: 'STORY_CPU', 
                  title: '一撃決闘 (VS CPU)', 
                  desc: '' 
                },
                { 
                  id: 'LOCAL_2P', 
                  title: '双刃相打 (2P 対戦)', 
                  desc: '' 
                },
                { 
                  id: 'PRACTICE', 
                  title: '抜刀修練 (速度測定)', 
                  desc: '' 
                },
              ].map((item) => (
                <button
                  key={item.id}
                  id={`mode_select_${item.id.toLowerCase()}`}
                  onClick={() => {
                    Synth.playSwordSwish();
                    setMode(item.id as GameMode);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded border transition-all duration-300 relative overflow-hidden group ${
                    mode === item.id 
                      ? 'bg-red-950/40 border-red-700/80 text-white ring-1 ring-red-600/40 shadow-inner' 
                      : 'bg-stone-900/40 border-stone-800/80 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  {/* Highlight bar */}
                  {mode === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                  )}
                  <h3 className="text-xs md:text-sm font-bold font-serif tracking-wide">{item.title}</h3>
                </button>
              ))}
            </div>

            {/* Sword Trail Customizer */}
            <div className="mt-2 pt-2 border-t border-stone-800/80 flex flex-col gap-1.5">
              <span className="text-xs text-stone-400 font-serif font-bold">其の二：所持刀の選択 (斬跡変化)</span>
              <div className="grid grid-cols-5 gap-1">
                {SWORD_CHOICES.map((sw, idx) => (
                  <button
                    key={idx}
                    id={`sword_trail_btn_${idx}`}
                    onClick={() => {
                      Synth.playSwordSwish();
                      setSelectedSwordIndex(idx);
                    }}
                    className={`h-8 rounded border flex items-center justify-center transition-all ${
                      selectedSwordIndex === idx 
                        ? 'border-white bg-stone-800/80' 
                        : 'border-stone-800 bg-stone-950/60 hover:border-stone-600'
                    }`}
                    style={{ color: sw.color }}
                    title={sw.name}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sw.color }} />
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-mono text-stone-500 font-medium text-center">
                選択中: {SWORD_CHOICES[selectedSwordIndex].name}
              </span>
            </div>
          </div>

          {/* Dynamic Configuration Space - Bottom compact card (w-full instead of lg:col-span-8) */}
          <div className="w-full bg-stone-950/75 border border-stone-900/80 rounded-lg p-4 flex flex-col gap-3.5 backdrop-blur-md relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-16 bg-gradient-to-bl from-red-600/5 to-transparent pointer-events-none rounded-full" />
            
            <AnimatePresence mode="wait">
              {mode === 'STORY_CPU' && (
                <motion.div 
                  key="cpu_setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3 h-full"
                >
                  <h2 className="text-xs md:text-sm font-serif text-red-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    <span>対峙する宿敵を選択</span>
                  </h2>

                  <div className="text-[11px] md:text-xs text-stone-400 leading-relaxed font-sans">
                    個性豊かな女剣豪たちと勝ち抜き一撃勝負を行います。
                  </div>

                  {/* Character selection buttons Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {OPPONENTS.map((opp, idx) => (
                      <button
                        key={opp.id}
                        id={`opponent_select_${opp.id}`}
                        onClick={() => {
                          Synth.playSwordSwish();
                          setSelectedOpponentIndex(idx);
                        }}
                        className={`p-1.5 border rounded text-center transition-all ${
                          selectedOpponentIndex === idx 
                            ? 'bg-red-950/50 border-red-500/80 text-white shadow-inner' 
                            : 'bg-stone-900/40 border-stone-800/80 text-stone-500 hover:border-stone-700 hover:text-stone-300'
                        }`}
                      >
                        <h3 className="text-xs font-serif font-bold text-stone-200">{opp.name}</h3>
                        <span className="text-[9px] block text-stone-400 font-sans opacity-85">{opp.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selected Character Deep Profile */}
                  <div className="flex flex-col md:flex-row gap-3 bg-stone-900/40 border border-stone-900 rounded p-3 flex-1">
                    <div className="relative w-20 h-28 mx-auto md:mx-0 flex-shrink-0 bg-stone-950 overflow-hidden border border-stone-800 rounded bg-cover bg-center">
                      <img 
                        src={OPPONENTS[selectedOpponentIndex].avatar} 
                        alt={OPPONENTS[selectedOpponentIndex].name} 
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 transition-all duration-300 pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 p-0.5 text-[8px] font-mono border border-stone-800/70 text-center text-red-400/90 font-bold uppercase truncate">
                        {OPPONENTS[selectedOpponentIndex].swordName}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between flex-grow gap-1 text-center md:text-left">
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1.5 justify-center md:justify-start">
                          <span className="text-sm md:text-base font-bold font-serif text-white">{OPPONENTS[selectedOpponentIndex].name}</span>
                          <span className="text-xs text-red-400 font-serif italic font-semibold">{OPPONENTS[selectedOpponentIndex].title}</span>
                        </div>
                        <p className="text-[11px] md:text-xs text-stone-400 mt-1 leading-normal">
                          {OPPONENTS[selectedOpponentIndex].description}
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-stone-800/60 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] md:text-[11px] justify-center md:justify-start">
                        <div><strong className="text-red-400 font-serif">得物:</strong> <span className="text-stone-300 font-medium font-sans">{OPPONENTS[selectedOpponentIndex].swordName}</span></div>
                        <div><strong className="text-amber-500 font-serif">目安速度:</strong> <span className="text-amber-400 font-mono font-bold">{(OPPONENTS[selectedOpponentIndex].reactionBaseMs / 1000).toFixed(3)}秒</span></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {mode === 'LOCAL_2P' && (
                <motion.div 
                  key="local_setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3 h-full"
                >
                  <h2 className="text-xs md:text-sm font-serif text-red-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                    <Swords className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                    <span>双刃相打（1台のキーボードでの2人対戦）</span>
                  </h2>

                  <div className="text-[11px] md:text-xs text-stone-400 leading-relaxed font-sans">
                    1台のキーボードで対戦。左は「<strong>Fキー</strong>」、右は「<strong>Jキー</strong>」で抜刀します。
                  </div>

                  <div className="grid grid-cols-2 gap-3 flex-grow my-1">
                    {/* Player 1 Left */}
                    <div className="bg-blue-950/20 border border-blue-900/40 rounded p-2.5 flex flex-col items-center justify-between text-center relative overflow-hidden">
                      <div className="absolute top-0 right-1 font-serif text-blue-500/10 text-5xl">左</div>
                      <div className="w-10 h-10 bg-blue-500/10 rounded-full border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-extrabold text-base shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse">
                        F
                      </div>
                      <div className="mt-1">
                        <h4 className="text-xs font-bold font-serif text-blue-300">Fキー (左手)</h4>
                      </div>
                    </div>

                    {/* Player 2 Right */}
                    <div className="bg-red-950/20 border border-red-900/40 rounded p-2.5 flex flex-col items-center justify-between text-center relative overflow-hidden">
                      <div className="absolute top-0 right-1 font-serif text-red-500/10 text-5xl">右</div>
                      <div className="w-10 h-10 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center text-red-400 font-mono font-extrabold text-base shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
                        J
                      </div>
                      <div className="mt-1">
                        <h4 className="text-xs font-bold font-serif text-red-400">Jキー (右手)</h4>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-500 font-serif border border-dashed border-stone-800 rounded bg-stone-900/20 p-1 text-center">
                    ※ 合図前のキー入力はお手つき(敗北)になります。
                  </div>
                </motion.div>
              )}

              {mode === 'PRACTICE' && (
                <motion.div 
                  key="practice_setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3 h-full"
                >
                  <h2 className="text-xs md:text-sm font-serif text-red-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                    <span>抜刀修練（難易度・設定）</span>
                  </h2>

                  <div className="text-[11px] md:text-xs text-stone-400 leading-relaxed font-sans">
                    目標を設定し、一撃の反射スピードを測定・特訓します。
                  </div>

                  {/* Difficulty selector buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'EASY', name: '手解き (Easy)', speed: '380ms', color: 'text-green-400 border-green-900/40 bg-green-950/20' },
                      { id: 'NORMAL', name: '並武芸 (Normal)', speed: '270ms', color: 'text-sky-400 border-sky-900/40 bg-sky-950/20' },
                      { id: 'HARD', name: '達人剣 (Hard)', speed: '200ms', color: 'text-orange-400 border-orange-900/40 bg-orange-950/20' },
                      { id: 'KAMI', name: '神速 (God)', speed: '165ms', color: 'text-yellow-400 border-yellow-900/40 bg-yellow-950/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]' }
                    ].map((diffObj) => (
                      <button
                        key={diffObj.id}
                        id={`diff_select_${diffObj.id.toLowerCase()}`}
                        onClick={() => {
                          Synth.playSwordSwish();
                          setDifficulty(diffObj.id as DifficultyLevel);
                        }}
                        className={`p-1.5 border rounded-md text-center transition-all ${
                          difficulty === diffObj.id 
                            ? 'scale-[1.02] border-yellow-500/80 bg-stone-900/80 font-bold ' + diffObj.color 
                            : 'bg-stone-900/30 border-stone-800/80 text-stone-500 hover:border-stone-700 hover:text-stone-300'
                        }`}
                      >
                        <h4 className="text-[10px] md:text-xs font-bold font-serif">{diffObj.name}</h4>
                        <span className="text-[9px] block mt-0.5 opacity-80 font-mono font-bold">{diffObj.speed}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-stone-900/30 border border-stone-900 rounded p-2 flex-grow flex items-center justify-center text-center">
                    <p className="text-[11px] text-stone-400">
                      一撃ごとに<strong className="text-stone-300">ミリ秒(ms)</strong>を測定・記録します。
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Launch Game Button */}
            <div className="mt-2 text-stone-100">
              <button
                id="start_fight_launch_btn"
                onClick={handleSelection}
                className="w-full py-2.5 bg-gradient-to-r from-red-800 via-red-600 to-red-800 hover:from-red-700 hover:via-red-500 hover:to-red-700 text-white font-serif font-extrabold text-sm md:text-base tracking-[0.25em] rounded border-y border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(239,68,68,0.7)] flex items-center justify-center gap-2 relative group overflow-hidden"
              >
                {/* Visual hover slash line */}
                <div className="absolute right-full top-0 bottom-0 w-24 bg-white/20 skew-x-12 group-hover:animate-flash-slash" />
                
                <Swords className="w-4 h-4 text-white animate-pulse" />
                <span>抜刀、刹那に斬る !</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Traditional woodblock printed rule block footer */}
      <footer className="relative w-full text-center text-stone-500 text-[10px] font-mono select-none z-10 border-t border-stone-800/50 pt-2 flex justify-between items-center px-4">
        <span>© 1603-1868 江戸居合決闘委員会 / AI Studio Build</span>
        <span 
          className="text-stone-400 hover:text-red-400 cursor-pointer transition-colors flex items-center gap-1 font-serif underline"
          onClick={handlePlayMelody}
        >
          雅なる調べを奏でる (Play Japanese Chord)
        </span>
      </footer>

      {/* Absolute overlay rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            id="rules_overlay_modal"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[radial-gradient(ellipse_at_center,#1c1917_0%,#0c0a09_100%)] border border-amber-900/60 p-6 md:p-8 rounded max-w-lg w-full text-amber-200/90 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative font-serif"
            >
              {/* Gold seal background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl text-amber-700/5 pointer-events-none font-black select-none border-stone-500 rounded-full border border-dashed p-12">
                心
              </div>

              <div className="text-center mb-6">
                <span className="text-red-500 font-serif font-black tracking-widest text-xs">決闘心得</span>
                <h3 className="text-2xl font-bold tracking-[0.3em] text-amber-400 my-1">居合道・一撃必殺真髄</h3>
                <div className="h-[1px] w-28 bg-amber-500/40 mx-auto mt-2" />
              </div>

              <ul className="flex flex-col gap-4 text-xs md:text-sm text-stone-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 list-none font-serif">
                <li className="border-l-2 border-red-600 pl-3">
                  <strong className="text-amber-400 block mb-1">【其の一】お手つき即敗死（厳禁）</strong>
                  画面中央に赤々と「<span className="text-red-500 font-bold">斬</span>」の合図が浮かび上がる前に刃を抜いてはならぬ。焦りは即ち己の死を意味し、対峙者に首を差し出す事と心得よ。
                </li>
                <li className="border-l-2 border-red-600 pl-3">
                  <strong className="text-amber-400 block mb-1">【其の二】速度こそ正義（刹那）</strong>
                  「<span className="text-red-500 font-bold">斬</span>」マークが点火した瞬間、誰よりも速く。1/1000秒(ms)を競う世界。あなたの反応がCPUの反応時間を超えし時、敵は塵と帰す。
                </li>
                <li className="border-l-2 border-red-600 pl-3">
                  <strong className="text-amber-400 block mb-1">【其の三】一瞬の攻防</strong>
                  敗北すれば、その瞬間の連勝記録はゼロに還る。緊張感を保ち、心静かに指を定位置（Fキー、Jキー、あるいは画面の大きなタップ領域）へ添え、目を凝らすべし。
                </li>
              </ul>

              <div className="mt-8 flex justify-center">
                <button
                  id="close_rules_btn"
                  onClick={() => {
                    Synth.playSwordSwish();
                    setShowRules(false);
                  }}
                  className="px-6 py-2 border border-amber-500/85 hover:border-amber-400 text-amber-400 bg-stone-900/60 hover:bg-stone-800 transition-colors text-xs tracking-widest font-bold font-serif rounded"
                >
                  承知した
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
