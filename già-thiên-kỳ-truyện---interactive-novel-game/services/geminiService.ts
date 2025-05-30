
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Character } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

export interface StoryContext {
  character: Character;
  previousStoryChunk: string;
  currentChapterNumber: number;
  charsInCurrentChapter: number;
}

const stripMarkdown = (text: string): string => {
  if (!text) return "";
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = text.match(fenceRegex);
  if (match && match[2]) {
    return match[2].trim();
  }
  return text.trim();
};

const handleApiError = (error: unknown): string => {
  console.error("Gemini API error:", error);
  if (error instanceof Error) {
      if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("provide an API key")) {
           return `Lỗi API: API Key không hợp lệ hoặc chưa được cung cấp. Vui lòng kiểm tra lại key bạn đã nhập ở màn hình cài đặt. (Lỗi: ${error.message})`;
      }
       if (error.message.includes("Quota") || error.message.includes("quota")) {
          return `Lỗi API: Đã hết hạn ngạch sử dụng cho API Key này. Vui lòng thử lại sau hoặc dùng key khác. (Lỗi: ${error.message})`;
      }
      return `Đã xảy ra lỗi khi kết nối với AI: ${error.message}. Hãy thử lại sau.`;
  }
  return `Đã xảy ra lỗi không xác định khi kết nối với AI: ${String(error)}. Hãy thử lại sau.`;
};


export const generateStorySegment = async (
  apiKey: string,
  context: StoryContext,
  playerAction: string
): Promise<string> => {
  if (!apiKey) {
    return "Lỗi: API Key chưa được cung cấp. Vui lòng vào cài đặt để nhập API Key.";
  }
  const ai = new GoogleGenAI({ apiKey });
  const { character, previousStoryChunk, currentChapterNumber, charsInCurrentChapter } = context;

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác dựa trên thế giới Già Thiên. Người chơi là nhân vật chính. Hãy viết tiếp câu chuyện dựa trên thông tin được cung cấp. Câu chuyện phải bằng tiếng Việt, văn phong lôi cuốn, giàu trí tưởng tượng, và phù hợp với thể loại tiên hiệp. Mỗi đoạn truyện bạn tạo ra là một phần của một chương lớn hơn. Giữ cho mỗi phản hồi khoảng 200-500 chữ tiếng Việt. Quan trọng: Luôn kết thúc đoạn truyện bằng một tình huống, một mô tả, hoặc một diễn biến mới mà tự nhiên gợi mở và đòi hỏi người chơi phải nhập hành động tiếp theo của họ. Không được tự đặt câu hỏi trực tiếp cho người chơi (ví dụ: "Bạn sẽ làm gì?") hoặc gợi ý hành động cụ thể trong nội dung truyện. Chỉ viết tiếp diễn biến câu chuyện một cách tự nhiên, tạo ra một cái kết mở để người chơi phản ứng. Nếu có thể, hãy tinh tế lồng ghép các thay đổi về cảnh giới, thế lực, hoặc vị trí của nhân vật vào trong truyện nếu hành động của người chơi dẫn đến điều đó.`;
  
  const prompt = `
Thông tin nhân vật:
- Tên: ${character.name}
- Cảnh giới hiện tại: ${character.realm} - ${character.stage}
- Thế lực gia nhập: ${character.faction}
- Vị trí hiện tại: ${character.location}

Bối cảnh chương ${currentChapterNumber} (đã có ${charsInCurrentChapter} chữ):
${previousStoryChunk ? `Diễn biến gần nhất: "${previousStoryChunk}"` : "Đây là khởi đầu của một tình tiết mới."}

Hành động của người chơi:
"${playerAction}"

Yêu cầu:
Viết tiếp câu chuyện một cách chi tiết và hấp dẫn. Mô tả môi trường, các nhân vật khác (nếu có), và các sự kiện diễn ra. Câu chuyện nên logic với thế giới Già Thiên và hành động của người chơi. Chỉ viết nội dung truyện. Không thêm bất kỳ lời nhắc, câu hỏi trực tiếp, hay gợi ý hành động nào cho người chơi vào trong nội dung truyện. Hãy đảm bảo đoạn truyện kết thúc một cách gợi mở, tạo ra một tình huống mà người chơi cần phải đưa ra quyết định và hành động tiếp theo.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });
    
    const rawText = response.text;
    return stripMarkdown(rawText);
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateInitialStory = async (apiKey: string, characterName: string, initialLocation: string): Promise<string> => {
   if (!apiKey) {
    return `Chào mừng ${characterName} đến với thế giới Già Thiên! Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Lỗi: API Key chưa được cung cấp. Vui lòng vào cài đặt để nhập API Key trước khi bắt đầu.`;
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác dựa trên thế giới Già Thiên. Người chơi là nhân vật chính. Hãy viết đoạn mở đầu cho câu chuyện, tập trung vào mô tả và không khí, không đặt câu hỏi. Đoạn mở đầu này cũng cần kết thúc bằng một tình huống gợi mở để người chơi có thể nhập hành động đầu tiên.`;
  const prompt = `Nhân vật chính tên là ${characterName}. Họ vừa mới xuất hiện tại ${initialLocation}, một nơi bình dị nhưng ẩn chứa nhiều điều chưa biết trong thế giới Già Thiên rộng lớn. Cảnh giới ban đầu của họ là Phàm Nhân - Người Thường, thân phận là một người bình thường với khát vọng tu tiên (hoặc một mục tiêu khác mà người chơi sẽ quyết định sau). Hãy viết một đoạn văn ngắn (khoảng 100-200 chữ) mô tả khung cảnh và cảm xúc ban đầu của nhân vật, khơi gợi một chút bí ẩn hoặc một sự kiện sắp xảy ra. Quan trọng: Hãy kết thúc đoạn văn này bằng một tình huống hoặc mô tả mà tự nhiên khiến người chơi muốn nhập vào hành động đầu tiên của họ. Không hỏi người chơi phải làm gì.`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
      }
    });
    const rawText = response.text;
    return stripMarkdown(rawText) || `Chào mừng ${characterName} đến với thế giới Già Thiên! Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Một cơn gió lạ thổi qua, mang theo tiếng thì thầm xa xăm. Bạn cảm thấy có điều gì đó đang chờ đợi phía trước.`;
  } catch (error) {
     const defaultErrorStory = `Chào mừng ${characterName} đến với thế giới Già Thiên! Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Một cơn gió lạ thổi qua, mang theo tiếng thì thầm xa xăm. Bạn cảm thấy có điều gì đó đang chờ đợi phía trước.`;
     return `${defaultErrorStory} (Lỗi tạo truyện ban đầu: ${handleApiError(error)})`;
  }
};

export const generateChapterTitle = async (
  apiKey: string,
  chapterContent: string,
  character: Character,
  chapterNumber: number
): Promise<string> => {
  if (!apiKey) {
    return `Chương ${chapterNumber}`; // Fallback title
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI biên tập viên, nhiệm vụ của bạn là đặt một cái tên thật hấp dẫn và súc tích cho một chương truyện tiên hiệp dựa trên nội dung của nó. Tên chương phải bằng tiếng Việt.`;
  const prompt = `
Dưới đây là toàn bộ nội dung của chương ${chapterNumber} trong một cuốn tiểu thuyết tiên hiệp về nhân vật ${character.name} (cảnh giới ${character.realm} - ${character.stage}, thế lực ${character.faction}, đang ở ${character.location}):

--- NỘI DUNG CHƯƠNG ---
${chapterContent.substring(0, 8000)} 
--- KẾT THÚC NỘI DUNG CHƯƠNG ---
(Lưu ý: Nội dung có thể rất dài, chỉ cần tập trung vào các sự kiện chính và không khí chung của chương.)

Yêu cầu:
Dựa vào nội dung trên, hãy đề xuất một tên chương (khoảng 3-10 từ) thật lôi cuốn, gợi mở và phù hợp với thể loại tiên hiệp. 
Ví dụ: "Huyết Chiến Hoang Cổ Cấm Địa", "Bí Mật Thạch Thôn", "Cửu Long Kéo Quan Tài", "Linh Khư Động Thiên Gặp Nguy".
Chỉ trả về tên chương, không thêm "Chương X:" hay bất kỳ tiền tố nào khác.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
        topK: 30,
        topP: 0.9,
      }
    });
    const rawTitle = response.text;
    // Sanitize title: remove "Chương X:", quotes, trim. Max length 100 chars.
    let title = stripMarkdown(rawTitle).replace(/^Chương \d+[:\s]*/i, '').replace(/["']/g, '').trim();
    return title.substring(0, 100) || `Chương ${chapterNumber}: Diễn Biến Bất Ngờ`; // Fallback if AI returns empty
  } catch (error) {
    console.error("Gemini API error (generate chapter title):", error);
    return `Chương ${chapterNumber}: Hành Trình Tiếp Diễn`; // Fallback title on error
  }
};
