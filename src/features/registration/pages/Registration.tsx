import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

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
      const newParticipantId = crypto.randomUUID();
      const { error: pError } = await supabase.from('participants').insert([{
        id: newParticipantId,
        hackathon_id: hackathonId,
        name: name.trim(),
        email: email.trim(),
        team_id: null
      }]);

      if (pError) throw pError;

      if (questions.length > 0) {
        const answerInserts = questions.map(q => ({
          participant_id: newParticipantId,
          question_id: q.id,
          answer_text: answers[q.id] || ''
        }));
        const { error: aError } = await supabase.from('survey_answers').insert(answerInserts);
        if (aError) throw aError;
      }

      setAssignedId(newParticipantId);
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || '登録中にエラーが発生しました。');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <h2 className="text-2xl font-bold text-white">登録が完了しました</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            ハッカソンへの参加登録を受け付けました。運営からの連絡（チーム編成やワークスペースの案内）をお待ちください。
          </p>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mt-6">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">あなたの参加者ID</span>
            <span className="text-lg font-mono text-blue-400 font-bold select-all">{assignedId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-wider text-white mb-2">ChainWork</h1>
          <p className="text-sm text-slate-400">ハッカソン参加登録フォーム</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">氏名 <span className="text-red-400">*</span></label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="例: 浦野 凛生" 
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">メールアドレス <span className="text-red-400">*</span></label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="例: urano@example.com" 
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors" 
              />
            </div>
          </div>

          {questions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-300">事前アンケート</h3>
              {questions.map((q, index) => (
                <div key={q.id}>
                  <label className="block text-xs font-bold text-slate-400 mb-2">
                    Q{index + 1}. {q.question_text} {q.is_required && <span className="text-red-400">*</span>}
                  </label>
                  <input 
                    type="text" required={q.is_required} value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="回答を入力..."
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4">
              <p className="text-sm text-red-400 font-bold text-center">{errorMessage}</p>
            </div>
          )}

          <button 
            type="submit" disabled={status === 'loading'} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {status === 'loading' ? '登録処理中...' : '参加を登録する'}
          </button>
        </form>
      </div>
    </div>
  );
};