
import React, { useEffect, useRef } from 'react';
import type { StoryChapter } from '../types';

interface StoryDisplayProps {
  completedChapters: StoryChapter[];
  currentChapterContent: string;
  currentChapterNumber: number;
  currentChapterTitle: string; // This will be the AI-generated title of the PREVIOUS chapter, or "Chương X" for current
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  completedChapters, 
  currentChapterContent, 
  currentChapterNumber,
  currentChapterTitle // This is more like "current context title"
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [completedChapters, currentChapterContent]);

  const displayCurrentChapterHeader = `Chương ${currentChapterNumber} (Đang viết...)`;

  return (
    <div ref={scrollRef} className="h-[calc(60vh-40px)] sm:h-[calc(60vh-20px)] md:h-[calc(70vh-60px)] bg-slate-800 p-6 rounded-lg shadow-inner overflow-y-auto space-y-6 custom-scrollbar">
      {completedChapters.map((chapter) => (
        <div key={chapter.chapterNumber} className="mb-6 pb-4 border-b border-slate-700">
          {/* Completed chapters always use their AI-generated title */}
          <h3 className="text-xl font-semibold text-sky-400 mb-2">{chapter.title}</h3>
          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{chapter.content}</p>
        </div>
      ))}
      {/* Current in-progress chapter */}
      {(currentChapterContent || (completedChapters.length === 0 && !currentChapterContent)) && (
         <div>
          {currentChapterContent && (
            <>
              {/* The title for the current, in-progress chapter */}
              <h3 className="text-xl font-semibold text-sky-400 mb-2">{displayCurrentChapterHeader}</h3>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{currentChapterContent}</p>
            </>
          )}
          {!currentChapterContent && completedChapters.length === 0 && (
             <p className="text-slate-400 italic text-center py-10">Câu chuyện của bạn sẽ bắt đầu tại đây... Hãy nhấn "Bắt Đầu Cuộc Phiêu Lưu".</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryDisplay;
