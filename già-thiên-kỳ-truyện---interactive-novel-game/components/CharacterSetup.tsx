
import React, { useState } from 'react';
import type { CharacterSettings } from '../types';
import { CHAPTER_OPTIONS, ESTIMATED_TIME_PER_CHAPTER_RANGE_HOURS, DEFAULT_TARGET_CHAPTERS } from '../constants';

interface CharacterSetupProps {
  onSetupComplete: (settings: CharacterSettings) => void;
}

const CharacterSetup: React.FC<CharacterSetupProps> = ({ onSetupComplete }) => {
  const [name, setName] = useState<string>('');
  const [initialLocation, setInitialLocation] = useState<string>('');
  const [targetChapters, setTargetChapters] = useState<number>(DEFAULT_TARGET_CHAPTERS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && initialLocation.trim()) {
      onSetupComplete({ name: name.trim(), initialLocation: initialLocation.trim(), targetChapters });
    }
  };

  const getEstimatedPlaytime = (chapters: number): string => {
    const minHours = chapters * ESTIMATED_TIME_PER_CHAPTER_RANGE_HOURS[0];
    const maxHours = chapters * ESTIMATED_TIME_PER_CHAPTER_RANGE_HOURS[1];
    if (minHours === maxHours) return `${minHours.toFixed(1)} giờ`;
    return `${minHours.toFixed(1)} - ${maxHours.toFixed(1)} giờ`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-sky-400 mb-8">Già Thiên Kỳ Truyện</h1>
        <p className="text-slate-300 mb-6">
          Chào mừng đạo hữu! Hãy tạo dựng nhân vật, chọn độ dài cho thiên truyện và bắt đầu hành trình của mình.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="Ví dụ: Diệp Phàm, Vô Thủy..."
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="initialLocation" className="block text-sm font-medium text-sky-300 mb-1 text-left">
              Vị Trí Khởi Đầu
            </label>
            <input
              type="text"
              id="initialLocation"
              value={initialLocation}
              onChange={(e) => setInitialLocation(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Ví dụ: Một sơn cốc hẻo lánh, Bên bờ Hoàng Hà..."
              required
              aria-required="true"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sky-300 mb-2 text-left">
              Độ Dài Truyện (Số Chương Mục Tiêu)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CHAPTER_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTargetChapters(option)}
                  className={`p-4 border rounded-lg transition-all duration-200 ease-in-out
                    ${targetChapters === option 
                      ? 'bg-sky-600 border-sky-500 text-white shadow-lg ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-800' 
                      : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 text-slate-200'}`}
                >
                  <span className="block font-semibold text-lg">{option} chương</span>
                  <span className="block text-xs mt-1">Ước tính: {getEstimatedPlaytime(option)}</span>
                </button>
              ))}
            </div>
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
