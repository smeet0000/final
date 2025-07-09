<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$host = 'localhost';
$dbname = 'final';
$username = 'root';
$password = 'smit0987';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
        exit;
    }
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Username and password are required']);
        exit;
    }
    
    try {
        // For demo purposes, we'll use plain text password comparison
        // In production, use password_hash() and password_verify()
        $stmt = $pdo->prepare("SELECT id, name, email, username FROM trainers WHERE username = ? AND password = ?");
        $stmt->execute([$username, $password]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($trainer) {
            session_start();
            $_SESSION['trainer_id'] = $trainer['id'];
            echo json_encode(['success' => true, 'trainer' => $trainer]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
        }
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Login failed: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
