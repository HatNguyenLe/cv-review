# TalentLens — CV Review

Ứng dụng React + TypeScript / Python FastAPI hỗ trợ nhà tuyển dụng đối chiếu CV với JD, chạy trên máy nội bộ, không gọi API AI.

## Chạy ứng dụng

Yêu cầu: Node.js 20.19+ hoặc 22.12+, Python 3.11+.

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Mở terminal thứ hai:

```powershell
npm run dev
```

Truy cập http://127.0.0.1:5173. Vite chuyển `/api` đến backend trên cổng 8000. Tài liệu API: http://127.0.0.1:8000/docs.

Trong VS Code cũng có thể chạy hai task `TalentLens: Backend` và `TalentLens: Frontend` bằng **Terminal → Run Task**. Task backend tự tải lại khi mã nguồn thay đổi.

## Luồng sử dụng

1. Tạo JD với tên vị trí, phòng ban, mô tả, danh sách kỹ năng, số năm kinh nghiệm và trọng số.
2. Chọn JD rồi tải một hoặc nhiều CV PDF, DOCX, TXT UTF-8 (tối đa 10 MB/tệp). Có một JD mẫu để bắt đầu; không có hồ sơ ứng viên giả.
3. Xem điểm, bằng chứng kỹ năng và kinh nghiệm, văn bản trích xuất; ghi chú và cập nhật trạng thái thủ công.
4. Tìm kiếm, lọc trạng thái, sắp xếp và xuất danh sách đang lọc sang CSV.
5. Xóa CV trong màn hình chi tiết để xóa văn bản, email và kết quả khỏi SQLite.

Tên hiển thị lấy từ tên tệp; email trích xuất từ nội dung. Đổi tên tệp trước khi tải nếu cần tên hiển thị chính xác. Các tệp được xử lý riêng: lỗi một tệp không làm mất kết quả thành công của tệp khác.

## Chấm điểm minh bạch

- Kỹ năng: số kỹ năng có đề cập / tổng kỹ năng × 100. Các kỹ năng có trọng số bằng nhau. Đối sánh từ khóa không phân biệt dấu/chữ hoa, có ranh giới từ và một số bí danh.
- Kinh nghiệm: số năm khai báo / số năm yêu cầu × 100, tối đa 100. Chỉ nhận các câu khai báo rõ như `3 năm kinh nghiệm` hoặc `3 years of experience`; không tự cộng thời gian giữa các mốc lịch sử công việc. Nếu không yêu cầu kinh nghiệm, điểm thành phần là 100.
- Tổng: điểm kỹ năng × trọng số kỹ năng + điểm kinh nghiệm × trọng số kinh nghiệm, làm tròn đến số nguyên.
- Không tìm thấy khai báo kinh nghiệm: thành phần bằng 0 kèm cảnh báo cần xác minh, không kết luận ứng viên không có kinh nghiệm.
- Nếu có nhiều khai báo, lấy số năm lớn nhất, không cộng chúng; chưa xác định kinh nghiệm đó thuộc kỹ năng/vai trò nào, nên phải kiểm tra câu bằng chứng.
- Ngưỡng 80/50 chỉ dùng để nhóm điểm trên dashboard, không tự cập nhật trạng thái tuyển dụng.
- Mô tả JD dùng làm ngữ cảnh; không phân tích ngữ nghĩa tự động. Từ khóa có đề cập không chứng minh năng lực, và có thể xuất hiện trong câu phủ định. Luôn kiểm tra bằng chứng.
- Không chấm theo tuổi, giới tính, ảnh hoặc thuộc tính nhạy cảm. Điểm không phải dự đoán hiệu suất, không thay thế đánh giá và quyết định của con người.

## Dữ liệu & giới hạn triển khai

SQLite được tạo tại `backend\data\reviews.db`; có thể đổi bằng biến môi trường `CV_REVIEW_DB`. Backend lưu văn bản trích xuất, không lưu tệp gốc. PDF có mật khẩu, PDF scan không có lớp văn bản, tệp hỏng hoặc nội dung quá dài sẽ báo lỗi; chưa có OCR.

Đây là **MVP nội bộ một người dùng**, chưa phải dịch vụ production. Chỉ bind localhost. Trước khi triển khai mạng hoặc dùng dữ liệu nhạy cảm cần bổ sung đăng nhập/SSO, phân quyền, HTTPS, mã hóa, chính sách lưu giữ, nhật ký kiểm toán, hạn mức và cách ly xử lý tài liệu, quét mã độc, sao lưu và quy trình bảo vệ dữ liệu cá nhân. Xóa trong ứng dụng không xóa các bản sao lưu bên ngoài.

Font giao diện tải từ Google Fonts; nếu offline sẽ dùng font hệ thống. Nội dung CV không gửi đến Google Fonts hay dịch vụ AI.

## Kiểm tra

```powershell
npm run build
.\.venv\Scripts\python.exe -m unittest backend.test_main -v
```

Kiểm thử backend sử dụng SQLite tạm: điểm và bằng chứng, không khớp chuỗi con, kinh nghiệm thiếu/một phần, tạo JD, tải CV, lưu trạng thái/ghi chú, đọc lại, xóa, định dạng lỗi, giới hạn dung lượng và DOCX/PDF scan.