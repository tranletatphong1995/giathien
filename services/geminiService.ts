
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
  // Remove general markdown code blocks
  text = text.replace(/```(\w*?\s*\n?)?(.*?)\n?\s*```/gs, '$2');
  // Remove character update tag specifically if it wasn't handled or if it's a leftover
  text = text.replace(/\[CHARACTER_UPDATE:[^\]]+\]/gi, '');
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

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác dựa trên thế giới Già Thiên. Người chơi là nhân vật chính. Hãy viết tiếp câu chuyện dựa trên thông tin được cung cấp. Câu chuyện phải bằng tiếng Việt, văn phong lôi cuốn, giàu trí tưởng tượng, và phù hợp với thể loại tiên hiệp. Mỗi đoạn truyện bạn tạo ra là một phần của một chương lớn hơn. Giữ cho mỗi phản hồi khoảng 200-500 chữ tiếng Việt.

Quan trọng:
1.  **Kết Thúc Gợi Mở**: Luôn kết thúc đoạn truyện bằng một tình huống, một mô tả, hoặc một diễn biến mới mà tự nhiên gợi mở và đòi hỏi người chơi phải nhập hành động tiếp theo của họ. Không được tự đặt câu hỏi trực tiếp cho người chơi (ví dụ: "Bạn sẽ làm gì?") hoặc gợi ý hành động cụ thể trong nội dung truyện. Chỉ viết tiếp diễn biến câu chuyện một cách tự nhiên, tạo ra một cái kết mở để người chơi phản ứng.
2.  **Cập Nhật Nhân Vật (Nếu Có)**: Nếu hành động của người chơi hoặc diễn biến truyện một cách tự nhiên dẫn đến thay đổi về cảnh giới, tiểu cảnh, thế lực gia nhập, hoặc vị trí hiện tại của nhân vật, hãy lồng ghép mô tả sự thay đổi đó vào trong truyện. Đồng thời, hãy thêm một thẻ đặc biệt vào cuối đoạn text chứa thông tin cập nhật đó (và chỉ những thông tin thay đổi). Định dạng thẻ: \`[CHARACTER_UPDATE: key="value", key2="value2"]\`. Ví dụ: \`[CHARACTER_UPDATE: realm="Luân Hải Bí Cảnh", stage="Khổ Hải"]\` hoặc \`[CHARACTER_UPDATE: location="Thái Huyền Môn", faction="Đệ Tử Ngoại Môn"]\`. Nếu không có gì thay đổi, không cần thêm thẻ này. Diễn giải thay đổi phải tự nhiên trong mạch truyện.
3.  **Không Markdown Rác**: Chỉ trả về nội dung truyện thuần túy. Không bao gồm các ký tự markdown như \`\`\`json hoặc \`\`\` ở đầu hoặc cuối phản hồi.`;
  
  const prompt = `
Thông tin nhân vật hiện tại:
- Tên: ${character.name}
- Cảnh giới: ${character.realm} - ${character.stage}
- Thế lực: ${character.faction}
- Vị trí: ${character.location}

Bối cảnh chương ${currentChapterNumber} (đã có ${charsInCurrentChapter} chữ):
${previousStoryChunk ? `Diễn biến gần nhất (khoảng 1000 chữ cuối của đoạn trước): "${previousStoryChunk}"` : "Đây là khởi đầu của một tình tiết mới trong chương."}

Hành động gần nhất của người chơi:
"${playerAction}"

Yêu cầu:
Viết tiếp câu chuyện một cách chi tiết và hấp dẫn (khoảng 200-500 chữ). Mô tả môi trường, các nhân vật khác (nếu có), và các sự kiện diễn ra. Câu chuyện nên logic với thế giới Già Thiên và hành động của người chơi.
- Đảm bảo đoạn truyện kết thúc một cách gợi mở, tạo ra một tình huống mà người chơi cần phải đưa ra quyết định và hành động tiếp theo.
- Nếu có sự thay đổi về cảnh giới, vị trí, hoặc thế lực của nhân vật một cách tự nhiên, hãy mô tả nó trong truyện và thêm thẻ \`[CHARACTER_UPDATE: ...]\` vào cuối phản hồi của bạn với các thuộc tính đã thay đổi. Ví dụ, nếu nhân vật đột phá cảnh giới: "...linh khí cuộn trào, [Tên nhân vật] cảm thấy một tầng gông xiềng vô hình bị phá vỡ, thành công đột phá lên [Tên cảnh giới mới] - [Tên tiểu cảnh mới]. [CHARACTER_UPDATE: realm="Tên Cảnh Giới Mới", stage="Tên Tiểu Cảnh Mới"]".
- Chỉ viết nội dung truyện. Không thêm bất kỳ lời nhắc, câu hỏi trực tiếp, hay gợi ý hành động nào cho người chơi vào trong nội dung truyện.
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
    
    // Raw text potentially contains the update tag
    const rawTextWithTag = response.text; 
    // The calling function (App.tsx) will handle extracting the tag and cleaning the story.
    // Here, we just return it as is, after basic markdown stripping if any (though prompt asks not to include it).
    return stripMarkdown(rawTextWithTag); // stripMarkdown now also removes the CHARACTER_UPDATE tag if it's part of a larger markdown block by mistake
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateInitialStory = async (apiKey: string, characterName: string, initialLocation: string): Promise<string> => {
   if (!apiKey) {
    return `Chào mừng ${characterName} đến với thế giới Già Thiên! Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Lỗi: API Key chưa được cung cấp. Vui lòng vào cài đặt để nhập API Key trước khi bắt đầu.`;
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác dựa trên thế giới Già Thiên. Người chơi là nhân vật chính. Hãy viết đoạn mở đầu cho câu chuyện, tập trung vào mô tả và không khí, không đặt câu hỏi. Đoạn mở đầu này cũng cần kết thúc bằng một tình huống gợi mở để người chơi có thể nhập hành động đầu tiên. Không dùng markdown.`;
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

  const systemInstruction = `Bạn là một AI biên tập viên, nhiệm vụ của bạn là đặt một cái tên thật hấp dẫn và súc tích cho một chương truyện tiên hiệp dựa trên nội dung của nó. Tên chương phải bằng tiếng Việt. Không dùng markdown.`;
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
