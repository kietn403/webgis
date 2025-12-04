<?php
// Thêm phần kiểm tra xem có phải là POST request không
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    die("Phương thức không hợp lệ!");
}

// Hiển thị lỗi để debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Kết nối database - SỬA THÔNG TIN NÀY THÀNH CỦA XAMPP
$servername = "localhost";
$username = "root";    // XAMPP mặc định là 'root'
$password = "";        // XAMPP mặc định để trống (không có password)
$dbname = "webs";

// Tạo kết nối
$conn = new mysqli($servername, $username, $password, $dbname);

// Kiểm tra kết nối
if ($conn->connect_error) {
    die("Kết nối database thất bại: " . $conn->connect_error);
}

// Thiết lập charset tiếng Việt
$conn->set_charset("utf8mb4");

// Kiểm tra và lấy dữ liệu từ form
if(isset($_POST['name']) && isset($_POST['email']) && isset($_POST['message'])) {
    $name = $conn->real_escape_string(trim($_POST['name']));
    $email = $conn->real_escape_string(trim($_POST['email']));
    $phone = $conn->real_escape_string(trim($_POST['phone'] ?? ''));
    $message = $conn->real_escape_string(trim($_POST['message']));
    
    // Validate dữ liệu cơ bản
    if(empty($name) || empty($email) || empty($message)) {
        die("Vui lòng điền đầy đủ thông tin bắt buộc!");
    }
    
    // Câu lệnh SQL sử dụng prepared statement
    $sql = "INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $name, $email, $phone, $message);
    
    if ($stmt->execute()) {
        echo "<div class='success'>Cảm ơn bạn! Thông tin đã được gửi thành công.</div>";
        // Hiển thị thông tin đã gửi (tùy chọn)
        echo "<div style='margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;'>";
        echo "<h3>Thông tin đã gửi:</h3>";
        echo "<p><strong>Họ tên:</strong> $name</p>";
        echo "<p><strong>Email:</strong> $email</p>";
        echo "<p><strong>Điện thoại:</strong> " . ($phone ? $phone : 'Không có') . "</p>";
        echo "<p><strong>Nội dung:</strong> $message</p>";
        echo "</div>";
    } else {
        echo "<div class='error'>Lỗi: " . $stmt->error . "</div>";
    }
    
    $stmt->close();
} else {
    echo "<div class='error'>Vui lòng điền đầy đủ thông tin!</div>";
}

$conn->close();

// Thêm nút quay lại bằng button
echo '<div style="text-align: center; margin-top: 20px;">';
echo '<button onclick="window.location.href=\'http://localhost:3000/index.html\'" 
        style="padding: 10px 20px; background: #4CAF50; color: white; 
               border: none; border-radius: 5px; cursor: pointer;">
        ← Quay lại trang chủ
      </button>';
echo '</div>';
?>