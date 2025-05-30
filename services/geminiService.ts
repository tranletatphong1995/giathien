

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Character, KeyStoryEvent, CharacterSettings } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

export interface StoryContext {
  character: Character; // Includes age, personality, interests
  previousStoryChunk: string;
  currentChapterNumber: number;
  charsInCurrentChapter: number;
  keyEventsSummary?: string; 
}

const stripMarkdown = (text: string): string => {
  if (!text) return "";
  text = text.replace(/```(\w*?\s*\n?)?(.*?)\n?\s*```/gs, '$2');
  text = text.replace(/\[CHARACTER_UPDATE:[^\]]+\]/gi, '');
  text = text.replace(/\[KEY_EVENT:[^\]]+\]/gi, '');
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
  const { character, previousStoryChunk, currentChapterNumber, charsInCurrentChapter, keyEventsSummary } = context;

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác lấy bối cảnh 5000 NĂM SAU các sự kiện chính của truyện Già Thiên gốc. Câu chuyện phải bằng tiếng Việt, văn phong lôi cuốn.

Bối Cảnh Kỷ Nguyên Hậu Thiên Đế:
- Diễn ra 5000 năm sau Diệp Phàm. Diệp Phàm là huyền thoại. Thiên Đình do ông lập đã là trật tự vũ trụ.
- Diệp Y Thủy (con Diệp Phàm) là Thiên Đế đương nhiệm.
- "Thiên Đế Thánh Địa" là trung tâm tu luyện mới. Lâm Thiên Vũ là thiên tài trẻ nổi bật.
- Cửa Tiên Vực mở định kỳ. Mối đe dọa mới: "Hư Không Ma Tộc". "Liên Minh Vũ Trụ" được lập để đối phó.

Yêu cầu khi viết truyện:
1.  **Bối Cảnh Nhất Quán**: Câu chuyện diễn ra 5000 năm sau Diệp Phàm. Nhân vật của người chơi là người của thời đại mới, ban đầu có thể không biết nhiều về các thế lực lớn hay cảnh giới cao thâm. Hãy để họ khám phá dần dần. Đừng giới thiệu các khái niệm quá phức tạp hoặc các nhân vật/thế lực quá mạnh mẽ ngay từ đầu.
2.  **Phản Ánh Tính Cách Nhân Vật**: Luôn nhớ tính cách (${character.personality}), tuổi (${character.age}), và sở thích (${character.interests}) của nhân vật. Hãy để những yếu tố này ảnh hưởng đến cách họ phản ứng, lựa chọn và cách câu chuyện diễn biến xung quanh họ.
3.  **Kết Thúc Gợi Mở (BẮT BUỘC)**: Mỗi đoạn truyện bạn viết PHẢI kết thúc bằng một tình huống, một mô tả, hoặc một diễn biến mới mà tự nhiên ĐÒI HỎI người chơi phải nhập hành động tiếp theo. Đây là yếu tố then chốt. Không được tự đặt câu hỏi trực tiếp cho người chơi hoặc gợi ý hành động.
4.  **Cập Nhật Nhân Vật (Nếu Có)**: Nếu diễn biến truyện dẫn đến thay đổi về cảnh giới, tiểu cảnh, thế lực, hoặc vị trí của nhân vật, hãy lồng ghép mô tả vào truyện và thêm thẻ: \`[CHARACTER_UPDATE: key="value"]\`. Ví dụ: \`[CHARACTER_UPDATE: realm="Luân Hải Bí Cảnh", faction="Tán Tu"]\`.
5.  **Ghi Nhận Sự Kiện Trọng Yếu (Nếu Có)**: Nếu có sự kiện CỰC KỲ quan trọng, thêm thẻ VÀO CUỐI CÙNG: \`[KEY_EVENT: Mô tả ngắn gọn sự kiện, dưới 25 từ]\`.
6.  **Không Markdown Rác**: Chỉ trả về nội dung truyện thuần túy.

Hãy viết tiếp câu chuyện một cách tự nhiên, tạo ra một cái kết mở để người chơi phản ứng. Lồng ghép các yếu tố của Kỷ Nguyên Hậu Thiên Đế một cách hợp lý, từ từ khi nhân vật khám phá ra.`;
  
  const prompt = `
Thông tin nhân vật hiện tại (Tu sĩ của Kỷ Nguyên Hậu Thiên Đế):
- Tên: ${character.name}
- Tuổi: ${character.age}
- Tính cách: ${character.personality}
- Sở thích: ${character.interests}
- Cảnh giới: ${character.realm} - ${character.stage}
- Thế lực: ${character.faction}
- Vị trí: ${character.location}

${keyEventsSummary ? `Những sự kiện trọng yếu đã xảy ra trong quá khứ (cần ghi nhớ để đảm bảo tính nhất quán):\n${keyEventsSummary}\n` : ""}
Bối cảnh chương ${currentChapterNumber} (đã có ${charsInCurrentChapter} chữ):
${previousStoryChunk ? `Diễn biến gần nhất (khoảng 1000 chữ cuối của đoạn trước): "${previousStoryChunk}"` : "Đây là khởi đầu của một tình tiết mới trong chương."}

Hành động gần nhất của người chơi:
"${playerAction}"

Yêu cầu:
Viết tiếp câu chuyện một cách chi tiết và hấp dẫn (khoảng 200-500 chữ) trong bối cảnh Kỷ Nguyên Hậu Thiên Đế.
- Câu chuyện phải phản ánh tính cách, sở thích của nhân vật. Diễn biến nên phù hợp với một người mới bắt đầu hành trình, dần dần khám phá thế giới.
- Các thế lực lớn, cảnh giới cao, nhân vật huyền thoại chỉ nên được nhắc đến xa xôi hoặc khám phá từ từ, không xuất hiện đột ngột.
- **QUAN TRỌNG**: Đoạn truyện PHẢI kết thúc bằng một tình huống, một mô tả cụ thể khiến người chơi phải đưa ra quyết định và hành động tiếp theo.
- Nếu có thay đổi về cảnh giới, vị trí, hoặc thế lực, thêm thẻ \`[CHARACTER_UPDATE: ...]\`.
- Nếu có sự kiện trọng yếu, thêm thẻ \`[KEY_EVENT: ...]\`.
- Chỉ viết nội dung truyện. Không thêm lời nhắc, câu hỏi trực tiếp, hay gợi ý hành động cho người chơi.
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
    
    const rawTextWithTags = response.text; 
    return rawTextWithTags; 
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateInitialStory = async (apiKey: string, settings: CharacterSettings): Promise<string> => {
   if (!apiKey) {
    return `Chào mừng ${settings.name}! Bạn bắt đầu hành trình tại ${settings.initialLocation} ở tuổi ${settings.age}. Lỗi: API Key chưa được cung cấp. Vui lòng vào cài đặt.`;
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác. Bối cảnh là 5000 NĂM SAU các sự kiện chính của truyện Già Thiên gốc. 
Yêu cầu:
1.  **Tập Trung Nhân Vật**: Viết đoạn mở đầu dựa trên các thông tin cá nhân của nhân vật (tên, tuổi, vị trí, tính cách, sở thích).
2.  **Khởi Đầu Khiêm Tốn**: Nhân vật là Phàm Nhân, chưa biết gì về các thế lực lớn hay cảnh giới cao siêu. Thế giới xung quanh họ ban đầu nên bình thường, có thể có chút kỳ bí địa phương.
3.  **BẮT BUỘC KẾT THÚC GỢI MỞ HÀNH ĐỘNG**: Đoạn văn PHẢI kết thúc bằng một tình huống cụ thể, một sự kiện đang diễn ra, hoặc một khám phá bất ngờ ngay trước mắt nhân vật, khiến người chơi phải nhập hành động đầu tiên để phản ứng. Không được hỏi người chơi làm gì, không được mô tả chung chung.
4.  **Không Markdown**: Chỉ trả về nội dung truyện thuần túy.
5.  **Bối Cảnh Thời Đại**: Kỷ Nguyên Hậu Thiên Đế (5000 năm sau Diệp Phàm). Di sản Diệp Phàm là huyền thoại. Thiên Đình của Diệp Y Thủy cai quản vũ trụ, nhưng nhân vật ban đầu có thể không biết điều này.`;
  
  const prompt = `
Nhân vật chính:
- Tên: ${settings.name}
- Tuổi: ${settings.age}
- Vị trí khởi đầu: ${settings.initialLocation}
- Tính cách: ${settings.personality}
- Sở thích: ${settings.interests}
- Cảnh giới ban đầu: Phàm Nhân - Người Thường.

Yêu cầu:
Viết một đoạn văn ngắn (khoảng 150-250 chữ) mô tả khung cảnh tại ${settings.initialLocation} và một tình huống mở đầu liên quan trực tiếp đến ${settings.name}, có tính đến tuổi, tính cách và sở thích của họ.
Ví dụ: Nếu thích khám phá, họ có thể tình cờ thấy một hang động lạ. Nếu tính cách hiền lành, họ có thể đang giúp đỡ ai đó và gặp chuyện. Nếu ở một ngôi làng, có thể có một sự kiện đặc biệt của làng đang diễn ra.
**QUAN TRỌNG NHẤT**: Đoạn văn PHẢI kết thúc bằng một tình huống cụ thể, một chi tiết bất ngờ hoặc một sự việc đang diễn ra ngay trước mắt nhân vật, khiến người chơi bắt buộc phải suy nghĩ và nhập hành động đầu tiên để ứng phó. Không kết thúc bằng câu hỏi hay mô tả cảm xúc chung chung. 
Ví dụ kết thúc tốt: "...Một tiếng động lạ phát ra từ cái giếng cạn giữa làng, và một làn khói xanh mờ ảo bắt đầu bốc lên." HOẶC "...Khi ${settings.name} đang ${settings.interests}, một cuộn giấy da dê cũ kỹ rơi từ trên gác mái xuống ngay chân."
Chỉ viết nội dung truyện.
`;
  
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
    return stripMarkdown(rawText) || `Chào mừng ${settings.name} (${settings.age} tuổi) đến với thế giới Già Thiên - Kỷ Nguyên Hậu Thiên Đế! Bạn bắt đầu tại ${settings.initialLocation} với tính cách ${settings.personality} và sở thích ${settings.interests}. Một điều gì đó bất ngờ vừa xảy ra...`;
  } catch (error) {
     const defaultErrorStory = `Chào mừng ${settings.name} (${settings.age} tuổi) đến với thế giới Già Thiên - Kỷ Nguyên Hậu Thiên Đế! Bạn bắt đầu tại ${settings.initialLocation}. Một sự kiện bất ngờ đang chờ bạn...`;
     return `${defaultErrorStory} (Lỗi tạo truyện ban đầu: ${handleApiError(error)})`;
  }
};

export const generateChapterTitle = async (
  apiKey: string,
  chapterContent: string,
  character: Character, // Now includes age, personality, interests
  chapterNumber: number
): Promise<string> => {
  if (!apiKey) {
    return `Chương ${chapterNumber}`; 
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI biên tập viên, nhiệm vụ của bạn là đặt một cái tên thật hấp dẫn và súc tích cho một chương truyện tiên hiệp (bối cảnh Kỷ Nguyên Hậu Thiên Đế, 5000 năm sau Già Thiên gốc) dựa trên nội dung của nó. Tên chương phải bằng tiếng Việt. Không dùng markdown.`;
  const prompt = `
Dưới đây là toàn bộ nội dung của chương ${chapterNumber}. Nhân vật chính là ${character.name} (${character.age} tuổi), tính cách: ${character.personality}, sở thích: ${character.interests}. Họ đang ở cảnh giới ${character.realm} - ${character.stage}, thế lực ${character.faction}, tại ${character.location}. Câu chuyện diễn ra trong Kỷ Nguyên Hậu Thiên Đế.

--- NỘI DUNG CHƯƠNG ---
${chapterContent.substring(0, 8000)} 
--- KẾT THÚC NỘI DUNG CHƯƠNG ---

Yêu cầu:
Dựa vào nội dung trên, hãy đề xuất một tên chương (khoảng 3-10 từ) thật lôi cuốn, gợi mở và phù hợp.
Ví dụ: "Bí Mật Cổ Mộ", "Linh Khí Biến Động", "Gặp Gỡ Kỳ Duyên".
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
    let title = stripMarkdown(rawTitle).replace(/^Chương \d+[:\s]*/i, '').replace(/["']/g, '').trim();
    return title.substring(0, 100) || `Chương ${chapterNumber}: Diễn Biến Thời Đại Mới`; 
  } catch (error) {
    console.error("Gemini API error (generate chapter title):", error);
    return `Chương ${chapterNumber}: Hành Trình Tiếp Diễn`; 
  }
};