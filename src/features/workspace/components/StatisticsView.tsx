import React, { useMemo, useState } from 'react';
import type { Task } from '../../../types';

type Props = {
  tasks: Task[];
  pages: any[];
  roomName?: string;
  selectedPageId?: string | null;
  criticalPathIds?: string[];
};

type TabMode = 'summary' | 'members' | 'pages' | 'stuck';

export const StatisticsView: React.FC<Props> = ({ tasks, pages, roomName = 'ワークスペース', selectedPageId, criticalPathIds = [] }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('summary');

  const isFolder = (p: any) => p?.is_folder === true || p?.type === 'folder';
  const isLink = (p: any) => p?.is_link === true || p?.type === 'link' || p?.url !== undefined;
  const isPage = (p: any) => p && !isFolder(p) && !isLink(p);

  const selectedItem = pages.find(p => p.id === selectedPageId);

  const filteredTasks = useMemo(() => {
    if (!selectedItem) return tasks;
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

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter(t => (t.metadata?.status || '未着手') === '未着手').length;
    const inProgress = filteredTasks.filter(t => t.metadata?.status === '着手中').length;
    const stuck = filteredTasks.filter(t => t.metadata?.status === '停滞中').length;
    const done = filteredTasks.filter(t => t.metadata?.status === '終了').length;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    const today = new Date().toISOString().split('T')[0];
    const overdue = filteredTasks.filter(t => t.end_date && t.end_date < today && t.metadata?.status !== '終了').length;

    const criticalTasks = filteredTasks.filter(t => criticalPathIds.includes(t.id));
    const criticalTotal = criticalTasks.length;
    const criticalDone = criticalTasks.filter(t => t.metadata?.status === '終了').length;
    const criticalRate = criticalTotal === 0 ? 0 : Math.round((criticalDone / criticalTotal) * 100);

    const memberMap: Record<string, { total: number; active: number; stuck: number; done: number }> = {};
    filteredTasks.forEach(t => {
      const name = t.assignee || '未設定';
      if (!memberMap[name]) memberMap[name] = { total: 0, active: 0, stuck: 0, done: 0 };
      memberMap[name].total += 1;
      if (t.metadata?.status === '終了') memberMap[name].done += 1;
      else if (t.metadata?.status === '停滞中') memberMap[name].stuck += 1;
      else memberMap[name].active += 1;
    });
    const memberStats = Object.entries(memberMap).map(([name, data]) => ({ name, ...data }));

    const pageStats = pages.filter(isPage).map(p => {
      const pTasks = tasks.filter(t => t.page_id === p.id);
      const pTotal = pTasks.length;
      const pDone = pTasks.filter(t => t.metadata?.status === '終了').length;
      return { name: p.name, total: pTotal, rate: pTotal === 0 ? 0 : Math.round((pDone / pTotal) * 100) };
    }).filter(p => p.total > 0);

    return { total, todo, inProgress, stuck, done, completionRate, overdue, criticalTotal, criticalDone, criticalRate, memberStats, pageStats };
  }, [filteredTasks, criticalPathIds, pages, tasks]);

  const stuckTasks = filteredTasks.filter(t => t.metadata?.status === '停滞中');

  return (
    <div className="bg-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-gray-800 tracking-wide">{roomName}</h2>
          {selectedItem && (
            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-100">
              スコープ: {selectedItem.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">全体完了率</div>
          <div className="text-2xl font-black text-blue-600">{stats.completionRate}%</div>
        </div>
      </div>

      <div className="flex border-b border-gray-100 px-6 overflow-x-auto whitespace-nowrap">
        {[
          { id: 'summary', label: '概要・進捗' },
          { id: 'members', label: 'メンバー負荷' },
          { id: 'pages', label: '機能・ページ別' },
          { id: 'stuck', label: '停滞・ブロッカー' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabMode)}
            className={`px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            {tab.id === 'stuck' && stats.stuck > 0 && (
              <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {stats.stuck}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'summary' && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">最長開発ルート（クリティカルパス）の進捗</span>
                <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  {stats.criticalDone} / {stats.criticalTotal} タスク完了
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div style={{ width: `${stats.criticalRate}%` }} className="bg-red-500 h-full transition-all duration-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-gray-400 mb-1">総タスク</div>
                <div className="text-xl font-bold text-gray-800">{stats.total}</div>
              </div>
              <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-blue-500 mb-1">着手中</div>
                <div className="text-xl font-bold text-blue-600">{stats.inProgress}</div>
              </div>
              <div className="bg-rose-50/40 border border-rose-200/50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-rose-500 mb-1">停滞中</div>
                <div className="text-xl font-bold text-rose-600">{stats.stuck}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-emerald-600 mb-1">完了済み</div>
                <div className="text-xl font-bold text-emerald-600">{stats.done}</div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-red-500 mb-1">期限超過</div>
                <div className="text-xl font-bold text-red-600">{stats.overdue}</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            {stats.memberStats.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-xs">アサインされたタスクがありません。</p>
            ) : (
              <div className="space-y-3">
                {stats.memberStats.map(m => (
                  <div key={m.name} className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex items-center justify-between">
                    <div className="w-1/4">
                      <div className="font-bold text-gray-800 truncate">{m.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">完了率: {Math.round((m.done / m.total) * 100 || 0)}%</div>
                    </div>
                    <div className="w-2/4 px-4">
                      <div className="flex justify-between text-[10px] mb-1 font-bold">
                        <span className="text-amber-600">残り {m.active + m.stuck} 件</span>
                        <span className="text-gray-400">合計 {m.total} 件</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(m.done / m.total) * 100}%` }} className="bg-emerald-400 h-full" />
                        <div style={{ width: `${(m.active / m.total) * 100}%` }} className="bg-amber-500 h-full" />
                        <div style={{ width: `${(m.stuck / m.total) * 100}%` }} className="bg-rose-500 h-full" />
                      </div>
                    </div>
                    <div className="w-1/4 text-right">
                      {m.stuck > 0 ? <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-md border border-rose-200">ブロック中</span>
                      : m.active >= 4 ? <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-md border border-red-100">タスク過多</span>
                      : m.active > 0 ? <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-100">稼働中</span>
                      : <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md">受付可能</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="space-y-4">
            {stats.pageStats.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-xs">集計可能なページがありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.pageStats.map(p => (
                  <div key={p.name} className="border border-gray-100 bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800 text-sm truncate max-w-[70%]">{p.name}</span>
                      <span className={`text-xs font-bold ${p.rate === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{p.rate}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div style={{ width: `${p.rate}%` }} className={`${p.rate === 100 ? 'bg-emerald-500' : 'bg-blue-500'} h-full`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stuck' && (
          <div className="space-y-4">
            {stuckTasks.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm font-bold">現在、停滞しているタスクはありません。順調です！ 🎉</p>
            ) : (
              <div className="space-y-3">
                {stuckTasks.map(t => (
                  <div key={t.id} className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-mono mb-1">ID: {t.id.substring(0, 8)}</span>
                        <span className="font-bold text-gray-800 text-sm">{t.title}</span>
                      </div>
                      <span className="text-xs text-rose-700 font-bold bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200">
                        担当: {t.assignee || '未設定'}
                      </span>
                    </div>
                    <div className="bg-white border border-rose-200 p-3 rounded-lg shadow-sm">
                      <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">停滞の理由・課題</p>
                      <p className="text-sm font-bold text-rose-900 whitespace-pre-wrap">
                        {t.metadata?.stuck_reason || '理由は記載されていません。'}
                      </p>
                    </div>
                    {t.metadata?.memo && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-3">
                        <span className="font-bold text-gray-400 text-[10px] mr-1">MEMO:</span>
                        {t.metadata.memo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};