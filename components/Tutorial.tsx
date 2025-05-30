
import React, { useState } from 'react';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    title: "Chào Mừng Đạo Hữu!",
    content: (
      <>
        <p>Chào mừng đến với <strong>Già Thiên Kỳ Truyện - Phiên Bản Tương Tác</strong>!</p>
        <p className="mt-2">Bạn sắp bắt đầu một cuộc hành trình độc nhất vô nhị, nơi bạn là nhân vật chính và AI sẽ là người đồng hành, viết nên câu chuyện dựa trên mỗi hành động của bạn.</p>
        <p className="mt-2">Hãy cùng lướt qua một vài hướng dẫn cơ bản để trải nghiệm tốt nhất nhé.</p>
      </>
    ),
  },
  {
    title: "Bảng Thông Tin Nhân Vật",
    content: (
      <>
        <p>Ở phía bên trái (hoặc phía trên trên điện thoại), bạn sẽ thấy <strong>Bảng Thông Tin Nhân Vật</strong>.</p>
        <p className="mt-2">Nó hiển thị tên, cảnh giới, tiểu cảnh, thế lực và vị trí hiện tại của bạn. Những thông tin này sẽ tự động cập nhật khi câu chuyện tiến triển và bạn đạt được những đột phá mới hoặc di chuyển đến các địa điểm khác.</p>
        
         <p className="text-xs italic mt-1 text-slate-400 text-center">Ảnh minh họa vị trí bảng nhân vật.</p>
      </>
    ),
  },
  {
    title: "Khung Hiển Thị Truyện",
    content: (
      <>
        <p>Đây là nơi câu chuyện của bạn được AI viết ra. Mỗi khi bạn thực hiện một hành động, AI sẽ viết tiếp diễn biến.</p>
        <p className="mt-2">Các chương đã hoàn thành sẽ được hiển thị rõ ràng. Bạn có thể cuộn lên để đọc lại những diễn biến cũ.</p>
        
        <p className="text-xs italic mt-1 text-slate-400 text-center">Ảnh minh họa khung hiển thị truyện.</p>
      </>
    ),
  },
  {
    title: "Nhập Hành Động Của Bạn",
    content: (
      <>
        <p>Bên dưới khung truyện là ô để bạn <strong>Nhập Hành Động</strong>. Đây là cách bạn tương tác với thế giới.</p>
        <p className="mt-2">Hãy mô tả hành động bạn muốn nhân vật thực hiện. Ví dụ: "Quan sát xung quanh", "Tiến vào sơn động", "Hỏi chuyện lão nhân", "Bắt đầu tu luyện tâm pháp vừa nhặt được".</p>
        <p className="mt-2">AI sẽ dựa vào đó để viết tiếp. Hãy cố gắng viết rõ ràng và chi tiết để AI hiểu ý bạn nhất.</p>
        <p className="mt-2"><strong>Quan trọng:</strong> Mỗi đoạn truyện AI viết sẽ kết thúc bằng một tình huống gợi mở, bạn cần dựa vào đó để quyết định hành động tiếp theo.</p>
      </>
    ),
  },
  {
    title: "Thanh Tiến Trình",
    content: (
      <>
        <p>Phía dưới Bảng Nhân Vật là <strong>Thanh Tiến Trình</strong>.</p>
        <p className="mt-2">Nó cho bạn biết bạn đã viết được bao nhiêu chữ trong chương hiện tại (mục tiêu là {Number(10000).toLocaleString()} chữ/chương) và tiến độ hoàn thành tổng số chương bạn đã chọn.</p>
      </>
    ),
  },
  {
    title: "Tải Truyện & Cảnh Báo Quan Trọng",
    content: (
      <>
        <p>Khi một chương hoàn thành (đạt đủ số chữ), nó sẽ <strong>tự động được tải xuống</strong> máy của bạn dưới dạng file .txt.</p>
        <p className="mt-2">Bạn cũng có thể <strong>tải toàn bộ truyện bất cứ lúc nào</strong> bằng nút bấm bên dưới Thanh Tiến Trình.</p>
        <p className="mt-4 text-red-400 font-semibold">CẢNH BÁO QUAN TRỌNG:</p>
        <p className="text-red-300">Trò chơi này có cơ chế "một mạng". Nếu bạn đóng trình duyệt, tải lại trang, hoặc mất kết nối internet đột ngột, toàn bộ tiến trình chưa được lưu (tức là phần truyện AI đang viết hoặc chương chưa hoàn thành) có thể bị mất. Hãy tải truyện thường xuyên!</p>
      </>
    ),
  },
  {
    title: "Mục Tiêu & Kết Thúc",
    content: (
      <>
        <p>Mục tiêu của bạn là hoàn thành số chương đã chọn trong phần cài đặt ban đầu.</p>
        <p className="mt-2">Khi đạt đủ số chương, trò chơi sẽ kết thúc và bạn có thể tải xuống toàn bộ tác phẩm tiểu thuyết do chính bạn và AI đồng sáng tạo.</p>
        <p className="mt-4">Chúc bạn có những giây phút tu tiên đầy kỳ thú và sáng tạo!</p>
      </>
    ),
  },
];

const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose(); // Close on last step
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <h2 id="tutorial-title" className="text-2xl sm:text-3xl font-bold text-sky-400 mb-4 sm:mb-6 text-center">{step.title}</h2>
        <div className="text-slate-300 space-y-3 overflow-y-auto custom-scrollbar pr-2 text-sm sm:text-base mb-6 flex-grow">
          {step.content}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mt-auto pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 mb-2 sm:mb-0">
            Bước {currentStep + 1}/{tutorialSteps.length}
          </div>
          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Trước Đó
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Hoàn Tất & Bắt Đầu' : 'Tiếp Theo'}
            </button>
          </div>
        </div>
         <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-2xl font-bold"
            aria-label="Đóng hướng dẫn"
        >
            &times;
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
