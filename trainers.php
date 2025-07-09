<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// GET - Fetch all trainers or search trainers
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    try {
        // Check if trainers table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'trainers'");
        if ($checkTable->rowCount() == 0) {
            echo json_encode(['success' => false, 'error' => 'Trainers table not found']);
            exit;
        }
        
        if (!empty($search)) {
            // Search trainers by name or username
            $stmt = $pdo->prepare("
                SELECT id, name, email, username, created_at 
                FROM trainers 
                WHERE name LIKE ? OR username LIKE ? OR email LIKE ?
                ORDER BY name
            ");
            $searchTerm = "%{$search}%";
            $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
        } else {
            // Get all trainers
            $stmt = $pdo->prepare("
                SELECT id, name, email, username, created_at 
                FROM trainers 
                ORDER BY name
            ");
            $stmt->execute();
        }
        
        $trainers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add session count for each trainer
        foreach ($trainers as &$trainer) {
            try {
                $sessionStmt = $pdo->prepare("
                    SELECT COUNT(*) as session_count 
                    FROM sessions 
                    WHERE trainer_id = ?
                ");
                $sessionStmt->execute([$trainer['id']]);
                $sessionCount = $sessionStmt->fetch(PDO::FETCH_ASSOC);
                $trainer['session_count'] = $sessionCount['session_count'] ?? 0;
            } catch (Exception $e) {
                $trainer['session_count'] = 0;
            }
        }
        
        echo json_encode(['success' => true, 'trainers' => $trainers]);
    } catch(PDOException $e) {
        error_log("Error fetching trainers: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Failed to fetch trainers']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
