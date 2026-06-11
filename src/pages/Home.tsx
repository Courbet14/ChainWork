import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { CreateRoomForm } from '../components/CreateRoomForm';
import { JoinRoomForm } from '../components/JoinRoomForm';
import { RoomHistoryList } from '../components/RoomHistoryList';

type RoomHistory = {
  id: string;
  name: string;
  accessedAt: number;
};

export const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const [roomHistory, setRoomHistory] = useState<RoomHistory[]>([]);

  const { cloneWholeRoom, isLoading: isCloning } = useRoom(undefined);

  // URLパラメータからのクローン要求判定
  const isCloneRoute = window.location.pathname === '/clone';
  const targetIdParam = searchParams.get('id');
  const isReallyCloning = isCloneRoute && targetIdParam && targetIdParam.trim() !== '' && targetIdParam !== 'null' && targetIdParam !== 'undefined';

  useEffect(() => {
    const historyRaw = localStorage.getItem('chainwork_room_history');
    if (historyRaw) {
      setRoomHistory(JSON.parse(historyRaw));
    }

    if (isReallyCloning && targetIdParam) {
      handleMagicClone(targetIdParam.trim());
    }
  }, [isReallyCloning, targetIdParam]);

  // URL共有からの自動クローン実行
  const handleMagicClone = async (sourceId: string) => {
    setIsSearching(true);
    const studentNewRoomId = `board-${Math.random().toString(36).substring(2, 7)}`;
    const success = await cloneWholeRoom(sourceId, studentNewRoomId);
    setIsSearching(false);

    if (success) {
      navigate(`/workspace/${studentNewRoomId}`);
    } else {
      alert('複製に失敗しました。対象ルームが存在しないか、制限されています。');
      navigate('/');
    }
  };

  // 履歴からの手動クローン実行
  const handleDirectClone = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このルームを複製して、新しいワークスペースを作成しますか？')) return;

    const studentNewRoomId = `board-${Math.random().toString(36).substring(2, 7)}`;
    const success = await cloneWholeRoom(sourceId, studentNewRoomId);
    if (success) {
      navigate(`/workspace/${studentNewRoomId}`);
    }
  };

  // 既存ルームへの参加処理
  const handleJoinRoom = async (roomId: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', roomId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        navigate(`/workspace/${data.id}`);
      } else {
        alert(`ルーム「${roomId}」が見つかりません。`);
      }
    } catch (err) {
      console.error(err);
      alert('検索中にエラーが発生しました。');
    } finally {
      setIsSearching(false);
    }
  };

  const showOverlay = !!(isReallyCloning && (isSearching || isCloning));

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-gray-800">
      
      {/* ヘッダーエリア */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          ChainWork
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          プロジェクトタスクの依存関係をリアルタイムに視覚化・管理
        </p>
      </div>

      {/* メインコンテンツエリア */}
      <div className="mt-4 sm:mx-auto w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6 h-full flex flex-col justify-between">
          <JoinRoomForm onJoin={handleJoinRoom} disabled={showOverlay} />
          <RoomHistoryList history={roomHistory} onNavigate={(id) => navigate(`/workspace/${id}`)} onClone={handleDirectClone} />
        </div>
        <div className="h-full">
          <CreateRoomForm />
        </div>
      </div>

      {/* 処理中のオーバーレイ表示 */}
      {showOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md text-white text-center p-6">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-xl font-black tracking-wide">テンプレートを複製中...</h3>
          <p className="text-xs text-slate-300 max-w-xs mt-2 leading-relaxed">
            ワークスペースを展開しています。しばらくお待ちください。
          </p>
        </div>
      )}
    </div>
  );
};