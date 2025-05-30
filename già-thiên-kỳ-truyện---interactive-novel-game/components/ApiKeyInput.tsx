
import React, { useState } from 'react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  currentApiKey?: string | null;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit, currentApiKey }) => {
  const [apiKey, setApiKey] = useState<string>(currentApiKey || '');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
      setError('');
    } else {
      setError('API Key không được để trống.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-sky-400 mb-6">Cài Đặt API Key Gemini</h1>
        <p className="text-slate-300 mb-6">
          Vui lòng nhập API Key Google Gemini của bạn để bắt đầu. Bạn có thể lấy API Key từ Google AI Studio.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Nhập API Key của bạn vào đây"
              required
              aria-required="true"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Lưu và Tiếp Tục
          </button>
        </form>
         <p className="text-xs text-slate-500 mt-6">
            API Key của bạn sẽ chỉ được lưu trữ tạm thời trong trình duyệt cho phiên chơi này.
        </p>
      </div>
      <footer className="mt-12 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Một sản phẩm của AI Sáng Tạo. Lấy cảm hứng từ Già Thiên.</p>
      </footer>
    </div>
  );
};

export default ApiKeyInput;
