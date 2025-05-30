
import React, { useState, useEffect, useCallback } from 'react';
import type { Character, StoryChapter, CharacterSettings } from './types';
import { GamePhase, Realm, RealmStages, Faction } from './types';
import { TARGET_CHARS_PER_CHAPTER, STORY_DOWNLOAD_FILENAME, DEFAULT_TARGET_CHAPTERS } from './constants';
import ApiKeyInput from './components/ApiKeyInput';
import CharacterSetup from './components/CharacterSetup';
import CharacterSheet from './components/CharacterSheet';
import StoryDisplay from './components/StoryDisplay';
import PlayerInput from './components/PlayerInput';
import ProgressBar from './components/ProgressBar';
import LoadingSpinner from './components/LoadingSpinner';
import { generateStorySegment, generateInitialStory, generateChapterTitle } from './services/geminiService';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('geminiApiKey_GTT') || null);
  const [gamePhase, setGamePhase] = useState<GamePhase>(apiKey ? GamePhase.SettingsSetup : GamePhase.ApiKeyInput);
  const [character, setCharacter] = useState<Character | null>(null);
  const [targetChapters, setTargetChapters] = useState<number>(DEFAULT_TARGET_CHAPTERS);
  const [completedChapters, setCompletedChapters] = useState<StoryChapter[]>([]);
  const [currentChapterContent, setCurrentChapterContent] = useState<string>("");
  const [currentChapterNumber, setCurrentChapterNumber] = useState<number>(1);
  const [currentChapterAIProposedTitle, setCurrentChapterAIProposedTitle] = useState<string>(""); // Title for the current in-progress chapter, set when previous completes

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApiKeySubmit = useCallback((submittedApiKey: string) => {
    setApiKey(submittedApiKey);
    localStorage.setItem('geminiApiKey_GTT', submittedApiKey); // Persist API key locally
    setGamePhase(GamePhase.SettingsSetup);
  }, []);

  const handleSettingsSetup = useCallback((settings: CharacterSettings) => {
    const initialCharacter: Character = {
      name: settings.name,
      realm: Realm.PhamNhan,
      stage: RealmStages[Realm.PhamNhan][0],
      faction: Faction.ChuaGiaNhap,
      location: settings.initialLocation,
    };
    setCharacter(initialCharacter);
    setTargetChapters(settings.targetChapters);
    setGamePhase(GamePhase.Playing);
    setCurrentChapterNumber(1);
    setCurrentChapterContent("");
    setCompletedChapters([]);
    setCurrentChapterAIProposedTitle("");
    setErrorMessage(null);
  }, []);

  const handleStartInitialStoryGeneration = useCallback(async () => {
    if (!character || !apiKey) {
      setErrorMessage("Nhân vật hoặc API Key chưa sẵn sàng.");
      return;
    }
    setIsLoadingAI(true);
    setErrorMessage(null);
    try {
      const initialStory = await generateInitialStory(apiKey, character.name, character.location);
      if (initialStory.startsWith("Lỗi API:") || initialStory.startsWith("Đã xảy ra lỗi")) {
        setErrorMessage(initialStory);
        setCurrentChapterContent(`Không thể bắt đầu câu chuyện cho ${character.name} tại ${character.location}. Lý do: ${initialStory}. Vui lòng kiểm tra API Key và thử lại.`);
      } else {
        setCurrentChapterContent(initialStory);
      }
    } catch (error) {
      console.error("Error generating initial story:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMsg);
      setCurrentChapterContent(`Không thể bắt đầu câu chuyện cho ${character.name} tại ${character.location}. Lỗi: ${errorMsg}. Vui lòng thử lại hoặc kiểm tra console.`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [character, apiKey]);

  const handleUpdateCharacter = useCallback((updates: Partial<Character>) => {
    setCharacter(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const processPlayerAction = useCallback(async (actionText: string) => {
    if (!character || !apiKey || currentChapterContent === "") return;

    setIsLoadingAI(true);
    setErrorMessage(null);
    try {
      const storyContext = {
        character,
        previousStoryChunk: currentChapterContent.slice(-1000), // Use a larger chunk for better context
        currentChapterNumber,
        charsInCurrentChapter: currentChapterContent.length,
      };
      const newStorySegment = await generateStorySegment(apiKey, storyContext, actionText);

      if (newStorySegment.startsWith("Lỗi API:") || newStorySegment.startsWith("Đã xảy ra lỗi")) {
        setErrorMessage(newStorySegment);
        setIsLoadingAI(false);
        return;
      }
      
      let updatedContent = currentChapterContent + "\n\n" + newStorySegment;

      if (updatedContent.length >= TARGET_CHARS_PER_CHAPTER) {
        const completedChapterFullContent = updatedContent.slice(0, TARGET_CHARS_PER_CHAPTER);
        // AI generates title for the completed chapter
        const aiTitle = await generateChapterTitle(apiKey, completedChapterFullContent, character, currentChapterNumber);

        setCompletedChapters(prev => [...prev, { 
          chapterNumber: currentChapterNumber, 
          title: aiTitle || `Chương ${currentChapterNumber}`, // Fallback if AI title fails
          content: completedChapterFullContent 
        }]);
        
        const nextChapterNumber = currentChapterNumber + 1;
        setCurrentChapterNumber(nextChapterNumber);
        setCurrentChapterContent(updatedContent.slice(TARGET_CHARS_PER_CHAPTER)); // Remaining part for new chapter
        setCurrentChapterAIProposedTitle(aiTitle); // Store for display as "Previously..."

        if (nextChapterNumber > targetChapters) {
          setGamePhase(GamePhase.Ended);
        }
      } else {
        setCurrentChapterContent(updatedContent);
      }

    } catch (error) {
      console.error("Error generating story segment:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingAI(false);
    }
  }, [character, apiKey, currentChapterContent, currentChapterNumber, targetChapters]);


  useEffect(() => {
    if (currentChapterNumber > targetChapters && gamePhase !== GamePhase.Ended) {
      setGamePhase(GamePhase.Ended);
      // Ensure the very last piece of content is captured if the game ends exactly on chapter completion
      if (currentChapterContent.length > 0 && completedChapters.length < targetChapters) {
         setCompletedChapters(prev => [...prev, { 
            chapterNumber: currentChapterNumber -1, // Should be the last completed chapter
            title: currentChapterAIProposedTitle || `Chương ${currentChapterNumber - 1}`,
            content: currentChapterContent 
        }]);
         setCurrentChapterContent(""); 
      }
    }
  }, [currentChapterNumber, targetChapters, gamePhase, currentChapterContent, completedChapters.length, currentChapterAIProposedTitle]);


  const handleDownloadStory = () => {
    let fullStory = completedChapters.map(ch => `${ch.title}\n\n${ch.content}`).join("\n\n---\n\n");
    
    const finalChapterTitle = currentChapterAIProposedTitle || `Chương ${currentChapterNumber}`;

    if (currentChapterContent.length > 0 && gamePhase !== GamePhase.Ended) {
       fullStory += `\n\n---\n\n${finalChapterTitle} (Đang viết...)\n\n${currentChapterContent}`;
    } else if (currentChapterContent.length > 0 && gamePhase === GamePhase.Ended && completedChapters.length >= targetChapters) {
      // If game ended and there's remaining content for the "last" chapter beyond target
      fullStory += `\n\n---\n\n${finalChapterTitle} (Phần cuối)\n\n${currentChapterContent}`;
    }


    const blob = new Blob([`Tiểu Thuyết Già Thiên Kỳ Truyện\nTác giả: ${character?.name || 'Nhân vật chính'}\nBắt đầu tại: ${character?.location || 'Không rõ'}\nSố chương mục tiêu: ${targetChapters}\n\n` + fullStory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = STORY_DOWNLOAD_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const resetGame = () => {
    // Optionally clear API key from localStorage too, or keep it for convenience
    // localStorage.removeItem('geminiApiKey_GTT'); 
    // setApiKey(null);
    // setGamePhase(GamePhase.ApiKeyInput);
    
    // For now, keep API key and go to settings setup
    setGamePhase(GamePhase.SettingsSetup);
    setCharacter(null);
    setCompletedChapters([]);
    setCurrentChapterContent("");
    setCurrentChapterNumber(1);
    setCurrentChapterAIProposedTitle("");
    setTargetChapters(DEFAULT_TARGET_CHAPTERS);
    setErrorMessage(null);
  };


  if (gamePhase === GamePhase.ApiKeyInput) {
    return <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} currentApiKey={apiKey} />;
  }

  if (gamePhase === GamePhase.SettingsSetup) {
    return <CharacterSetup onSetupComplete={handleSettingsSetup} />;
  }

  if (!character || !apiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
        <LoadingSpinner text="Đang tải dữ liệu hoặc chờ API key..." />
        {!apiKey && <p className="text-sky-300 mt-4">API Key chưa được thiết lập. <button onClick={() => setGamePhase(GamePhase.ApiKeyInput)} className="underline hover:text-sky-100">Đi đến màn hình nhập API Key</button></p>}
      </div>
    );
  }
  
  if (gamePhase === GamePhase.Ended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
        <h1 className="text-5xl font-bold text-amber-400 mb-6">Chúc Mừng!</h1>
        <p className="text-2xl text-slate-200 mb-4">
          Bạn đã hoàn thành cuộc hành trình <strong className="text-sky-300">{targetChapters}</strong> chương trong Già Thiên Kỳ Truyện!
        </p>
        <p className="text-slate-300 mb-8 max-w-2xl">
          Câu chuyện của nhân vật {character.name}, bắt đầu từ {character.location}, đã đi đến hồi kết theo mục tiêu đã chọn.
          Hy vọng bạn đã có những trải nghiệm tu tiên đáng nhớ. Giờ đây, bạn có thể tải xuống toàn bộ tác phẩm của mình.
        </p>
        <button
          onClick={handleDownloadStory}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Tải tiểu thuyết xuống"
        >
          Tải Tiểu Thuyết Xuống (.txt)
        </button>
         <button
          onClick={resetGame}
          className="mt-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Chơi lại"
        >
          Chơi Lại (Cài Đặt Mới)
        </button>
      </div>
    );
  }

  // Determine current chapter display title
  let displayChapterTitle = `Chương ${currentChapterNumber}`;
  if (currentChapterNumber > 1 && currentChapterAIProposedTitle) {
    // If it's not the first chapter and the previous one had a title generated.
    // This title (`currentChapterAIProposedTitle`) belongs to the *previous* completed chapter.
    // The current, in-progress chapter doesn't have an AI title yet.
    // So we stick to "Chương X (Đang viết...)"
  }
  if (currentChapterContent || completedChapters.length > 0) {
      displayChapterTitle += " (Đang viết...)";
  }
  // For completed chapters, their `ch.title` is used.

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 gap-4 bg-slate-900 relative">
      <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
        <CharacterSheet character={character} onUpdateCharacter={handleUpdateCharacter} />
        <ProgressBar 
          currentChapterNumber={currentChapterNumber} 
          currentCharacterCountInChapter={currentChapterContent.length}
          targetChapters={targetChapters}
        />
         <button
            onClick={handleDownloadStory}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Tải truyện hiện tại"
          >
            Tải Truyện Hiện Tại
          </button>
      </div>
      <main className="flex-grow md:w-2/3 lg:w-3/4 flex flex-col">
        {/* Removed manual chapter title input */}
        <StoryDisplay 
          completedChapters={completedChapters} 
          currentChapterContent={currentChapterContent}
          currentChapterNumber={currentChapterNumber}
          // Pass the AI-generated title of the *previous* chapter if available and relevant,
          // or just the number for the current one.
          // The StoryDisplay itself will handle "(Đang viết...)" for current chapter.
          currentChapterTitle={currentChapterAIProposedTitle && currentChapterNumber > 1 ? currentChapterAIProposedTitle : `Chương ${currentChapterNumber}`}
        />
        {isLoadingAI && <LoadingSpinner text="AI đang sáng tạo thế giới..." />}
        {errorMessage && <div className="mt-4 p-3 bg-red-800 border border-red-700 text-red-200 rounded-md" role="alert">{errorMessage}</div>}
        
        {gamePhase === GamePhase.Playing && !isLoadingAI && (
          currentChapterContent === "" && completedChapters.length === 0 && !errorMessage ? (
            <div className="mt-4 text-center">
              <button
                onClick={handleStartInitialStoryGeneration}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                disabled={isLoadingAI}
                aria-label="Bắt đầu cuộc phiêu lưu"
              >
                Bắt Đầu Cuộc Phiêu Lưu
              </button>
              <p className="text-slate-400 mt-3 text-sm">
                Nhấn để AI tạo ra đoạn mở đầu cho câu chuyện của bạn tại {character.location}.
              </p>
            </div>
          ) : (
            (currentChapterContent !== "" || completedChapters.length > 0) && 
            <PlayerInput onSubmitAction={processPlayerAction} isLoading={isLoadingAI} />
          )
        )}
        {gamePhase === GamePhase.Playing && !isLoadingAI && errorMessage && currentChapterContent.includes("Không thể bắt đầu câu chuyện") && (
           <div className="mt-4 text-center">
             <button
                onClick={handleStartInitialStoryGeneration}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                disabled={isLoadingAI}
                aria-label="Thử lại tạo cốt truyện"
              >
                Thử Lại Tạo Cốt Truyện
              </button>
           </div>
        )}
      </main>
      <div id="persistence-warning" 
           className="fixed bottom-0 left-0 right-0 bg-red-700/90 text-white text-center p-2 text-xs md:text-sm shadow-md backdrop-blur-sm"
           role="alert">
        <strong>Cảnh báo:</strong> Đây là game "một mạng". Nếu bạn đóng hoặc tải lại trang, toàn bộ hành trình sẽ bị mất. Hãy tải truyện thường xuyên!
      </div>
    </div>
  );
};

export default App;
