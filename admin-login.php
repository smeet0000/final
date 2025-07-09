<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database configuration
$host = 'localhost';
$dbname = 'final';
$username = 'root';
$password = 'smit0987';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get raw input and decode
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
        exit;
    }
    
    $username = isset($data['username']) ? trim($data['username']) : '';
    $password = isset($data['password']) ? trim($data['password']) : '';
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Username and password are required']);
        exit;
    }
    
    try {
        // Check if admin table exists, if not create it
        $checkTable = $pdo->query("SHOW TABLES LIKE 'admins'");
        if ($checkTable->rowCount() == 0) {
            // Create admin table if it doesn't exist
            $pdo->exec("
                CREATE TABLE admins (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            ");
            
            // Insert default admin
            $pdo->exec("
                INSERT INTO admins (name, email, username, password) VALUES
                ('Admin User', 'admin@example.com', 'admin', 'admin123'),
                ('Super Admin', 'superadmin@example.com', 'superadmin', 'super123')
            ");
        }
        
        // Check admin credentials
        $stmt = $pdo->prepare("SELECT id, name, email, username FROM admins WHERE username = ? AND password = ?");
        $stmt->execute([$username, $password]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($admin) {
            // Start session if not already started
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            
            echo json_encode([
                'success' => true, 
                'admin' => $admin,
                'message' => 'Login successful'
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
        }
    } catch(PDOException $e) {
        error_log("Admin login error: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Login failed. Please try again.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
