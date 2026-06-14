import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  jsonInput: string;
  setJsonInput: (val: string) => void;
  importStatus: string;
  onImport: () => Promise<void>;
};

const SYSTEM_PROMPT = `# 命令
あなたは優秀なプロジェクトマネージャー兼エンジニアです。
ユーザーから提供される「手順のテキスト」や「議事録」を解析し、タスク管理アプリにインポートするためのDAG（有向非巡回グラフ）形式のJSON配列を生成してください。

# 前提条件・制約
1. **ルートタスクの制限**: プロジェクトの起点となるルートタスク（親を持たないタスク）は、必ず「1つ」のみにしてください。
2. **依存関係と合流の構築**: \`temp_id\` と \`prev_temp_id\` を使ってタスクを数珠繋ぎにしてください。依存（合流）元が複数ある場合は、メインの親を \`prev_temp_id\` に設定し、残りの親タスクのIDを \`merged_temp_ids\` の配列に入れてください。
3. **マイルストーン（合流専用タスク）の活用【重要】**: 複数の並行タスクが終わって次のフェーズに進む際、依存の線が複雑に絡み合う（スパゲッティ化する）のを防ぐため、必要に応じて「〇〇フェーズ完了」「結合・統合テスト」といった**マイルストーンとなる合流専用タスクを意図的に作成**してください。これにより、DAGが視覚的に美しく整理され、進捗の区切りが分かりやすくなります。
4. **Markdownの活用**: \`memo\` フィールドは、見出し、リスト、太字などを活用した美しい**Markdown形式**で出力してください。ドキュメントのURLや注意点などもここにまとめます。
5. **出力形式**: 出力は必ずJSON配列のみとし、解説や挨拶のテキスト、Markdownのコードブロック記法（\`\`\`json など）は一切含めないでください。そのままパースしてシステムに読み込ませます。

# JSONフォーマット（必ず以下のキーのみを使用すること）
[
  {
    "temp_id": "一意の一時ID（例: t1, t2, t3...）",
    "prev_temp_id": "メインの親タスクの temp_id（ルートタスクの場合は null）",
    "merged_temp_ids": ["その他の合流元タスクの temp_id があれば配列で指定、なければ []"],
    "title": "タスク名（簡潔に）",
    "memo": "タスクの詳細。手順やリンクなどをMarkdownで記述。",
    "assignee": "担当者（テキストから推測できない場合は空文字 \\"\\"）",
    "start_date": "YYYY-MM-DD（推測できない場合は空文字 \\"\\"）",
    "end_date": "YYYY-MM-DD（推測できない場合は空文字 \\"\\"）"
  }
]

# 入力テキスト
ここに手順や議事録のテキストをペーストしてください。`;

export const TaskImportModal = ({ isOpen, onClose, jsonInput, setJsonInput, importStatus, onImport }: Props) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="text-lg font-bold text-gray-800">AIでタスクを一括生成</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          
          {/* プロンプトセクション */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl overflow-hidden flex-shrink-0">
            <div className="p-4 flex justify-between items-center bg-blue-50/80 border-b border-blue-100">
              <div>
                <h3 className="font-bold text-blue-900 text-sm">ステップ 1：AI用プロンプトのコピー</h3>
                <p className="text-xs text-blue-700/80 mt-0.5">ChatGPTやClaudeにこのプロンプトとテキストを貼り付けて、JSONを生成させます。</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPrompt(!showPrompt)} 
                  className="text-xs font-bold text-blue-600 px-3 py-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  {showPrompt ? '隠す' : 'プロンプトを確認'}
                </button>
                <button 
                  onClick={handleCopyPrompt}
                  className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-sm ${isCopied ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-blue-600 text-white hover:bg-blue-500 border-blue-700'}`}
                >
                  {isCopied ? '✓ コピーしました！' : '📄 プロンプトをコピー'}
                </button>
              </div>
            </div>
            
            {showPrompt && (
              <div className="p-4 bg-slate-900 text-slate-300 text-xs font-mono overflow-y-auto max-h-60 whitespace-pre-wrap select-all">
                {SYSTEM_PROMPT}
              </div>
            )}
          </div>

          {/* JSON入力セクション */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <h3 className="font-bold text-gray-800 text-sm mb-2">ステップ 2：生成されたJSONの貼り付け</h3>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="[\n  {\n    &quot;temp_id&quot;: &quot;t1&quot;,\n    &quot;prev_temp_id&quot;: null,\n    ...\n  }\n]"
              className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner"
            />
          </div>

          {importStatus && (
            <div className={`p-4 rounded-xl text-sm font-bold flex-shrink-0 border ${importStatus.includes('成功') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {importStatus}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors">
            キャンセル
          </button>
          <button 
            onClick={onImport} 
            disabled={!jsonInput.trim()} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            タスクを展開する
          </button>
        </div>

      </div>
    </div>
  );
};