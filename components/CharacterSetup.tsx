

import React, { useState } from 'react';
import type { CharacterSettings } from '../types';

interface CharacterSetupProps {
  onSetupComplete: (settings: CharacterSettings) => void;
}

const CharacterSetup: React.FC<CharacterSetupProps> = ({ onSetupComplete }) => {
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>(''); // Use string for input, parse to number later
  const [initialLocation, setInitialLocation] = useState<string>('');
  const [personality, setPersonality] = useState<string>('');
  const [interests, setInterests] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAge = parseInt(age, 10);
    if (name.trim() && initialLocation.trim() && !isNaN(parsedAge) && parsedAge > 0 && personality.trim() && interests.trim()) {
      onSetupComplete({ 
        name: name.trim(), 
        age: parsedAge,
        initialLocation: initialLocation.trim(), 
        personality: personality.trim(),
        interests: interests.trim()
      });
    } else {
      // Basic validation feedback, can be improved
      alert("Vui lòng điền đầy đủ và hợp lệ tất cả các trường. Số tuổi phải là một số dương.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-sky-400 mb-8">Già Thiên Kỳ Truyện</h1>
        <p className="text-slate-300 mb-2">
          Chào mừng đạo hữu đến với Kỷ Nguyên Hậu Thiên Đế (5000 năm sau Diệp Phàm)!
        </p>
        <p className="text-slate-300 mb-6">
          Hãy tạo dựng nhân vật của bạn. Những chi tiết này sẽ ảnh hưởng đến khởi đầu và diễn biến câu chuyện.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="characterName" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Tên Nhân Vật
            </label>
            <input
              type="text"
              id="characterName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: Tiểu Minh, A Niu..."
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Số Tuổi
            </label>
            <input
              type="number"
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: 16"
              required
              aria-required="true"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="initialLocation" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Nơi Khởi Đầu Trong Kỷ Nguyên Mới
            </label>
            <p className="text-xs text-slate-400 mb-2 text-left">
              Đây là điểm xuất phát của bạn. Có thể là một ngôi làng hẻo lánh, một thành thị nhỏ, hoặc bất cứ đâu bạn tưởng tượng trong thời đại này.
            </p>
            <input
              type="text"
              id="initialLocation"
              value={initialLocation}
              onChange={(e) => setInitialLocation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: Làng Đá Nhỏ, ven Thiên Hà Cổ..."
              required
              aria-required="true"
            />
          </div>
           <div>
            <label htmlFor="personality" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Tính Cách (vài từ hoặc 1 câu)
            </label>
            <input
              type="text"
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: Hiền lành nhưng kiên định, thích khám phá, hơi nhút nhát..."
              required
              aria-required="true"
            />
          </div>
           <div>
            <label htmlFor="interests" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Sở Thích (vài từ hoặc 1 câu)
            </label>
            <input
              type="text"
              id="interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: Đọc sách cổ, ngắm sao, luyện võ, tìm hiểu về lịch sử..."
              required
              aria-required="true"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 text-lg"
          >
            Bắt Đầu Sáng Tạo Truyện
          </button>
        </form>
      </div>
      <footer className="mt-12 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Một sản phẩm của AI Sáng Tạo. Lấy cảm hứng từ Già Thiên.</p>
      </footer>
    </div>
  );
};

export default CharacterSetup;