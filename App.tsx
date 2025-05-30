

import React, { useState, useEffect, useCallback } from 'react';
import type { Character, StoryChapter, CharacterSettings, KeyStoryEvent } from './types';
import { GamePhase, Realm, RealmStages, Faction } from './types';
import { TARGET_CHARS_PER_CHAPTER, STORY_DOWNLOAD_FILENAME, DEFAULT_TARGET_CHAPTERS, MAX_KEY_EVENTS_IN_LOG, MAX_KEY_EVENTS_FOR_PROMPT, KEY_EVENTS_STORAGE_KEY } from './constants';
import ApiKeyInput from './components/ApiKeyInput';
import CharacterSetup from './components/CharacterSetup';
import CharacterSheet from './components/CharacterSheet';
import StoryDisplay from './components/StoryDisplay';
import PlayerInput from './components/PlayerInput';
import ProgressBar from './components/ProgressBar';
import LoadingSpinner from './components/LoadingSpinner';
import Tutorial from './components/Tutorial';
import { generateStorySegment, generateInitialStory, generateChapterTitle } from './services/geminiService';

// Utility function to trim text to the last sensible break
const trimToLastSensibleBreak = (text: string, maxLength?: number): string => {
  if (!text) return "";
  let RtrimmedText = text;
  if (maxLength && text.length > maxLength) {
    RtrimmedText = text.substring(0, maxLength);
  }

  const match = RtrimmedText.match(/^(.*[.!?\n\r])[\s\S]*$|^(.+[\s])[\s\S]*$/s);
  if (match) {
    return (match[1] || match[2] || RtrimmedText).trim();
  }
  return RtrimmedText.trim(); 
};

// Interface for the result of parsing character updates and key events
interface ParsedAIResponse {
  cleanedSegment: string;
  characterUpdatesApplied: boolean;
  appliedCharacterUpdates: Partial<Character> | null;
  newKeyEvents: KeyStoryEvent[];
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('geminiApiKey_GTT') || null);
  const [gamePhase, setGamePhase] = useState<GamePhase>(apiKey ? GamePhase.SettingsSetup : GamePhase.ApiKeyInput);
  const [character, setCharacter] = useState<Character | null>(null);
  const [targetChapters, setTargetChapters] = useState<number>(DEFAULT_TARGET_CHAPTERS);
  const [completedChapters, setCompletedChapters] = useState<StoryChapter[]>([]);
  const [currentChapterContent, setCurrentChapterContent] = useState<string>("");
  const [currentChapterNumber, setCurrentChapterNumber] = useState<number>(1);
  const [currentChapterAIProposedTitle, setCurrentChapterAIProposedTitle] = useState<string>("");
  const [keyStoryEvents, setKeyStoryEvents] = useState<KeyStoryEvent[]>(() => {
    const storedEvents = localStorage.getItem(KEY_EVENTS_STORAGE_KEY);
    return storedEvents ? JSON.parse(storedEvents) : [];
  });

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(KEY_EVENTS_STORAGE_KEY, JSON.stringify(keyStoryEvents));
  }, [keyStoryEvents]);

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
    setKeyStoryEvents([]); // Reset key events for a new game
    setErrorMessage(null);
    setShowTutorial(true);
  }, []);

  const handleStartInitialStoryGeneration = useCallback(async () => {
    if (showTutorial) {
        setErrorMessage("Vui lòng hoàn tất hướng dẫn trước khi bắt đầu.");
        return;
    }
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
  }, [character, apiKey, showTutorial]);
  
  const parseAIResponse = useCallback((textSegment: string): ParsedAIResponse => {
    let cleanedSegment = textSegment;
    const charUpdates: Partial<Character> = {};
    let charUpdatesApplied = false;
    const newKeyEvents: KeyStoryEvent[] = [];

    // Parse Character Updates
    const charUpdateRegex = /\[CHARACTER_UPDATE:\s*([^\]]+)\]/gi;
    const charUpdateMatches = Array.from(cleanedSegment.matchAll(charUpdateRegex));
    if (charUpdateMatches.length > 0) {
        for (const match of charUpdateMatches) {
            const propsString = match[1];
            const propRegex = /(\w+)\s*=\s*"([^"]*)"/g;
            let propMatch;
            while ((propMatch = propRegex.exec(propsString)) !== null) {
                const key = propMatch[1] as keyof Character;
                const value = propMatch[2];
                if (key === "realm" && Object.values(Realm).includes(value as Realm)) {
                    charUpdates.realm = value as Realm;
                    if (character && character.realm !== value) { 
                         charUpdates.stage = RealmStages[value as Realm][0];
                    }
                    charUpdatesApplied = true;
                } else if (key === "stage") {
                    const targetRealmForStage = charUpdates.realm || character?.realm;
                    if (targetRealmForStage && RealmStages[targetRealmForStage]?.includes(value)) {
                        charUpdates.stage = value;
                        charUpdatesApplied = true;
                    }
                } else if (key === "faction" && Object.values(Faction).includes(value as Faction)) {
                    charUpdates.faction = value as Faction;
                    charUpdatesApplied = true;
                } else if (key === "location") {
                    charUpdates.location = value;
                    charUpdatesApplied = true;
                }
            }
        }
        cleanedSegment = cleanedSegment.replace(charUpdateRegex, "").trim();
        if (charUpdatesApplied && Object.keys(charUpdates).length > 0 && character) {
            setCharacter(prev => prev ? { ...prev, ...charUpdates } : null);
        }
    }

    // Parse Key Events
    const keyEventRegex = /\[KEY_EVENT:\s*([^\]]+)\]/gi;
    const keyEventMatches = Array.from(cleanedSegment.matchAll(keyEventRegex));
    if (keyEventMatches.length > 0) {
        for (const match of keyEventMatches) {
            const eventDescription = match[1].trim();
            if (eventDescription) {
                newKeyEvents.push(eventDescription);
            }
        }
        cleanedSegment = cleanedSegment.replace(keyEventRegex, "").trim();
        if (newKeyEvents.length > 0) {
            setKeyStoryEvents(prevEvents => {
                const updatedEvents = [...prevEvents, ...newKeyEvents];
                if (updatedEvents.length > MAX_KEY_EVENTS_IN_LOG) {
                    return updatedEvents.slice(updatedEvents.length - MAX_KEY_EVENTS_IN_LOG);
                }
                return updatedEvents;
            });
        }
    }
    
    // Final cleanup for any stray markdown (though AI is prompted not to use it)
    cleanedSegment = cleanedSegment.replace(/```(\w*?\s*\n?)?(.*?)\n?\s*```/gs, '$2').trim();

    return { 
        cleanedSegment, 
        characterUpdatesApplied: charUpdatesApplied, 
        appliedCharacterUpdates: charUpdatesApplied ? charUpdates : null,
        newKeyEvents
    };
  }, [character]);


  const handleUpdateCharacter = useCallback((updates: Partial<Character>) => {
    setCharacter(prev => {
      if (!prev) return null;
      const newCharacterState = { ...prev, ...updates };
      if (updates.realm && (!updates.stage || !RealmStages[updates.realm]?.includes(updates.stage))) {
        newCharacterState.stage = RealmStages[updates.realm][0];
      }
      return newCharacterState;
    });
  }, []);


  const processPlayerAction = useCallback(async (actionText: string) => {
    if (showTutorial) return;
    if (!character || !apiKey || (currentChapterContent === "" && completedChapters.length === 0)) { 
        if (currentChapterContent === "" && completedChapters.length > 0) {
            // Start new chapter
        } else if (currentChapterContent === "") { 
            setErrorMessage("Vui lòng nhấn 'Bắt Đầu Cuộc Phiêu Lưu' trước.");
            return;
        }
    }
    if (!character || !apiKey) return;

    setIsLoadingAI(true);
    setErrorMessage(null);
    try {
      const recentKeyEvents = keyStoryEvents.slice(-MAX_KEY_EVENTS_FOR_PROMPT);
      const keyEventsSummary = recentKeyEvents.length > 0 ? recentKeyEvents.map(event => `- ${event}`).join("\n") : undefined;

      const storyContext = {
        character,
        previousStoryChunk: currentChapterContent.slice(-1500), 
        currentChapterNumber,
        charsInCurrentChapter: currentChapterContent.length,
        keyEventsSummary,
      };
      let rawAIResponse = await generateStorySegment(apiKey, storyContext, actionText);

      if (rawAIResponse.startsWith("Lỗi API:") || rawAIResponse.startsWith("Đã xảy ra lỗi")) {
        setErrorMessage(rawAIResponse);
        setIsLoadingAI(false);
        return;
      }
      
      const { cleanedSegment, characterUpdatesApplied, appliedCharacterUpdates, newKeyEvents } = parseAIResponse(rawAIResponse);
      let newStorySegmentFromAI = cleanedSegment;
      
      let combinedContent = currentChapterContent ? (currentChapterContent + "\n\n" + newStorySegmentFromAI) : newStorySegmentFromAI;

      if (combinedContent.length >= TARGET_CHARS_PER_CHAPTER) {
        const chapterContentForCompletion = trimToLastSensibleBreak(combinedContent, TARGET_CHARS_PER_CHAPTER);
        const remainingForNextChapter = combinedContent.slice(chapterContentForCompletion.length).trimStart();

        let charForTitleGeneration = character; 
        if (characterUpdatesApplied && appliedCharacterUpdates) {
            // Use the most up-to-date character info for title generation
            // This relies on setCharacter having updated the character state,
            // but for title generation, it's better to construct it directly if possible.
             charForTitleGeneration = { ...character, ...appliedCharacterUpdates };
        }
        
        const aiTitle = await generateChapterTitle(apiKey, chapterContentForCompletion, charForTitleGeneration, currentChapterNumber);
        
        const completedChapter: StoryChapter = { 
          chapterNumber: currentChapterNumber, 
          title: aiTitle || `Chương ${currentChapterNumber}`,
          content: chapterContentForCompletion 
        };

        setCompletedChapters(prev => [...prev, completedChapter]);
        handleDownloadSingleChapter(completedChapter); 
        
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
  }, [character, apiKey, currentChapterContent, currentChapterNumber, targetChapters, completedChapters.length, parseAIResponse, showTutorial, keyStoryEvents]);


  useEffect(() => {
    if (currentChapterNumber > targetChapters && gamePhase !== GamePhase.Ended) {
      setGamePhase(GamePhase.Ended);
      if (currentChapterContent.length > 0) {
         const finalTrimmedContent = trimToLastSensibleBreak(currentChapterContent);
         const finalChapterNumber = completedChapters.length + 1; 
         setCompletedChapters(prev => [...prev, { 
            chapterNumber: finalChapterNumber, 
            title: currentChapterAIProposedTitle || `Chương ${finalChapterNumber} (Phần cuối)`,
            content: finalTrimmedContent 
        }]);
         setCurrentChapterContent(""); 
      }
    }
  }, [currentChapterNumber, targetChapters, gamePhase, currentChapterContent, completedChapters, currentChapterAIProposedTitle]);

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
    if (!character) return;
    let fullStory = completedChapters.map(ch => `Chương ${ch.chapterNumber}: ${ch.title}\n\n${ch.content}`).join("\n\n---\n\n");
    
    if (gamePhase === GamePhase.Playing && currentChapterContent.length > 0) {
       const currentDisplayTitle = `Chương ${currentChapterNumber} (Đang viết...)`;
       fullStory += `\n\n---\n\n${currentDisplayTitle}\n\n${currentChapterContent}`;
    }
    
    let keyEventsSection = "";
    if (keyStoryEvents.length > 0) {
        keyEventsSection = "\n\n--- CÁC SỰ KIỆN TRỌNG YẾU ĐÃ GHI NHẬN ---\n" + keyStoryEvents.map((event, index) => `${index + 1}. ${event}`).join("\n") + "\n---";
    }

    const blob = new Blob([`Tiểu Thuyết Già Thiên Kỳ Truyện\nTác giả: ${character.name}\nBắt đầu tại: ${character.location}\nSố chương mục tiêu: ${targetChapters}\n${keyEventsSection}\n\n` + fullStory], { type: 'text/plain;charset=utf-8' });
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
    setKeyStoryEvents([]); // Clear key events
    localStorage.removeItem(KEY_EVENTS_STORAGE_KEY); // Clear from localStorage too
    setErrorMessage(null);
    setShowTutorial(false); 
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
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

  const displayChapterTitleForStoryDisplay = `Chương ${currentChapterNumber}`;
  const canStartAdventure = gamePhase === GamePhase.Playing && !isLoadingAI && !showTutorial && currentChapterContent === "" && completedChapters.length === 0 && !errorMessage;
  const canRetryInitialStory = gamePhase === GamePhase.Playing && !isLoadingAI && !showTutorial && errorMessage && currentChapterContent.includes("Không thể bắt đầu câu chuyện");


  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 gap-4 bg-slate-900 relative">
      <Tutorial isOpen={showTutorial} onClose={handleCloseTutorial} />
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
        
        {canStartAdventure && (
            <div className="mt-4 text-center">
              <button
                onClick={handleStartInitialStoryGeneration}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                disabled={isLoadingAI || showTutorial}
                aria-label="Bắt đầu cuộc phiêu lưu"
              >
                Bắt Đầu Cuộc Phiêu Lưu
              </button>
              <p className="text-slate-400 mt-3 text-sm">
                Nhấn để AI tạo ra đoạn mở đầu cho câu chuyện của bạn tại {character.location}.
              </p>
            </div>
        )}
        
        {gamePhase === GamePhase.Playing && !showTutorial && (currentChapterContent !== "" || completedChapters.length > 0) && !canStartAdventure && (
          <PlayerInput onSubmitAction={processPlayerAction} isLoading={isLoadingAI} />
        )}

        {canRetryInitialStory && (
           <div className="mt-4 text-center">
             <button
                onClick={handleStartInitialStoryGeneration}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                disabled={isLoadingAI || showTutorial}
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
