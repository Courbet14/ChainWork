import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus } from '../../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onQuickAdd: (title: string) => Promise<void>;
  onQuickStatus: (id: string, status: TaskStatus) => Promise<void>;
};

export const TerminalConsole = ({ isOpen, onClose, tasks, onQuickAdd, onQuickStatus }: Props) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'ChainWork 開発者向けデバッグコンソール',
    'help と入力すると利用可能な隠しコマンドが表示されます。'
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  if (!isOpen) return null;

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmdStr = input.trim();
    if (!cmdStr) return;

    setInput('');
    const nextHistory = [...history, `$ ${cmdStr}`];

    const pipeParts = cmdStr.split('|').map(p => p.trim());
    const baseCmdArgs = pipeParts[0].split(' ');
    const command = baseCmdArgs[0].toLowerCase();
    const args = baseCmdArgs.slice(1);

    let outputLines: string[] = [];

    switch (command) {
      case 'help':
        outputLines = [
          '利用可能なコマンド:',
          '  ls           - タスクの一覧表示',
          '  add [title]  - ルートタスクをクイック追加',
          '  done [id]    - 指定タスクを「終了」にする',
          '  clear        - コンソール履歴をクリア',
          '  stats        - ページ全体の進行状況',
          'パイプ (|) も一部サポート: grep, wc'
        ];
        break;
      case 'ls':
        if (tasks.length === 0) {
          outputLines = ['タスクがありません。'];
        } else {
          outputLines = tasks.map(t => `[${t.id.substring(0, 8)}] ${t.metadata?.status === '終了' ? '(DONE)' : '(TODO)'} ${t.title}`);
        }
        break;
      case 'add':
        if (args.length === 0) {
          outputLines = ['エラー: タスク名を指定してください。'];
        } else {
          const title = args.join(' ');
          await onQuickAdd(title);
          outputLines = [`タスクを作成しました: ${title}`];
        }
        break;
      case 'done':
        if (args.length === 0) {
          outputLines = ['エラー: タスクIDを指定してください。'];
        } else {
          const targetId = tasks.find(t => t.id.startsWith(args[0]))?.id;
          if (targetId) {
            await onQuickStatus(targetId, '終了');
            outputLines = [`タスクを終了しました: ${targetId}`];
          } else {
            outputLines = ['エラー: 該当するタスクが見つかりません。'];
          }
        }
        break;
      case 'stats':
        const doneCount = tasks.filter(t => t.metadata?.status === '終了').length;
        outputLines = [`Total Tasks: ${tasks.length}`, `Done: ${doneCount}`, `Remaining: ${tasks.length - doneCount}`];
        break;
      case 'clear':
        setHistory([]);
        return;
      default:
        outputLines = [`コマンドが見つかりません: ${command}`];
    }

    if (pipeParts.length > 1) {
      const pipeCommandStr = pipeParts[1];
      const pipeCmdArgs = pipeCommandStr.split(' ');
      const pipeCommand = pipeCmdArgs[0].toLowerCase();
      
      if (pipeCommand === 'grep') {
        const pipeArgs = pipeCmdArgs.slice(1).join(' ');
        if (!pipeArgs) {
          outputLines = ['エラー: grep には検索文字列が必要です。'];
        } else {
          outputLines = outputLines.filter(line => line.includes(pipeArgs));
        }
      } else if (pipeCommand === 'wc') {
        outputLines = [`${outputLines.length}`];
      } else {
        outputLines = [`エラー: サポートされていないパイプコマンドです: ${pipeCommand}`];
      }
    }

    setHistory([...nextHistory, ...outputLines]);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-64 bg-slate-950 text-emerald-400 font-mono text-xs p-4 z-50 border-t border-slate-800 flex flex-col shadow-2xl opacity-95">
      <div className="flex justify-between items-center pb-2 border-b border-slate-900 text-slate-500">
        <span>DEBUG_CONSOLE_BOARD_ACTIVE</span>
        <button onClick={onClose} className="hover:text-white font-bold">ESC または CLOSE</button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap">{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleCommand} className="flex items-center pt-2 border-t border-slate-900">
        <span className="text-emerald-500 mr-2">$</span>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} autoFocus className="flex-1 bg-transparent outline-none text-emerald-400 placeholder-emerald-900" placeholder="コマンドを入力..." />
      </form>
    </div>
  );
};