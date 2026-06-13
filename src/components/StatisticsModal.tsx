import React, { useMemo, useState } from 'react';
import type { Task } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  pages: any[];
  roomName?: string;
  selectedPageId?: string | null;
  criticalPathIds?: string[];
};

type TabMode = 'summary' | 'members' | 'pages';

export const StatisticsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  pages,
  roomName = 'ワークスペース',
  selectedPageId,
  criticalPathIds = []
}) => {
  // 1. Hook（ステート）の呼び出し
  const [activeTab, setActiveTab] = useState<TabMode>('summary');

  // ヘルパー関数（フォルダ・ページ・リンクの判定）
  const isFolder = (p: any) => p?.is_folder === true || p?.type === 'folder';
  const isLink = (p: any) => p?.is_link === true || p?.type === 'link' || p?.url !== undefined;
  const isPage = (p: any) => p && !isFolder(p) && !isLink(p);

  const selectedItem = pages.find(p => p.id === selectedPageId);

  // 2. Hook（useMemo）の呼び出し: 現在表示中のスコープに応じたタスクの絞り込み
  const filteredTasks = useMemo(() => {
    if (!selectedItem) return tasks; // 未選択なら全体

    // 選択中アイテム配下のページIDを取得
    const getPageIds = (item: any): string[] => {
      if (isPage(item)) return [item.id];
      if (isFolder(item)) {
        const children = pages.filter(p => p.parent_id === item.id);
        return children.flatMap(child => getPageIds(child));
      }
      return [];
    };

    const targetIds = getPageIds(selectedItem);
    return tasks.filter(t => t.page_id && targetIds.includes(t.page_id));
  }, [tasks, selectedItem, pages]);

  // 3. Hook（useMemo）の呼び出し: 統計データの計算
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter(t => t.metadata?.status === '未着手').length;
    const inProgress = filteredTasks.filter(t => t.metadata?.status === '着手中').length;
    const done = filteredTasks.filter(t => t.metadata?.status === '終了').length;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    // 🚨 遅延タスク（今日を過ぎているのに未終了）
    const today = new Date().toISOString().split('T')[0];
    const overdue = filteredTasks.filter(t => t.end_date && t.end_date < today && t.metadata?.status !== '終了').length;

    // 🔥 クリティカルパス（主幹ルート）の消化状況
    const criticalTasks = filteredTasks.filter(t => criticalPathIds.includes(t.id));
    const criticalTotal = criticalTasks.length;
    const criticalDone = criticalTasks.filter(t => t.metadata?.status === '終了').length;
    const criticalRate = criticalTotal === 0 ? 0 : Math.round((criticalDone / criticalTotal) * 100);

    // 👥 メンバーごとの負荷状況
    const memberMap: Record<string, { total: number; active: number; done: number }> = {};
    filteredTasks.forEach(t => {
      const name = t.assignee || '未設定';
      if (!memberMap[name]) memberMap[name] = { total: 0, active: 0, done: 0 };
      memberMap[name].total += 1;
      if (t.metadata?.status === '終了') memberMap[name].done += 1;
      else memberMap[name].active += 1;
    });
    const memberStats = Object.entries(memberMap).map(([name, data]) => ({ name, ...data }));

    // 📄 ページ（機能）ごとの進捗ランキング
    const pageStats = pages.filter(isPage).map(p => {
      const pTasks = tasks.filter(t => t.page_id === p.id);
      const pTotal = pTasks.length;
      const pDone = pTasks.filter(t => t.metadata?.status === '終了').length;
      return {
        name: p.name,
        total: pTotal,
        rate: pTotal === 0 ? 0 : Math.round((pDone / pTotal) * 100)
      };
    }).filter(p => p.total > 0);

    return { total, todo, inProgress, done, completionRate, overdue, criticalTotal, criticalDone, criticalRate, memberStats, pageStats };
  }, [filteredTasks, criticalPathIds, pages, tasks]);


  // 💡 【重要】すべての Hook が終わったあとに、描画キャンセルの判定を行う
  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* モーダルヘッダー */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">📊 ハッカソン・進捗アナリティクス</h2>
              <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-100">
                {selectedItem ? `スコープ: ${selectedItem.name}` : '全体統計'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{roomName} のリアルタイム開発状況</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1">✕</button>
        </div>

        {/* タブメニュー */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          {[
            { id: 'summary', label: '📈 概要・進捗' },
            { id: 'members', label: '👥 メンバー負荷（ボトルネック）' },
            { id: 'pages', label: '📂 機能・ページ別' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabMode)}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* モーダルコンテンツ（スクロール可能領域） */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* --- タブ1: 概要 --- */}
          {activeTab === 'summary' && (
            <>
              {/* メイン進捗バー */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-2 text-gray-700">
                  <span>プロジェクト全体の消化率</span>
                  <span className="text-blue-600">{stats.completionRate}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: `${stats.completionRate}%` }} className="bg-blue-500 h-full transition-all duration-500" />
                </div>
              </div>

              {/* クリティカルパス（主幹）の危険度メーター */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500 text-sm">🔥</span>
                    <span className="text-sm font-bold text-gray-700">最長開発ルート（クリティカルパス）の進捗</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    {stats.criticalDone} / {stats.criticalTotal} タスク完了
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div style={{ width: `${stats.criticalRate}%` }} className="bg-red-500 h-full transition-all duration-500" />
                </div>
                <p className="text-[11px] text-gray-400 mt-2">※ここにあるタスクが遅れると、ハッカソンの提出締切（最終ゴール）が直接後ろにズレ込みます。</p>
              </div>

              {/* サマリーカード */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-gray-400 mb-1">総タスク</div>
                  <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                </div>
                <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-blue-500 mb-1">着手中</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-emerald-600 mb-1">完了済み</div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.done}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-red-500 mb-1">期限超過（遅延）</div>
                  <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                </div>
              </div>
            </>
          )}

          {/* --- タブ2: メンバー負荷（ボトルネック分析） --- */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700">👥 メンバー別の未完了タスク（現在抱えているタスク量）</h3>
              {stats.memberStats.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-xs">アサインされたタスクがありません。</p>
              ) : (
                <div className="space-y-3">
                  {stats.memberStats.map(m => (
                    <div key={m.name} className="border border-gray-100 rounded-xl p-4 bg-white shadow-xs flex items-center justify-between">
                      <div className="w-1/4">
                        <div className="font-bold text-gray-800 truncate">{m.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">完了率: {Math.round((m.done / m.total) * 100 || 0)}%</div>
                      </div>
                      
                      {/* バーでタスクバランスを可視化 */}
                      <div className="w-2/4 px-4">
                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                          <span className="text-amber-600">残り {m.active} 件</span>
                          <span className="text-gray-400">合計 {m.total} 件</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          <div style={{ width: `${(m.done / m.total) * 100}%` }} className="bg-emerald-400 h-full" />
                          <div style={{ width: `${(m.active / m.total) * 100}%` }} className="bg-amber-500 h-full" />
                        </div>
                      </div>

                      {/* ボトルネックアラートバッジ */}
                      <div className="w-1/4 text-right">
                        {m.active >= 4 ? (
                          <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-md border border-red-100 animate-pulse">
                            🚨 タスク過多（危険）
                          </span>
                        ) : m.active > 0 ? (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-100">
                            ⚡ 稼働中
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md">
                            ☕ 受付可能
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- タブ3: 機能・ページ別進捗 --- */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700">📂 実装機能（ページ）ごとの進捗ランキング</h3>
              {stats.pageStats.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-xs">集計可能なページがありません。</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stats.pageStats.map(p => (
                    <div key={p.name} className="border border-gray-100 bg-gray-50/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-800 text-sm truncate max-w-[70%]">{p.name}</span>
                        <span className={`text-xs font-bold ${p.rate === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {p.rate}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div style={{ width: `${p.rate}%` }} className={`${p.rate === 100 ? 'bg-emerald-500' : 'bg-blue-500'} h-full`} />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1.5 text-right">総タスク数: {p.total} 件</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* フッター */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            ダッシュボードを閉じる
          </button>
        </div>

      </div>
    </div>
  );
};