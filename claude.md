# CLAUDE.md

Hướng dẫn hành vi để giảm thiểu các lỗi lập trình phổ biến của mô hình ngôn ngữ lớn (LLM). Kết hợp với các hướng dẫn cụ thể của dự án khi cần thiết.

**Cân nhắc:** Những nguyên tắc này thiên về thận trọng hơn là tốc độ. Đối với các nhiệm vụ đơn giản, hãy sử dụng phán đoán của bạn.

## 1. Suy nghĩ trước khi viết code

**Đừng giả định. Đừng che giấu sự bối rối. Nêu rõ các tradeoff.**

Trước khi triển khai:
- Nêu rõ các giả định của bạn một cách rõ ràng. Nếu không chắc chắn, hãy hỏi.
- Nếu có nhiều cách diễn giải khác nhau, hãy trình bày chúng - đừng chọn một cách mà không nói rõ.
- Nếu có cách tiếp cận đơn giản hơn, hãy nói ra. Hãy phản đối khi cần thiết.
- Nếu có điều gì chưa rõ, hãy dừng lại. Nêu rõ điểm gây bối rối. Hỏi.

## 2. Đơn giản trước tiên

**Mã tối thiểu để giải quyết vấn đề. Không suy đoán.**

- Không thêm tính năng ngoài những gì đã được yêu cầu.
- Không tạo abstraction cho code chỉ dùng một lần.
- Không thêm "sự linh hoạt" hoặc "cấu hình" mà không được yêu cầu.
- Không xử lý lỗi cho các tình huống không thể xảy ra.
- Nếu bạn viết 200 dòng mà có thể viết thành 50 dòng, hãy viết lại cho ngắn gọn hơn.

Hãy tự hỏi: "Một kỹ sư cấp cao có cho rằng đây quá phức tạp không?" Nếu có, hãy đơn giản hóa.

## 3. Thay đổi có mục tiêu

**Chỉ chạm vào những gì bạn thật sự cần. Chỉ dọn dẹp những mớ hỗn độn do chính bạn gây ra.**

Khi chỉnh sửa mã hiện có:
- Đừng "cải thiện" các đoạn code lân cận, bình luận hoặc định dạng không liên quan.
- Đừng refactor những thứ chưa bị hỏng.
- Phù hợp với phong cách hiện có, dù bạn có muốn làm khác đi.
- Nếu phát hiện code chết không liên quan, hãy ghi chú - đừng xóa nó.

Khi thay đổi của bạn tạo ra code treo (orphans):
- Xóa các import/biến/hàm mà thay đổi của bạn làm cho chúng trở nên không sử dụng.
- Đừng xóa code chết đã có sẵn trừ khi được yêu cầu.

Tiêu chí kiểm tra: Mỗi dòng thay đổi phải trực tiếp liên quan đến yêu cầu của người dùng.

## 4. Thực hiện theo mục tiêu

**Xác định tiêu chí thành công. Lặp lại cho đến khi xác minh.**

Biến nhiệm vụ thành các mục tiêu có thể kiểm chứng:
- "Thêm xác thực" → "Viết test cho các đầu vào không hợp lệ, sau đó làm cho chúng pass"
- "Sửa lỗi" → "Viết một test mô phỏng lại lỗi, sau đó làm cho nó pass"
- "Refactor X" → "Đảm bảo test pass trước và sau khi refactor"

Đối với các nhiệm vụ nhiều bước, hãy nêu một kế hoạch ngắn gọn:
```
1. [Bước] → xác minh: [kiểm tra]
2. [Bước] → xác minh: [kiểm tra]
3. [Bước] → xác minh: [kiểm tra]
```

Tiêu chí thành công mạnh mẽ cho phép bạn lặp lại độc lập. Tiêu chí yếu ("làm cho nó chạy") đòi hỏi phải hỏi clarifying liên tục.

---

**Những nguyên tắc này hiệu quả khi:** ít thay đổi không cần thiết hơn trong diff, ít viết lại hơn do quá phức tạp, và các câu hỏi làm rõ xuất hiện trước khi triển khai thay vì sau khi mắc lỗi.