import { useState } from 'react';
import { useCreateRoom } from '../hooks/useCreateRoom';

export const CreateRoomForm = () => {
  const [roomName, setRoomName] = useState('');
  const { createRoom, isLoading, error } = useCreateRoom();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom(roomName);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        新しいワークスペース
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
            ルーム名
          </label>
          <input
            id="roomName"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="例: 最高のハッカソンチーム"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            required
            disabled={isLoading}
          />
        </div>
        
        {/* エラー時のみ表示されるメッセージ領域 */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !roomName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isLoading ? '作成中...' : 'ルームを作成して始める'}
        </button>
      </form>
    </div>
  );
};