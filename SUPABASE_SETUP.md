# Thiết lập đồng bộ Supabase

Website yêu cầu đăng nhập. Tạo một tài khoản Supabase dùng chung cho hai người, hoặc tạo tài khoản riêng; mọi người dùng đã xác thực đều có thể xem, thêm, sửa và xóa nội dung chung.

## 1. Tạo và cấu hình Supabase

1. Tạo project Supabase.
2. Trong SQL Editor, chạy toàn bộ nội dung `supabase-setup.sql`.
3. Trong **Authentication → Providers → Email**, bật đăng nhập email/mật khẩu và tắt cho phép người ngoài tự đăng ký.
4. Trong **Authentication → Users**, tạo tài khoản và tự trao đổi thông tin đăng nhập với người yêu.
5. Lấy **Project URL** và **anon/public key** từ mục API.

## 2. Cấu hình website

Điền URL và anon/public key vào `config.js`:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://<project-id>.supabase.co",
  supabaseAnonKey: "<anon-public-key>",
};
```

Chỉ dùng anon/public key ở frontend; tuyệt đối không đặt `service_role` key hoặc mật khẩu trong website. Chính sách RLS và Storage chỉ cho phép người đã đăng nhập truy cập dữ liệu.

## 3. Đưa website lên mạng và dùng chung

Đưa các file website lên hosting tĩnh có HTTPS, ví dụ GitHub Pages, Netlify hoặc Vercel. Gửi link hosting để mở website từ máy tính hoặc điện thoại. Không mở `index.html` trực tiếp từ ổ đĩa khi dùng Supabase.

Hai người đăng nhập bằng tài khoản chung để cùng cập nhật. Nếu dùng một tài khoản, hãy chia sẻ thông tin đó riêng tư; không đưa thông tin đăng nhập vào repository hoặc chat.

## 4. Đồng bộ và giới hạn ảnh

- Dữ liệu ước mơ, checklist, địa điểm, điểm đánh giá và ảnh được chia sẻ qua Supabase.
- Ảnh tối đa **20 MB mỗi tệp**, lưu trong bucket riêng tư và dùng URL có thời hạn khi hiển thị.
- Dữ liệu trình duyệt cũ được đưa lên khi đăng nhập lần đầu; dữ liệu cloud hiện có được ưu tiên.
- Gói Supabase có hạn mức lưu trữ và băng thông.

## 5. Thông báo thay đổi

Chạy lại toàn bộ `supabase-setup.sql` trong SQL Editor để tạo `activity_events`, `activity_reads`, trigger ghi lịch sử và các hàm đếm/đánh dấu đã xem. Script có thể chạy lại trên dữ liệu hiện có. Sau đó tải lại trang trên cả hai thiết bị để sử dụng phiên bản mới.

- Nút chuông hiển thị số thay đổi chưa đọc; mở ra để xem thời gian, truy cập phần đã thay đổi và xem thêm lịch sử cũ.
- Lịch sử được ghi cùng giao dịch thay đổi dữ liệu dùng chung, bắt đầu từ khi cài trigger và sử dụng phiên bản web mới. Không tạo lại được lịch sử trước đó.
- Thông báo gồm thêm/sửa/xóa trải nghiệm, thay ảnh, thay đổi album và ước mơ. Bản nháp vòng quay và màu giao diện chỉ lưu trên trình duyệt nên không gửi thông báo.
- Hỗ trợ hai tài khoản riêng hoặc dùng chung tài khoản trên hai trình duyệt/thiết bị khác nhau. Mỗi trình duyệt giữ một mã thiết bị và trạng thái đã xem riêng trên Supabase. Nếu xóa dữ liệu trình duyệt, thiết bị sẽ được nhận diện là mới.
- Chọn “Đánh dấu tất cả đã xem” để lưu trạng thái; mở hộp thông báo chưa tự đánh dấu. Thông báo mới vẫn được giữ khi người kia chưa truy cập trang.
- Đây là thông báo trong trang, không yêu cầu quyền thông báo của trình duyệt.

Kiểm tra SQL tùy chọn: chạy `tests/notifications.sql` trong SQL Editor sau khi thiết lập. Bài kiểm tra tạo dữ liệu tạm trong một giao dịch và `rollback` khi hoàn tất.
