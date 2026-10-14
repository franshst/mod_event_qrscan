<?php

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Router\Route;
use Joomla\Registry\Registry;

$ebBootstrap = JPATH_ADMINISTRATOR . '/components/com_eventbooking/libraries/rad/bootstrap.php';
if (!file_exists($ebBootstrap)) {
    echo '<p>' . Text::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}
try {
    require_once $ebBootstrap;
} catch (\Throwable $e) {
    echo '<p>' . Text::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}
if (!class_exists('EventbookingHelper') || !method_exists('EventbookingHelper', 'getConfig')) {
    echo '<p>' . Text::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}

	$app = Factory::getApplication();
	$config = EventbookingHelper::getConfig();

	if (!$config) {
		echo '<p>' . Text::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
		return;
	}
	$apiKey = method_exists($config, 'get') ? $config->get('checkin_api_key') : $config->checkin_api_key;
	if (empty($apiKey)) {
		echo '<p>' . Text::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
		return;
	}

$checkinUrl = Route::_('index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=' . $apiKey);
$params = new Registry($module->params);
$doc = $app->getDocument();

$checkInInterval = (int) $params->get('checkin_interval', 2000);
$ticketMaxLength = (int) $params->get('ticket_max_length', 32);
$scanFps = (int) $params->get('scan_fps', 2);
if ($scanFps < 1 || $scanFps > 10) {
	$scanFps = 2;
}

$doc->addScriptOptions('checkinUrl', $checkinUrl);
$doc->addScriptOptions('checkInInterval', $checkInInterval);
$doc->addScriptOptions('ticketMaxLength', $ticketMaxLength);
$doc->addScriptOptions('successAudioUrl', 'media/com_eventbooking/audios/success.mp3');
$doc->addScriptOptions('failAudioUrl', 'media/com_eventbooking/audios/fail.mp3');
$doc->addScriptOptions('scanFps', $scanFps);
$doc->addScriptOptions('MOD_EVENT_QRSCAN_START', Text::_('MOD_EVENT_QRSCAN_START'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_STOP', Text::_('MOD_EVENT_QRSCAN_STOP'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_NO_CAMERA', Text::_('MOD_EVENT_QRSCAN_ERROR_NO_CAMERA'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_CAMERA_BUSY', Text::_('MOD_EVENT_QRSCAN_ERROR_CAMERA_BUSY'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_OFFLINE', Text::_('MOD_EVENT_QRSCAN_ERROR_OFFLINE'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_INVALID_QR', Text::_('MOD_EVENT_QRSCAN_ERROR_INVALID_QR'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_EB_ABSENT', Text::_('MOD_EVENT_QRSCAN_ERROR_EB_ABSENT'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_ERROR_UNKNOWN', Text::_('MOD_EVENT_QRSCAN_ERROR_UNKNOWN'));
$wa = $doc->getWebAssetManager();
$wa->registerAndUseScript('mod_event_qrscan.html5-qrcode', 'modules/mod_event_qrscan/js/html5-qrcode.min.js');
$wa->registerAndUseScript('mod_event_qrscan.site-checkin', 'modules/mod_event_qrscan/js/site-checkin-default.min.js');

require ModuleHelper::getLayoutPath('mod_event_qrscan', 'default');
