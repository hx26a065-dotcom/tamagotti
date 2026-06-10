/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DuelRecord } from '../types';
import { Trophy, Calendar, Award, Trash2, Shield, Heart } from 'lucide-react';
import { Synth } from '../utils/audio';

interface LeaderboardProps {
  records: DuelRecord[];
  onClearRecords: () => void;
  bestTime: number | null;
}

export default function Leaderboard({ records, onClearRecords, bestTime }: LeaderboardProps) {
  
  const totalFights = records.length;
  const winsCount = records.filter(r => r.outcome === 'WIN' || r.outcome === 'FALSE_START_WIN').length;
  const winRatio = totalFights > 0 ? Math.round((winsCount / totalFights) * 100) : 0;

  const getRankBadge = (ms: number | null) => {
    if (!ms) return { name: '無名者 (No Title)', desc: '居合の道は広大、まずは試練をこなせ。', color: 'text-stone-500 border-stone-850' };
    if (ms <= 170) return { name: '【 刀神・天降 】 (Sword Deity)', desc: '神すら欺く抜刀。0.170秒以下の絶対神域。', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' };
    if (ms <= 220) return { name: '【 剣聖・達人 】 (Sword Saint)', desc: '敵なき至高の反射速度。達人の合格者。', color: 'text-orange-400 border-orange-500/30 bg-orange-950/10' };
    if (ms <= 280) return { name: '【 武家・中伝 】 (Mastered Warrior)', desc: '一通りの技を制した一流剣士。並の早打ち。', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/10' };
    return { name: '【 修行・門下製 】 (Pupil)', desc: '未だ刃が風を斬るのに遅れている。修行あるのみ。', color: 'text-stone-400 border-stone-800 bg-stone-900/40' };
  };

  const badge = getRankBadge(bestTime);

  const handleClear = () => {
    if (confirm('全ての抜刀戦記・修練記録を末梢しますか？ 記録はリセットされます。')) {
      Synth.playFalseStartBuzz();
      onClearRecords();
    }
  };

  return (
    <div className="bg-stone-950/80 border border-stone-900/90 rounded-lg p-5 backdrop-blur-md max-w-4xl mx-auto w-full text-stone-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 pb-3 mb-4 gap-3">
        <div>
          <h2 className="text-xl font-serif text-yellow-400 font-bold tracking-widest flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>居合抜刀戦記・高得点巻 (High-score records)</span>
          </h2>
          <p className="text-stone-500 text-xs font-sans mt-0.5">あなたの剣客としての歩みと1/1000秒の抜刀履歴。</p>
        </div>

        {totalFights > 0 && (
          <button 
            id="clear_records_btn"
            onClick={handleClear}
            className="text-[10px] font-sans font-semibold text-stone-500 hover:text-red-400 flex items-center gap-1.5 transition-colors border border-stone-900 hover:border-red-950 px-2.5 py-1.5 rounded bg-stone-950"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>戦記巻物を焼却(データ消去)</span>
          </button>
        )}
      </div>

      {/* Top Banner: Your Sword Badge Title */}
      <div className={`p-4 border rounded-md flex flex-col md:flex-row justify-between items-center gap-3 mb-6 ${badge.color}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-stone-800 bg-stone-950 flex items-center justify-center text-yellow-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-stone-400 font-bold">現在の剣心称号</div>
            <h3 className="text-sm font-serif font-black">{badge.name}</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">{badge.desc}</p>
          </div>
        </div>

        <div className="text-center md:text-right">
          <span className="text-[10px] text-stone-400 font-mono block">最速の抜刀 (Reaction)</span>
          <strong className="text-2xl font-mono text-yellow-400">
            {bestTime ? `${(bestTime / 1000).toFixed(3)}s` : '---'}
          </strong>
          {bestTime && <span className="text-[10px] text-stone-500 block">({bestTime}ms)</span>}
        </div>
      </div>

      {/* Statistics board Grid */}
      <div className="grid grid-cols-3 gap-3 text-center mb-6">
        <div className="bg-stone-900/30 border border-stone-900 rounded p-3">
          <Shield className="w-4 h-4 text-stone-400 mx-auto mb-1" />
          <span className="text-[10px] text-stone-500 font-serif block">対戦数 (Matches)</span>
          <strong className="text-lg font-mono text-stone-300">{totalFights} 戦</strong>
        </div>
        <div className="bg-stone-900/30 border border-stone-900 rounded p-3">
          <Award className="w-4 h-4 text-stone-500 mx-auto mb-1" />
          <span className="text-[10px] text-stone-500 font-serif block">生存(勝利)数</span>
          <strong className="text-lg font-mono text-emerald-400">{winsCount} 勝</strong>
        </div>
        <div className="bg-[rgba(239,68,68,0.03)] border border-stone-900 rounded p-3">
          <Heart className="w-4 h-4 text-red-500/70 mx-auto mb-1" />
          <span className="text-[10px] text-stone-500 font-serif block">勝率 (Win Rate)</span>
          <strong className="text-lg font-mono text-red-400">{winRatio}%</strong>
        </div>
      </div>

      {/* Duel History Table list */}
      <div className="overflow-x-auto border border-stone-900 rounded bg-stone-900/10">
        <h4 className="text-xs font-serif font-black tracking-widest text-stone-400 block p-3 bg-stone-950 border-b border-stone-900">過去決戦履歴 (Recent Battle History Logs)</h4>
        
        {totalFights > 0 ? (
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-stone-950 text-stone-500 border-b border-stone-900/70">
                <th className="p-3 font-serif">対峙相手 / 形式</th>
                <th className="p-3">勝敗 / 理由</th>
                <th className="p-3 text-center">己の時間 (ms)</th>
                <th className="p-3 text-center">敵の時間 (ms)</th>
                <th className="p-3 text-right">日付</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-900/55">
              {records.slice(0, 10).map((item) => (
                <tr key={item.id} className="hover:bg-stone-900/20">
                  <td className="p-3">
                    <div className="font-serif font-bold text-stone-200">{item.opponentName}</div>
                    <div className="text-[9px] text-stone-500">
                      {item.mode === 'STORY_CPU' ? '剣豪対決' : item.mode === 'LOCAL_2P' ? '相打対戦' : '修練速度'}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-sm font-sans font-extrabold text-[10px] ${
                      item.outcome === 'WIN' 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60' 
                        : item.outcome === 'LOSS'
                        ? 'bg-red-950/40 text-red-400 border border-red-900/60'
                        : item.outcome === 'DRAW'
                        ? 'bg-stone-900 text-stone-400 border border-stone-850'
                        : 'bg-red-950/20 text-orange-400 border border-stone-900'
                    }`}>
                      {item.outcome === 'WIN' && '勝利'}
                      {item.outcome === 'LOSS' && '敗死'}
                      {item.outcome === 'DRAW' && '引き分け'}
                      {item.outcome === 'FALSE_START_LOSS' && 'お手つき敗'}
                      {item.outcome === 'FALSE_START_WIN' && '相手不戦勝'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-stone-300">
                    {item.playerTime ? `${item.playerTime}ms` : '失格'}
                  </td>
                  <td className="p-3 text-center text-stone-400">
                    {item.opponentTime ? `${item.opponentTime}ms` : '失格'}
                  </td>
                  <td className="p-3 text-right text-stone-600">
                    <Calendar className="w-3 h-3 inline mr-1 opacity-70" />
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-stone-600 font-serif leading-relaxed">
            ここに直近10決闘の戦記が表示されます。
            <br />
            抜刀、いざ極限に挑まれ。
          </div>
        )}
      </div>
    </div>
  );
}
