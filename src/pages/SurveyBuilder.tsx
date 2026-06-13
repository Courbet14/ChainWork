import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Question = { 
  id: string; 
  question_text: string; 
  is_required: boolean; 
  sort_order: number;
  hackathon_id: string;
};

export const SurveyBuilder = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const fetchQuestions = async () => {
    if (!hackathonId) return;
    const { data } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('hackathon_id', hackathonId)
      .order('sort_order');
    if (data) setQuestions(data);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !hackathonId) return;

    await supabase.from('survey_questions').insert([{ 
      hackathon_id: hackathonId,
      question_text: newQuestion.trim(), 
      is_required: isRequired,
      sort_order: questions.length 
    }]);
    
    setNewQuestion('');
    setIsRequired(false);
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('survey_questions').delete().eq('id', id);
    fetchQuestions();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">📋 主催者設定：アンケート項目の作成</h2>
          <p className="text-sm text-slate-400 mt-2 font-mono">対象ハッカソンID: {hackathonId}</p>
        </div>
        
        <form onSubmit={handleAddQuestion} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-lg">
          <input 
            type="text" 
            value={newQuestion} 
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="追加したい質問（例: 学校名、得意なプログラミング言語など）"
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-300">
              <input 
                type="checkbox" 
                checked={isRequired} 
                onChange={(e) => setIsRequired(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900"
              />
              回答を必須にする
            </label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md">
              質問を追加
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-center text-slate-500 py-8 border border-dashed border-slate-800 rounded-xl">
              現在、アンケート項目はありません。
            </p>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
                <div>
                  <span className="text-slate-500 mr-3 font-mono">Q{idx + 1}.</span>
                  <span className="font-bold">{q.question_text}</span>
                  {q.is_required && (
                    <span className="ml-3 text-[10px] bg-red-900/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full font-bold">必須</span>
                  )}
                </div>
                <button 
                  onClick={() => handleDelete(q.id)} 
                  className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};