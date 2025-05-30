
import React, { useState, useEffect, useCallback } from 'react';
import type { Character, StoryChapter, CharacterSettings } from './types';
import { GamePhase, Realm, RealmStages, Faction, OrderedRealms, AllFactions } from './types';
import { TARGET_CHARS_PER_CHAPTER, STORY_DOWNLOAD_FILENAME, DEFAULT_TARGET_CHAPTERS } from './constants';
import ApiKeyInput from './components/ApiKeyInput';
import CharacterSetup from './components/CharacterSetup';
import CharacterSheet from './components/CharacterSheet';
import StoryDisplay from './components/StoryDisplay';
import PlayerInput from './components/PlayerInput';
import ProgressBar from './components/ProgressBar';
import LoadingSpinner from './components/LoadingSpinner';
import { generateStorySegment, generateInitialStory, generateChapterTitle } from './services/geminiService';

// Utility function to trim text to the last sensible break
const trimToLastSensibleBreak = (text: string, maxLength?: number): string => {
  if (!text) return "";
  let RtrimmedText = text;
  if (maxLength && text.length > maxLength) {
    RtrimmedText = text.substring(0, maxLength);
  }

  // Find the last sentence-ending punctuation or newline
  // Regex looks for ., !, ? followed by space/newline OR just newline OR space before end of string
  const match = RtrimmedText.match(/^(.*[.!?\n\r])[\s\S]*$|^(.+[\s])[\s\S]*$/s);
  if (match) {
    // Prefer match group 1 (sentence end), then group 2 (space end)
    return (match[1] || match[2] || RtrimmedText).trim();
  }
  return RtrimmedText.trim(); // Fallback to simple trim if no clear break point
};


const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('geminiApiKey_GTT') || null);
  const [gamePhase, setGamePhase] = useState<GamePhase>(apiKey ? GamePhase.SettingsSetup : GamePhase.ApiKeyInput);
  const [character, setCharacter] = useState<Character | null>(null);
  const [targetChapters, setTargetChapters] = useState<number>(DEFAULT_TARGET_CHAPTERS);
  const [completedChapters, setCompletedChapters] = useState<StoryChapter[]>([]);
  const [currentChapterContent, setCurrentChapterContent] = useState<string>("");
  const [currentChapterNumber, setCurrentChapterNumber] = useState<number>(1);
  const [currentChapterAIProposedTitle, setCurrentChapterAIProposedTitle] = useState<string>("");

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApiKeySubmit = useCallback((submittedApiKey: string) => {
    setApiKey(submittedApiKey);
    localStorage.setItem('geminiApiKey_GTT', submittedApiKey);
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
  
  // Function to parse [CHARACTER_UPDATE: ...] tags and update character state
  const parseAndApplyCharacterUpdates = (textSegment: string): { cleanedSegment: string, updatesApplied: boolean } => {
    if (!character) return { cleanedSegment: textSegment, updatesApplied: false };

    const updateRegex = /\[CHARACTER_UPDATE:\s*([^\]]+)\]/gi;
    let cleanedSegment = textSegment;
    let updatesApplied = false;
    let match;
    
    const newUpdates: Partial<Character> = {};

    while ((match = updateRegex.exec(textSegment)) !== null) {
      cleanedSegment = cleanedSegment.replace(match[0], "").trim(); // Remove the tag from story
      const propsString = match[1];
      const propRegex = /(\w+)\s*=\s*"([^"]*)"/g;
      let propMatch;
      while ((propMatch = propRegex.exec(propsString)) !== null) {
        const key = propMatch[1] as keyof Character;
        const value = propMatch[2];
        
        if (key === "realm" && Object.values(Realm).includes(value as Realm)) {
            newUpdates.realm = value as Realm;
            // Reset stage if realm changes
            if (character.realm !== value) {
                 newUpdates.stage = RealmStages[value as Realm][0];
            }
            updatesApplied = true;
        } else if (key === "stage" && newUpdates.realm && RealmStages[newUpdates.realm as Realm]?.includes(value)) {
            newUpdates.stage = value;
            updatesApplied = true;
        } else if (key === "stage" && !newUpdates.realm && RealmStages[character.realm]?.includes(value)) { // Stage change within current realm
            newUpdates.stage = value;
            updatesApplied = true;
        } else if (key === "faction" && Object.values(Faction).includes(value as Faction)) {
            newUpdates.faction = value as Faction;
            updatesApplied = true;
        } else if (key === "location") {
            newUpdates.location = value;
            updatesApplied = true;
        }
      }
    }
    
    if (updatesApplied && Object.keys(newUpdates).length > 0) {
        setCharacter(prev => prev ? { ...prev, ...newUpdates } : null);
    }
    return { cleanedSegment, updatesApplied };
  };


  // This function is primarily for programmatic updates (e.g., by AI)
  const handleUpdateCharacter = useCallback((updates: Partial<Character>) => {
    setCharacter(prev => {
      if (!prev) return null;
      const newCharacterState = { ...prev, ...updates };
      // Ensure stage is valid for the realm
      if (updates.realm && (!updates.stage || !RealmStages[updates.realm]?.includes(updates.stage))) {
        newCharacterState.stage = RealmStages[updates.realm][0];
      }
      return newCharacterState;
    });
  }, []);


  const processPlayerAction = useCallback(async (actionText: string) => {
    if (!character || !apiKey || currentChapterContent === "") return;

    setIsLoadingAI(true);
    setErrorMessage(null);
    try {
      const storyContext = {
        character,
        previousStoryChunk: currentChapterContent.slice(-1500), // Provide a bit more context
        currentChapterNumber,
        charsInCurrentChapter: currentChapterContent.length,
      };
      let newStorySegmentFromAI = await generateStorySegment(apiKey, storyContext, actionText);

      if (newStorySegmentFromAI.startsWith("Lỗi API:") || newStorySegmentFromAI.startsWith("Đã xảy ra lỗi")) {
        setErrorMessage(newStorySegmentFromAI);
        setIsLoadingAI(false);
        return;
      }
      
      // Parse for character updates and remove the tag from the segment
      const { cleanedSegment, updatesApplied } = parseAndApplyCharacterUpdates(newStorySegmentFromAI);
      if (updatesApplied) {
        // Character state is updated via setCharacter in parseAndApplyCharacterUpdates
        // We might need to re-fetch character if generateChapterTitle needs the absolute latest
      }
      newStorySegmentFromAI = cleanedSegment;
      
      let combinedContent = currentChapterContent + "\n\n" + newStorySegmentFromAI;

      if (combinedContent.length >= TARGET_CHARS_PER_CHAPTER) {
        const chapterContentForCompletion = trimToLastSensibleBreak(combinedContent, TARGET_CHARS_PER_CHAPTER);
        const remainingForNextChapter = combinedContent.slice(chapterContentForCompletion.length).trimStart();

        // AI generates title for the completed chapter
        // Use a fresh character object if updates were applied.
        const charForTitle = updatesApplied ? (await (async () => { await new Promise(r => setTimeout(r,0)); return character; })())! : character;

        const aiTitle = await generateChapterTitle(apiKey, chapterContentForCompletion, charForTitle, currentChapterNumber);
        
        const completedChapter: StoryChapter = { 
          chapterNumber: currentChapterNumber, 
          title: aiTitle || `Chương ${currentChapterNumber}`,
          content: chapterContentForCompletion 
        };

        setCompletedChapters(prev => [...prev, completedChapter]);
        handleDownloadSingleChapter(completedChapter); // Auto-download completed chapter
        
        const nextChapterNumber = currentChapterNumber + 1;
        setCurrentChapterNumber(nextChapterNumber);
        setCurrentChapterContent(remainingForNextChapter);
        setCurrentChapterAIProposedTitle(aiTitle); 

        if (nextChapterNumber > targetChapters) {
          setGamePhase(GamePhase.Ended);
        }
      } else {
        setCurrentChapterContent(combinedContent);
      }

    } catch (error) {
      console.error("Error generating story segment:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingAI(false);
    }
  }, [character, apiKey, currentChapterContent, currentChapterNumber, targetChapters, parseAndApplyCharacterUpdates]);


  useEffect(() => {
    if (currentChapterNumber > targetChapters && gamePhase !== GamePhase.Ended) {
      setGamePhase(GamePhase.Ended);
      if (currentChapterContent.length > 0 && completedChapters.length < targetChapters) {
         const finalTrimmedContent = trimToLastSensibleBreak(currentChapterContent);
         setCompletedChapters(prev => [...prev, { 
            chapterNumber: currentChapterNumber -1, 
            title: currentChapterAIProposedTitle || `Chương ${currentChapterNumber - 1}`,
            content: finalTrimmedContent 
        }]);
         setCurrentChapterContent(""); 
      }
    }
  }, [currentChapterNumber, targetChapters, gamePhase, currentChapterContent, completedChapters.length, currentChapterAIProposedTitle]);

  const handleDownloadSingleChapter = (chapter: StoryChapter) => {
    if (!character) return;
    const sanitizedTitle = chapter.title.replace(/[^a-z0-9áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụứừửữựýỳỷỹỵđ\s_]/gi, '').replace(/\s+/g, '_');
    const filename = `GiaThienKyTruyen_Chuong${chapter.chapterNumber}_${sanitizedTitle || 'KhongTieuDe'}.txt`;
    
    const chapterText = `Chương ${chapter.chapterNumber}: ${chapter.title}\n\n${chapter.content}`;
    const blob = new Blob([chapterText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadStory = () => {
    let fullStory = completedChapters.map(ch => `Chương ${ch.chapterNumber}: ${ch.title}\n\n${ch.content}`).join("\n\n---\n\n");
    
    if (gamePhase !== GamePhase.Ended && currentChapterContent.length > 0) {
       const currentDisplayTitle = currentChapterAIProposedTitle && currentChapterNumber > 1 ? currentChapterAIProposedTitle : `Chương ${currentChapterNumber}`;
       fullStory += `\n\n---\n\n${currentDisplayTitle} (Đang viết...)\n\n${currentChapterContent}`; // Current content is not trimmed as it's ongoing
    } else if (gamePhase === GamePhase.Ended && currentChapterContent.length > 0 && completedChapters.length >= targetChapters) {
      // If game ended and there's remaining content that was part of the "last" chapter beyond target
      const finalChapterTitle = currentChapterAIProposedTitle || `Chương ${completedChapters.length +1}`; // Use last known proposed or increment
      const finalTrimmedContentForStory = trimToLastSensibleBreak(currentChapterContent);
      fullStory += `\n\n---\n\n${finalChapterTitle} (Phần cuối)\n\n${finalTrimmedContentForStory}`;
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
          Tải Toàn Bộ Tiểu Thuyết (.txt)
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

  let displayChapterTitleForStoryDisplay = `Chương ${currentChapterNumber}`;
   // StoryDisplay will handle adding "(Đang viết...)" for the current chapter.
   // currentChapterAIProposedTitle is title of *previous* chapter.

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
            Tải Toàn Bộ Truyện Hiện Tại
          </button>
      </div>
      <main className="flex-grow md:w-2/3 lg:w-3/4 flex flex-col">
        <StoryDisplay 
          completedChapters={completedChapters} 
          currentChapterContent={currentChapterContent}
          currentChapterNumber={currentChapterNumber}
          currentChapterTitle={displayChapterTitleForStoryDisplay} 
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
