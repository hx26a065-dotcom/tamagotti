/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'STORY_CPU' | 'LOCAL_2P' | 'PRACTICE';

export type GameState = 
  | 'TITLE'          // Start / Mode Select
  | 'CHAR_SELECT'     // Choose your beautiful character & opponent
  | 'INTRO'          // Loading / dramatic wind blow & face-off zoom
  | 'READY'          // Position taken, ready...
  | 'TENSION'        // Randomized quiet delay, heartbeat pacing
  | 'ZAN_ACTIVE'     // '斬' appears on screen! Slash immediately!
  | 'STRIKE_OUTCOME' // Post-slash visual sequence (ink brush, strike, animation)
  | 'VICTORY_SCREEN' // Celebration or funeral screen
  | 'ERROR_EARLY'    // Someone struck too early (False Start / お手つき)
  ;

export interface Character {
  id: string;
  name: string;
  title: string;
  avatar: string;
  description: string;
  specialty: string;
  reactionBaseMs: number; // For CPU opponents
  accentColor: string;
  swordName: string;
}

export interface DuelRecord {
  id: string;
  date: string;
  mode: GameMode;
  opponentName: string;
  difficulty: DifficultyLevel;
  outcome: 'WIN' | 'LOSS' | 'DRAW' | 'FALSE_START_LOSS' | 'FALSE_START_WIN';
  playerTime: number | null; // ms
  opponentTime: number | null; // ms
}

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD' | 'KAMI';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}
