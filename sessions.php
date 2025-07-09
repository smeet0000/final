<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS');
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

// GET - Fetch sessions for a trainer
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $trainer_id = isset($_GET['trainer_id']) ? trim($_GET['trainer_id']) : '';
    
    if (empty($trainer_id)) {
        echo json_encode(['success' => false, 'error' => 'Trainer ID is required']);
        exit;
    }
    
    try {
        // Check if sessions table exists
        $checkTable = $pdo->query("SHOW TABLES LIKE 'sessions'");
        if ($checkTable->rowCount() == 0) {
            echo json_encode(['success' => false, 'error' => 'Sessions table not found']);
            exit;
        }
        
        // First, auto-remove completed sessions (optional - can be disabled for admin view)
        // Commenting out auto-removal for admin dashboard to show all sessions
        /*
        $current_datetime = date('Y-m-d H:i:s');
        $cleanup_stmt = $pdo->prepare("
            DELETE FROM sessions 
            WHERE trainer_id = ? 
            AND CONCAT(session_date, ' ', session_time) + INTERVAL duration MINUTE < ?
        ");
        $cleanup_stmt->execute([$trainer_id, $current_datetime]);
        
        if ($cleanup_stmt->rowCount() > 0) {
            error_log("Auto-removed " . $cleanup_stmt->rowCount() . " completed sessions for trainer " . $trainer_id);
        }
        */
        
        // Fetch all sessions for the trainer
        $stmt = $pdo->prepare("
            SELECT 
                id,
                trainer_id,
                title,
                client_name,
                session_date,
                session_time,
                duration,
                session_type,
                description,
                status,
                created_at,
                updated_at
            FROM sessions 
            WHERE trainer_id = ? 
            ORDER BY session_date DESC, session_time ASC
        ");
        $stmt->execute([$trainer_id]);
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Log the query for debugging
        error_log("Fetching sessions for trainer_id: " . $trainer_id);
        error_log("Found " . count($sessions) . " sessions");
        
        // Format dates consistently
        foreach ($sessions as &$session) {
            // Ensure date format is YYYY-MM-DD
            if (isset($session['session_date'])) {
                $date = new DateTime($session['session_date']);
                $session['session_date'] = $date->format('Y-m-d');
            }
            
            // Ensure time format is HH:MM:SS or HH:MM
            if (isset($session['session_time'])) {
                $time = $session['session_time'];
                // If time doesn't have seconds, add them
                if (strlen($time) === 5) {
                    $session['session_time'] = $time . ':00';
                }
            }
        }
        
        echo json_encode([
            'success' => true, 
            'sessions' => $sessions,
            'count' => count($sessions),
            'trainer_id' => $trainer_id
        ]);
        
    } catch(PDOException $e) {
        error_log("Error fetching sessions: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Failed to fetch sessions: ' . $e->getMessage()]);
    }
}

// POST - Create new sessions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $trainer_id = $input['trainer_id'] ?? '';
    $sessions = $input['sessions'] ?? [];
    
    if (empty($trainer_id) || empty($sessions)) {
        echo json_encode(['success' => false, 'error' => 'Trainer ID and sessions are required']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("INSERT INTO sessions (trainer_id, title, client_name, session_date, session_time, duration, session_type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        $created_sessions = [];
        foreach ($sessions as $session) {
            $stmt->execute([
                $trainer_id,
                $session['title'],
                $session['client'],
                $session['date'],
                $session['time'],
                $session['duration'],
                $session['type'],
                $session['description']
            ]);
            
            $created_sessions[] = [
                'id' => $pdo->lastInsertId(),
                'trainer_id' => $trainer_id,
                'title' => $session['title'],
                'client_name' => $session['client'],
                'session_date' => $session['date'],
                'session_time' => $session['time'],
                'duration' => $session['duration'],
                'session_type' => $session['type'],
                'description' => $session['description']
            ];
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'sessions' => $created_sessions]);
    } catch(PDOException $e) {
        $pdo->rollback();
        error_log("Error creating sessions: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Failed to create sessions']);
    }
}

// DELETE - Delete a session
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $session_id = $input['id'] ?? '';
    $auto_remove = $input['auto_remove'] ?? false;
    
    if (empty($session_id)) {
        echo json_encode(['success' => false, 'error' => 'Session ID is required']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE id = ?");
        $stmt->execute([$session_id]);
        
        if ($stmt->rowCount() > 0) {
            $message = $auto_remove ? 'Session auto-removed after completion' : 'Session deleted successfully';
            echo json_encode(['success' => true, 'message' => $message]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Session not found']);
        }
    } catch(PDOException $e) {
        error_log("Error deleting session: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Failed to delete session']);
    }
}

// PUT - Update session status
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $session_id = $input['id'] ?? '';
    $status = $input['status'] ?? '';
    
    if (empty($session_id) || empty($status)) {
        echo json_encode(['success' => false, 'error' => 'Session ID and status are required']);
        exit;
    }
    
    // Validate status
    $valid_statuses = ['scheduled', 'started', 'completed'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['success' => false, 'error' => 'Invalid status']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE sessions SET status = ? WHERE id = ?");
        $stmt->execute([$status, $session_id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Session status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Session not found']);
        }
    } catch(PDOException $e) {
        error_log("Error updating session status: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Failed to update session status']);
    }
}
?>
