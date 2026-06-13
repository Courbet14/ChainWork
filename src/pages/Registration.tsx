import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const Registration = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadQuestions = async () => {
      if (!hackathonId) return;
      const { data } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .order('sort_order');
      if (data) setQuestions(data);
    };
    loadQuestions();
  }, [hackathonId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathonId) {
      setErrorMessage('無効な登録URLです。');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // 1. 基本情報を participants テーブルに保存
      const { data: participantData, error: pError } = await supabase
        .from('participants')
        .insert([{ 
          hackathon_id: hackathonId,
          name: name.trim(), 
          email: email.trim() 
        }])
        .select('id')
        .single();

      if (pError) throw pError;

      // 2. アンケートの回答を survey_answers テーブルに一括保存
      const answerInserts = questions.map(q => ({
        participant_id: participantData.id,
        question_id: q.id,
        answer_text: answers[q.id] || ''
      })).filter(a => a.answer_text !== '');

      if (answerInserts.length > 0) {
        const { error: aError } = await supabase.from('survey_answers').insert(answerInserts);
        if (aError) throw aError;
      }

      setAssignedId(participantData.id);
      setStatus('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      // メアド重複（23505）などのエラーハンドリング
      if (err.code === '23505') {
        setErrorMessage('このメールアドレスは既に登録されています。');
      } else {
        setErrorMessage('登録中にエラーが発生しました。時間をおいて再度お試しください。');
      }
      setStatus('error');
    }
  };

  if (!hackathonId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
        <p className="text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-900/50">
          ハッカソンIDが指定されていません。正しいURLからアクセスしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wider mb-2">ChainWork</h2>
          <p className="text-sm text-slate-400">ハッカソン参加登録フォーム</p>
          <div className="mt-2 inline-block bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-500 font-mono">
            ID: {hackathonId}
          </div>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-8 text-center space-y-4">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-emerald-400">登録完了！</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              あなたの参加IDは以下になります。<br />
              チーム連携などで使用するため、コピーして控えておいてください。
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm break-all text-blue-400 shadow-inner select-all">
              {assignedId}
            </div>
            <button
              onClick={() => {
                setStatus('idle');
                setName('');
                setEmail('');
                setAnswers({});
              }}
              className="mt-6 text-xs text-slate-400 hover:text-white transition-colors underline"
            >
              別のメンバーを続けて登録する
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報エリア */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  お名前 <span className="text-red-400 ml-1">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="例: 山田 太郎"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  メールアドレス <span className="text-red-400 ml-1">*</span>
                </label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="例: user@example.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" 
                />
              </div>
            </div>

            {/* 動的アンケートエリア */}
            {questions.length > 0 && (
              <div className="pt-6 border-t border-slate-800/80 space-y-5">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  主催者からのアンケート
                </p>
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                    <label className="block text-sm font-bold text-slate-300 mb-3 leading-relaxed">
                      <span className="text-slate-500 font-mono text-xs mr-2">Q{idx + 1}.</span>
                      {q.question_text} 
                      {q.is_required && <span className="text-red-400 text-xs ml-2">*</span>}
                    </label>
                    <input 
                      type="text" 
                      required={q.is_required}
                      value={answers[q.id] || ''} 
                      onChange={e => handleAnswerChange(q.id, e.target.value)} 
                      placeholder="回答を入力..."
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                ))}
              </div>
            )}

            {/* エラーメッセージ表示 */}
            {status === 'error' && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4">
                <p className="text-sm text-red-400 font-bold text-center">{errorMessage}</p>
              </div>
            )}

            {/* 送信ボタン */}
            <button 
              type="submit" 
              disabled={status === 'loading'} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  登録処理中...
                </>
              ) : (
                '参加を登録する'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};