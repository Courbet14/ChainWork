import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus } from '../types';

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

    // パイプ「|」でコマンドを分割
    const pipeParts = cmdStr.split('|').map(p => p.trim());
    const baseCmdArgs = pipeParts[0].split(' ');
    const command = baseCmdArgs[0].toLowerCase();
    const args = baseCmdArgs.slice(1);

    // 1次出力用のバッファ
    let outputLines: string[] = [];

    // 基本コマンドの実行
    if (command === 'help') {
      outputLines = [
        'help              : コマンド一覧を表示',
        'ls                : 現在のページのタスク一覧を表示',
        'cat [ID]          : 指定タスクの詳細情報を展開',
        'add [タスク名]    : ルートタスクをクイック追加',
        'status [ID] [状態]: 指定タスクのステータス（未着手・着手中・終了）を更新',
        'done [ID]         : 指定タスクのステータスを終了に更新',
        'whoami            : 現在のコンソール接続情報を表示',
        'clear             : ログをクリア',
        'exit              : コンソールを閉じる',
        'パイプ機能利用可能 : 例: ls | grep 着手中 | wc'
      ];
    } else if (command === 'ls') {
      if (tasks.length === 0) {
        outputLines = ['表示できるタスクがありません。'];
      } else {
        outputLines = tasks.map(t => `[${t.id.substring(0, 4)}] ${t.title} (${t.metadata?.status || '未着手'})`);
      }
    } else if (command === 'add') {
      const title = args.join(' ');
      if (!title) {
        outputLines = ['エラー: タスク名を入力してください。 例: add ログイン機能実装'];
      } else {
        await onQuickAdd(title);
        outputLines = [`タスク 「${title}」 をルートに追加しました。`];
      }
    } else if (command === 'done') {
      const shortId = args[0];
      const target = tasks.find(t => t.id.startsWith(shortId) || t.id === shortId);
      if (!target) {
        outputLines = ['エラー: 指定されたIDのタスクが見つかりません。ls でIDを確認してください。'];
      } else {
        await onQuickStatus(target.id, '終了');
        outputLines = [`タスク 「${target.title}」 を終了ステータスに更新しました。`];
      }
    } else if (command === 'clear') {
      setHistory([]);
      return;
    } else if (command === 'cat') {
      const shortId = args[0];
      const target = tasks.find(t => t.id.startsWith(shortId) || t.id === shortId);
      if (!target) {
        outputLines = ['エラー: 指定されたIDのタスクが見つかりません。'];
      } else {
        outputLines = [
          `----------------------------------------`,
          `タスク名 : ${target.title}`,
          `担当者   : ${target.assignee || '未設定'}`,
          `期間     : ${target.start_date || '未定'} 〜 ${target.end_date || '未定'}`,
          `状態     : ${target.metadata?.status || '未着手'}`,
          `メモ     : ${target.metadata?.memo || 'なし'}`,
          `----------------------------------------`
        ];
      }
    } else if (command === 'status') {
      const shortId = args[0];
      const newStatus = args[1];
      const target = tasks.find(t => t.id.startsWith(shortId) || t.id === shortId);
      if (!target) {
        outputLines = ['エラー: 指定されたIDのタスクが見つかりません。'];
      } else if (newStatus !== '未着手' && newStatus !== '着手中' && newStatus !== '終了') {
        outputLines = ['エラー: ステータスは「未着手」「着手中」「終了」のいずれかを指定してください。'];
      } else {
        await onQuickStatus(target.id, newStatus as any);
        outputLines = [`タスク 「${target.title}」 のステータスを [${newStatus}] に更新しました。`];
      }
    } else if (command === 'whoami') {
      outputLines = [
        `ユーザー       : CLI_USER (Developer Mode)`,
        `現在のタスク数 : ${tasks.length} 件`,
        `端末タイプ     : 擬似シリアルコンソール`
      ];
    } else if (command === 'exit') {
      onClose();
      return;
    } else {
      outputLines = [`コマンドが見つかりません: ${command}`];
    }

    // 2次処理: パイプの後半があるかチェック
    if (pipeParts.length > 1) {
      const pipeCmdArgs = pipeParts[1].split(' ');
      const pipeCommand = pipeCmdArgs[0].toLowerCase();
      const pipeArgs = pipeCmdArgs.slice(1).join(' ');

      if (pipeCommand === 'grep') {
        if (!pipeArgs) {
          outputLines = [...outputLines, 'エラー: grep の検索キーワードを指定してください。'];
        } else {
          outputLines = outputLines.filter(line => line.includes(pipeArgs));
        }
      } else if (pipeCommand === 'wc') {
        // 💡 ここを追加：出力された結果の行数を返します
        outputLines = [`${outputLines.length}`];
      } else {
        outputLines = [`エラー: サポートされていないパイプコマンドです: ${pipeCommand}`];
      }
    }

    // 最終結果を履歴に反映
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
        <span className="text-emerald-500 mr-2 font-bold">&gt;_</span>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-transparent text-emerald-400 focus:outline-none"
          placeholder="コマンドを入力..."
          autoFocus
        />
      </form>
    </div>
  );
};