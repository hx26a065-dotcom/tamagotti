/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character } from '../types';

export const PLAYERS: Character[] = [
  {
    id: 'orin',
    name: 'お凛 (Orin)',
    title: '流水の一閃 (Swift Flowing Blade)',
    avatar: '/src/assets/images/player_samurai_1781069411730.png',
    description: '静水のように澄んだ心を保ち、抜刀の一瞬にすべてを懸ける。江戸高名な女武芸者。',
    specialty: '抜刀の極意：心の乱れ（手ブレ）が最も少ない。',
    reactionBaseMs: 0,
    accentColor: 'indigo',
    swordName: '不知火（Shiranui）'
  }
];

export const OPPONENTS: Character[] = [
  {
    id: 'chiyo',
    name: '千代 (Chiyo)',
    title: '緋牡丹の刃 (Crimson Peony Blade)',
    avatar: '/src/assets/images/rival_samurai_1781069423784.png',
    description: '荒ぶる闘志を内に秘めた実力派。一瞬の隙を見逃さず、獲物を真っ二つにする豪傑。',
    specialty: '早駆けの構え：一定確率で先制を狙うアグレッシブな突き。',
    reactionBaseMs: 290, // Easy - Medium
    accentColor: 'rose',
    swordName: '紅夜叉（Beni-Yasha）'
  },
  {
    id: 'sakuya',
    name: '咲耶 (Sakuya)',
    title: '氷影の月明 (Frozen Moonlight Shadow)',
    avatar: '/src/assets/images/rival_samurai_1781069423784.png', // Fallback or we can apply filters in CSS
    description: '冷徹にして無慈悲。音もなく忍び寄り、氷のような速さで首元を刈り取る暗殺者。',
    specialty: '無音のステップ：手元の動きを消し去るフェイントを持つ。',
    reactionBaseMs: 220, // Hard
    accentColor: 'cyan',
    swordName: '月影（Tsukikage）'
  },
  {
    id: 'tomoe',
    name: '巴 (Tomoe)',
    title: '天神一刀流第十代 (Heaven’s Gate Tenjin-Style)',
    avatar: '/src/assets/images/rival_samurai_1781069423784.png', // Using the spectacular rival image styled with gold filters
    description: '居合の極致に達した、盲目の伝説的剣豪。神速をも超える「無想剣」を操る最強の女武芸者。',
    specialty: '心眼一閃：一切の雑音を遮断し、0.16秒以下の超反応で斬る。',
    reactionBaseMs: 165, // Kami (Master / God difficulty)
    accentColor: 'amber',
    swordName: '天帝（Tentei）'
  }
];

export const BACKGROUND_ART = '/src/assets/images/stage_dusk_1781069394911.png';
