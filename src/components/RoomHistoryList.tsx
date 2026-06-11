type RoomHistory = {
  id: string;
  name: string;
  accessedAt: number;
};

type Props = {
  history: RoomHistory[];
  onNavigate: (roomId: string) => void;
  onClone: (roomId: string, e: React.MouseEvent) => void;
};

// 最近アクセスしたルームの履歴リスト
export const RoomHistoryList = ({ history, onNavigate, onClone }: Props) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-md border border-gray-200/60 space-y-3">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        最近使用したルーム
      </h4>
      <div className="flex flex-col gap-2">
        {history.map((historyRoom) => (
          <div
            key={historyRoom.id}
            onClick={() => onNavigate(historyRoom.id)}
            className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50/30 rounded-xl border border-gray-100 hover:border-blue-200 text-left transition-all group shadow-sm cursor-pointer"
          >
            <div className="truncate pr-4 flex-1">
              <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600 truncate">{historyRoom.name}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {historyRoom.id}</p>
            </div>
            <button
              type="button"
              onClick={(e) => onClone(historyRoom.id, e)}
              className="mr-3 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-100 flex items-center gap-1 shadow-sm"
            >
              複製
            </button>
            <span className="text-gray-300 group-hover:text-blue-500 font-bold text-sm transition-colors mr-1">&rarr;</span>
          </div>
        ))}
      </div>
    </div>
  );
};