import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../components/AdminPageHeader';

type Participant = { id: string; name: string; email: string; created_at: string };
type Question = { id: string; question_text: string; sort_order: number };
type Answer = { participant_id: string; question_id: string; answer_text: string };

export const AdminDashboard = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!hackathonId) return;
      setIsLoading(true);
      try {
        const { data: pData } = await supabase.from('participants').select('*').eq('hackathon_id', hackathonId).order('created_at', { ascending: false });
        const { data: qData } = await supabase.from('survey_questions').select('*').eq('hackathon_id', hackathonId).order('sort_order', { ascending: true });

        let aData: any[] = [];
        if (qData && qData.length > 0) {
          const questionIds = qData.map(q => q.id);
          const { data } = await supabase.from('survey_answers').select('*').in('question_id', questionIds);
          aData = data || [];
        }

        setParticipants(pData || []);
        setQuestions(qData || []);
        setAnswers(aData);
      } catch (error) {
        console.error('データの取得に失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [hackathonId]);

  const getAnswerText = (participantId: string, questionId: string) => {
    const answer = answers.find(a => a.participant_id === participantId && a.question_id === questionId);
    return answer ? answer.answer_text : '-';
  };

  const exportToCSV = () => {
    if (participants.length === 0) return;
    const headers = ['参加者ID', '名前', 'メールアドレス', '登録日時', ...questions.map(q => q.question_text)];
    const rows = participants.map(p => {
      const baseData = [p.id, p.name, p.email, new Date(p.created_at).toLocaleString('ja-JP')];
      const answerData = questions.map(q => getAnswerText(p.id, q.id));
      return [...baseData, ...answerData];
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hackathon_${hackathonId}_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!hackathonId) return <div className="p-8 text-white">ハッカソンIDが指定されていません。</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdminPageHeader title="参加者ダッシュボード" hackathonId={hackathonId} />

        <div className="flex items-center justify-between bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex gap-3 ml-auto">
            <button
              onClick={exportToCSV}
              disabled={participants.length === 0 || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CSV出力
            </button>
            <Link to={`/admin/survey/${hackathonId}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-lg border border-slate-700 transition-colors">
              設問を編集する
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">データを読み込んでいます...</div>
          ) : participants.length === 0 ? (
            <div className="p-12 text-center text-slate-500">参加者が登録されていません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-800/50">参加者ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-800/50">名前</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-800/50">メールアドレス</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-800/50">登録日時</th>
                    {questions.map((q, idx) => (
                      <th key={q.id} className="px-6 py-4 text-xs font-bold text-blue-400 tracking-widest border-r border-slate-800/50">Q{idx + 1}. {q.question_text}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {participants.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-xs text-blue-400 font-mono border-r border-slate-800/50 select-all">{p.id}</td>
                      <td className="px-6 py-4 font-bold text-white border-r border-slate-800/50">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono border-r border-slate-800/50">{p.email}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 border-r border-slate-800/50">{new Date(p.created_at).toLocaleString('ja-JP')}</td>
                      {questions.map(q => (
                        <td key={q.id} className="px-6 py-4 text-sm text-slate-300 border-r border-slate-800/50 truncate max-w-xs" title={getAnswerText(p.id, q.id)}>
                          {getAnswerText(p.id, q.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="text-right text-xs text-slate-500 font-mono">Total Participants: {participants.length}</div>
      </div>
    </div>
  );
};