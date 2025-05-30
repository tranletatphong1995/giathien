import React, { useState } from 'react';

interface PlayerInputProps {
  onSubmitAction: (actionText: string) => void;
  isLoading: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSubmitAction, isLoading }) => {
  const [actionText, setActionText] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionText.trim() && !isLoading) {
      onSubmitAction(actionText.trim());
      setActionText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={actionText}
        onChange={(e) => setActionText(e.target.value)}
        placeholder="Nhập hành động của bạn ở đây... (Ví dụ: Thăm dò xung quanh, nói chuyện với lão giả, luyện tập công pháp...)"
        rows={3}
        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors disabled:opacity-50"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="mt-3 w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? 'AI Đang Suy Nghĩ...' : 'Hành Động'}
      </button>
    </form>
  );
};

export default PlayerInput;
