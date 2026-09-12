<?php
/**
 * One-off diagnostic: dump Events Booking config key names DIRECTLY FROM THE DB.
 * No Joomla boot needed (plain mysqli), so it cannot hit application errors.
 *
 * Usage (XAMPP test system with com_eventbooking installed):
 *   1. Copy this file to the Joomla site root as dump_eb_config_db.php
 *   2. Open http://localhost/BA/dump_eb_config_db.php (adjust path to your site)
 *      - PHP with mysqli is required (XAMPP has it by default)
 *   3. Copy the output back (key names only matter) and DELETE the file
 *
 * Do NOT deploy this file anywhere public. Values that look like secrets
 * are masked (length shown so presence can still be confirmed).
 */
header('Content-Type: text/plain; charset=utf-8');

$joomlaRoot = __DIR__;
$configurationPhp = $joomlaRoot . '/configuration.php';
if (!is_file($configurationPhp)) {
    echo "configuration.php NOT FOUND in $joomlaRoot\n";
    exit;
}
$src = file_get_contents($configurationPhp);
$get = function ($name) use ($src) {
    if (preg_match('/\$' . $name . '\s*=\s*\'((?:[^\'\\\\]|\\\\.)*)\'/', $src, $m)) {
        return stripcslashes($m[1]);
    }
    return null;
};
$host = $get('host') ?: 'localhost';
$user = $get('user') ?: 'root';
$pass = $get('password') ?: '';
$db   = $get('db');
$prefix = $get('dbprefix') ?: 'jos_';
if (!$db) {
    echo "Could not parse \$db from configuration.php\n";
    exit;
}

$mysqli = @new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    echo 'DB CONNECT FAILED: ' . $mysqli->connect_error . "\n";
    exit;
}
$mysqli->set_charset('utf8mb4');

// Find EB config tables (RAD framework typically uses #__eb_configs).
$found = [];
$res = $mysqli->query("SHOW TABLES LIKE '" . $mysqli->real_escape_string($prefix) . "eb_config%'");
while ($res && ($row = $res->fetch_row())) {
    $found[] = $row[0];
}
if (!$found) {
    echo "No tables like {$prefix}eb_config* found. EB tables present:\n";
    $res = $mysqli->query("SHOW TABLES LIKE '" . $mysqli->real_escape_string($prefix) . "eb_%'");
    while ($res && ($row = $res->fetch_row())) {
        echo '  ' . $row[0] . "\n";
    }
    exit;
}

foreach ($found as $table) {
    echo "== TABLE $table ==\n";
    $desc = $mysqli->query("DESCRIBE `$table`");
    $cols = [];
    while ($desc && ($c = $desc->fetch_assoc())) {
        $cols[] = $c['Field'];
        echo '  col: ' . $c['Field'] . ' (' . $c['Type'] . ")\n";
    }
    // Guess key/value columns (common RAD names first).
    $keyCol = null;
    $valCol = null;
    foreach (['config_key', 'name', 'key', 'setting', 'field'] as $candidate) {
        if (in_array($candidate, $cols, true)) {
            $keyCol = $candidate;
            break;
        }
    }
    foreach (['config_value', 'value', 'content', 'data'] as $candidate) {
        if (in_array($candidate, $cols, true)) {
            $valCol = $candidate;
            break;
        }
    }
    if ($keyCol && $valCol) {
        $q = $mysqli->query("SELECT `$keyCol`, `$valCol` FROM `$table` ORDER BY `$keyCol`");
        while ($q && ($r = $q->fetch_row())) {
            $show = (string) $r[1];
            if (preg_match('/key|pass|secret|token/i', (string) $r[0])) {
                $show = '[MASKED, length=' . strlen($show) . ']';
            } else {
                $show = substr($show, 0, 160);
            }
            echo $r[0], ' => ', $show, "\n";
        }
    } else {
        echo "  (key/value columns not recognised — first 5 rows raw:)\n";
        $q = $mysqli->query("SELECT * FROM `$table` LIMIT 5");
        while ($q && ($r = $q->fetch_assoc())) {
            $masked = [];
            foreach ($r as $k => $v) {
                $masked[$k] = preg_match('/key|pass|secret|token/i', (string) $k)
                    ? '[MASKED]'
                    : substr((string) $v, 0, 80);
            }
            echo '  ' . json_encode($masked) . "\n";
        }
    }
}
echo "DONE\n";
