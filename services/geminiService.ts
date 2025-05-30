

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Character, KeyStoryEvent } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

export interface StoryContext {
  character: Character;
  previousStoryChunk: string;
  currentChapterNumber: number;
  charsInCurrentChapter: number;
  keyEventsSummary?: string; // Summary of recent key plot points
}

const stripMarkdown = (text: string): string => {
  if (!text) return "";
  // Remove general markdown code blocks
  text = text.replace(/```(\w*?\s*\n?)?(.*?)\n?\s*```/gs, '$2');
  // Remove character update and key event tags specifically
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

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác lấy bối cảnh 5000 NĂM SAU các sự kiện chính của truyện Già Thiên gốc. Người chơi là một tu sĩ mới trong kỷ nguyên này. Câu chuyện phải bằng tiếng Việt, văn phong lôi cuốn, và phù hợp với thể loại tiên hiệp.

Bối Cảnh Kỷ Nguyên Hậu Thiên Đế (5000 năm sau Diệp Phàm):
- Diệp Phàm đã thành Thiên Đế, mở ra Tiên Vực và thăng thiên. Thiên Đình do ông thành lập đã trở thành một trật tự vũ trụ rộng lớn.
- Diệp Y Thủy (con trai Diệp Phàm) là Thiên Đế đương nhiệm, duy trì sự ổn định và phát triển của Thiên Đình.
- Các Thánh Địa cổ xưa đã biến đổi; "Thiên Đế Thánh Địa" mới được thành lập tại nơi Diệp Phàm đột phá, trở thành trung tâm tu luyện hàng đầu.
- Thế hệ tu sĩ mới xuất hiện, nổi bật có Lâm Thiên Vũ với "Hỗn Nguyên Thánh Thể", một thiên tài trẻ tuổi.
- Cánh cửa Tiên Vực mở định kỳ 500 năm một lần, cho phép Hồng Trần Tiên thăng thiên.
- Mối đe dọa mới: "Hư Không Ma Tộc", những sinh vật từ khoảng không giữa các vũ trụ, bắt đầu xuất hiện. Diệp Y Thủy đã lập "Liên Minh Vũ Trụ" để đối phó.

Yêu cầu khi viết truyện:
1.  **Nhất Quán Bối Cảnh**: Luôn nhớ rằng câu chuyện diễn ra 5000 năm sau Diệp Phàm. Các nhân vật và sự kiện từ truyện gốc là huyền thoại hoặc lịch sử. Nhân vật của người chơi là người của thời đại mới này.
2.  **Kết Thúc Gợi Mở**: Luôn kết thúc đoạn truyện bằng một tình huống, một mô tả, hoặc một diễn biến mới mà tự nhiên gợi mở và đòi hỏi người chơi phải nhập hành động tiếp theo. Không được tự đặt câu hỏi trực tiếp cho người chơi hoặc gợi ý hành động.
3.  **Cập Nhật Nhân Vật (Nếu Có)**: Nếu hành động của người chơi hoặc diễn biến truyện một cách tự nhiên dẫn đến thay đổi về cảnh giới, tiểu cảnh, thế lực gia nhập (ví dụ: gia nhập Thiên Đình, một Thánh Địa, hoặc Liên Minh Vũ Trụ), hoặc vị trí hiện tại của nhân vật, hãy lồng ghép mô tả sự thay đổi đó vào trong truyện. Đồng thời, hãy thêm một thẻ đặc biệt vào cuối đoạn text: \`[CHARACTER_UPDATE: key="value"]\`. Ví dụ: \`[CHARACTER_UPDATE: realm="Luân Hải Bí Cảnh", faction="Thiên Đình"]\`.
4.  **Ghi Nhận Sự Kiện Trọng Yếu (Nếu Có)**: Nếu có sự kiện CỰC KỲ quan trọng (thay đổi cục diện, mục tiêu dài hạn, gặp nhân vật truyền kỳ, khám phá bí mật lớn liên quan đến di sản Diệp Phàm hoặc mối đe dọa mới), hãy thêm thẻ VÀO CUỐI CÙNG: \`[KEY_EVENT: Mô tả ngắn gọn sự kiện đó bằng tiếng Việt, dưới 25 từ]\`.
5.  **Không Markdown Rác**: Chỉ trả về nội dung truyện thuần túy.

Hãy viết tiếp câu chuyện một cách tự nhiên, tạo ra một cái kết mở để người chơi phản ứng. Lồng ghép các yếu tố của Kỷ Nguyên Hậu Thiên Đế một cách hợp lý khi có cơ hội.`;
  
  const prompt = `
Thông tin nhân vật hiện tại (Tu sĩ của Kỷ Nguyên Hậu Thiên Đế):
- Tên: ${character.name}
- Cảnh giới: ${character.realm} - ${character.stage}
- Thế lực: ${character.faction}
- Vị trí: ${character.location}

${keyEventsSummary ? `Những sự kiện trọng yếu đã xảy ra trong quá khứ (cần ghi nhớ để đảm bảo tính nhất quán trong Kỷ Nguyên Hậu Thiên Đế):\n${keyEventsSummary}\n` : ""}
Bối cảnh chương ${currentChapterNumber} (đã có ${charsInCurrentChapter} chữ):
${previousStoryChunk ? `Diễn biến gần nhất (khoảng 1000 chữ cuối của đoạn trước): "${previousStoryChunk}"` : "Đây là khởi đầu của một tình tiết mới trong chương."}

Hành động gần nhất của người chơi:
"${playerAction}"

Yêu cầu:
Viết tiếp câu chuyện một cách chi tiết và hấp dẫn (khoảng 200-500 chữ) trong bối cảnh Kỷ Nguyên Hậu Thiên Đế, 5000 năm sau Diệp Phàm. Mô tả môi trường, các nhân vật khác (nếu có), và các sự kiện diễn ra.
- Câu chuyện nên logic với thế giới Già Thiên mở rộng này (ví dụ: có thể nghe tin về Diệp Y Thủy, Lâm Thiên Vũ, Thiên Đế Thánh Địa, hoặc những dấu hiệu của Hư Không Ma Tộc).
- Đảm bảo đoạn truyện kết thúc một cách gợi mở, tạo ra một tình huống mà người chơi cần phải đưa ra quyết định và hành động tiếp theo.
- Nếu có sự thay đổi về cảnh giới, vị trí, hoặc thế lực của nhân vật một cách tự nhiên, hãy mô tả nó trong truyện và thêm thẻ \`[CHARACTER_UPDATE: ...]\` vào cuối phản hồi.
- Nếu có sự kiện trọng yếu (theo định nghĩa ở system instruction), hãy thêm thẻ \`[KEY_EVENT: ...]\` vào cuối phản hồi.
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
    
    const rawTextWithTags = response.text; 
    return rawTextWithTags; 
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateInitialStory = async (apiKey: string, characterName: string, initialLocation: string): Promise<string> => {
   if (!apiKey) {
    return `Chào mừng ${characterName} đến với thế giới Già Thiên - Kỷ Nguyên Hậu Thiên Đế! Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Lỗi: API Key chưa được cung cấp. Vui lòng vào cài đặt để nhập API Key trước khi bắt đầu.`;
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là một AI kể chuyện chuyên nghiệp, tạo ra một tiểu thuyết tiên hiệp tương tác. Bối cảnh là 5000 NĂM SAU các sự kiện chính của truyện Già Thiên gốc. Thiên Đế Diệp Phàm đã trở thành huyền thoại. Con trai ông, Diệp Y Thủy, là Thiên Đế đương nhiệm. Người chơi là một nhân vật mới trong thời đại này. Hãy viết đoạn mở đầu cho câu chuyện, tập trung vào mô tả và không khí, không đặt câu hỏi. Đoạn mở đầu này cũng cần kết thúc bằng một tình huống gợi mở để người chơi có thể nhập hành động đầu tiên. Không dùng markdown.`;
  
  const prompt = `Nhân vật chính tên là ${characterName}. Họ vừa mới xuất hiện tại ${initialLocation} trong Kỷ Nguyên Hậu Thiên Đế (5000 năm sau Diệp Phàm). Di sản của Thiên Đế Diệp Phàm vẫn còn đó, và Thiên Đình dưới sự cai quản của Thiên Đế Diệp Y Thủy duy trì trật tự vũ trụ. 
Cảnh giới ban đầu của ${characterName} là Phàm Nhân - Người Thường.
Hãy viết một đoạn văn ngắn (khoảng 100-200 chữ) mô tả khung cảnh tại ${initialLocation} và cảm xúc ban đầu của nhân vật. Có thể nơi đây là một vùng đất yên bình dưới sự bảo hộ của Thiên Đình, hoặc một nơi hẻo lánh đang bắt đầu cảm nhận những biến động mới của thời đại (ví dụ: nghe đồn về những thiên tài mới nổi như Lâm Thiên Vũ, hoặc những tin tức xa xôi về các mối đe dọa tiềm ẩn như Hư Không Ma Tộc).
Quan trọng: Hãy kết thúc đoạn văn này bằng một tình huống hoặc mô tả mà tự nhiên khiến người chơi muốn nhập vào hành động đầu tiên của họ. Không hỏi người chơi phải làm gì.`;
  
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
    return stripMarkdown(rawText) || `Chào mừng ${characterName} đến với thế giới Già Thiên - Kỷ Nguyên Hậu Thiên Đế! 5000 năm đã trôi qua kể từ thời Diệp Phàm. Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Một luồng linh khí mới mẻ của thời đại đang chờ bạn khám phá. Bạn cảm thấy có điều gì đó đang chờ đợi phía trước.`;
  } catch (error) {
     const defaultErrorStory = `Chào mừng ${characterName} đến với thế giới Già Thiên - Kỷ Nguyên Hậu Thiên Đế! 5000 năm đã trôi qua kể từ thời Diệp Phàm. Bạn bắt đầu cuộc hành trình tại ${initialLocation} với thân phận Phàm Nhân. Một luồng linh khí mới mẻ của thời đại đang chờ bạn khám phá. Bạn cảm thấy có điều gì đó đang chờ đợi phía trước.`;
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

  const systemInstruction = `Bạn là một AI biên tập viên, nhiệm vụ của bạn là đặt một cái tên thật hấp dẫn và súc tích cho một chương truyện tiên hiệp (bối cảnh Kỷ Nguyên Hậu Thiên Đế, 5000 năm sau Già Thiên gốc) dựa trên nội dung của nó. Tên chương phải bằng tiếng Việt. Không dùng markdown.`;
  const prompt = `
Dưới đây là toàn bộ nội dung của chương ${chapterNumber} trong một cuốn tiểu thuyết tiên hiệp về nhân vật ${character.name} (cảnh giới ${character.realm} - ${character.stage}, thế lực ${character.faction}, đang ở ${character.location}). Câu chuyện diễn ra trong Kỷ Nguyên Hậu Thiên Đế, 5000 năm sau Diệp Phàm.

--- NỘI DUNG CHƯƠNG ---
${chapterContent.substring(0, 8000)} 
--- KẾT THÚC NỘI DUNG CHƯƠNG ---
(Lưu ý: Nội dung có thể rất dài, chỉ cần tập trung vào các sự kiện chính và không khí chung của chương trong bối cảnh mới này.)

Yêu cầu:
Dựa vào nội dung trên, hãy đề xuất một tên chương (khoảng 3-10 từ) thật lôi cuốn, gợi mở và phù hợp với thể loại tiên hiệp và bối cảnh Kỷ Nguyên Hậu Thiên Đế. 
Ví dụ: "Di Sản Thiên Đế Thức Tỉnh", "Bóng Ma Hư Không Tộc", "Lâm Thiên Vũ Xuất Hiện", "Kỳ Ngộ Tại Thiên Đế Thánh Địa".
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
    return title.substring(0, 100) || `Chương ${chapterNumber}: Diễn Biến Thời Đại Mới`; // Fallback if AI returns empty
  } catch (error) {
    console.error("Gemini API error (generate chapter title):", error);
    return `Chương ${chapterNumber}: Hành Trình Tiếp Diễn Trong Kỷ Nguyên Mới`; // Fallback title on error
  }
};
