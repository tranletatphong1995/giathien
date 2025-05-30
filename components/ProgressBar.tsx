
import React from 'react';
import { TARGET_CHARS_PER_CHAPTER } from '../constants';

interface ProgressBarProps {
  currentChapterNumber: number;
  currentCharacterCountInChapter: number;
  targetChapters: number; // Now a prop
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentChapterNumber, currentCharacterCountInChapter, targetChapters }) => {
  const chapterProgress = Math.min(100, (currentCharacterCountInChapter / TARGET_CHARS_PER_CHAPTER) * 100);
  // Ensure targetChapters is at least 1 to avoid division by zero if not set properly
  const safeTargetChapters = Math.max(1, targetChapters); 
  const overallProgress = Math.min(100, ((currentChapterNumber -1 + (chapterProgress/100)) / safeTargetChapters) * 100);

  return (
    <div className="my-4 p-4 bg-slate-800 rounded-lg shadow">
      <div className="mb-2">
        <div className="flex justify-between text-sm text-sky-300 mb-1">
          <span>Chương {currentChapterNumber}/{safeTargetChapters}</span>
          <span>{chapterProgress.toFixed(0)}% ({currentCharacterCountInChapter.toLocaleString()}/{TARGET_CHARS_PER_CHAPTER.toLocaleString()} chữ)</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div 
            className="bg-sky-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${chapterProgress}%` }}
            aria-valuenow={chapterProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
            aria-label={`Tiến độ chương hiện tại: ${chapterProgress.toFixed(0)}%`}
          ></div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm text-amber-300 mb-1">
          <span>Tiến độ toàn truyện</span>
          <span>{overallProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-4">
          <div 
            className="bg-amber-500 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center text-xs font-medium text-black"
            style={{ width: `${overallProgress}%` }}
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
            aria-label={`Tiến độ toàn truyện: ${overallProgress.toFixed(1)}%`}
          >
           {overallProgress > 10 && `${overallProgress.toFixed(0)}%`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
