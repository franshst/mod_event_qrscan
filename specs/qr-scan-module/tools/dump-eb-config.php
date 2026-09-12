<?php
/**
 * One-off diagnostic: dump Events Booking config key names.
 *
 * Usage (local Joomla 5 test system with com_eventbooking installed):
 *   1. Copy this file to the Joomla site root as dump_eb_config.php
 *   2. Log in to the administrator in the same browser
 *   3. Open https://your-test-site/dump_eb_config.php
 *   4. Copy the output back (key names only matter) and DELETE the file
 *
 * Do NOT deploy this file anywhere public. Values that look like secrets
 * are masked (length shown so presence can still be confirmed).
 */
define('_JEXEC', 1);
require __DIR__ . '/includes/defines.php';
require JPATH_LIBRARIES . '/bootstrap.php';

use Joomla\CMS\Factory;
use Joomla\CMS\Application\SiteApplication;

header('Content-Type: text/plain; charset=utf-8');

// Application boot is best-effort: EB getConfig() typically needs only the DB,
// which is available from the DI container without an application instance.
try {
    $app = Factory::getContainer()->get(SiteApplication::class);
    $app->initialise();
    echo "APP: site application initialised\n";
} catch (Throwable $e) {
    echo 'APP: continuing without application (' . $e->getMessage() . ")\n";
}

$bootstrap = JPATH_ADMINISTRATOR . '/components/com_eventbooking/libraries/rad/bootstrap.php';
if (!is_file($bootstrap)) {
    echo "EB bootstrap NOT FOUND: $bootstrap\n";
    exit;
}
require_once $bootstrap;

if (!class_exists('EventbookingHelper') || !method_exists('EventbookingHelper', 'getConfig')) {
    echo "EventbookingHelper::getConfig() NOT AVAILABLE\n";
    exit;
}

try {
    $config = EventbookingHelper::getConfig();
} catch (Throwable $e) {
    echo 'getConfig() FAILED: ' . $e->getMessage() . "\n";
    exit;
}

foreach ((array) $config as $key => $value) {
    if (preg_match('/key|pass|secret|token/i', (string) $key)) {
        $show = '[MASKED, length=' . strlen((string) $value) . ']';
    } elseif (is_scalar($value) || $value === null) {
        $show = substr((string) $value, 0, 160);
    } else {
        $show = '[' . gettype($value) . ']';
    }
    echo $key, ' => ', $show, "\n";
}
echo "DONE\n";
