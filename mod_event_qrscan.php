<?php

defined('_JEXEC') or die;

use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Uri\Uri;
use Joomla\Registry\Registry;

$ebBootstrap = JPATH_ADMINISTRATOR . '/components/com_eventbooking/libraries/rad/bootstrap.php';
if (!file_exists($ebBootstrap)) {
    echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}
try {
    require_once $ebBootstrap;
} catch (\Throwable $e) {
    echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}
if (!class_exists('EventbookingHelper') || !method_exists('EventbookingHelper', 'getConfig')) {
    echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
    return;
}

	$app = JFactory::getApplication();
	$config = EventbookingHelper::getConfig();

	if (!$config) {
		echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
		return;
	}
	$apiKey = method_exists($config, 'get') ? $config->get('checkin_api_key') : $config->checkin_api_key;
	if (empty($apiKey)) {
		echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
		return;
	}

$checkinUrl = Route::_('index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=' . $apiKey);
$params = new Registry($module->params);
$doc = JFactory::getDocument();

$checkInInterval = (int) $params->get('checkin_interval', 2000);
$ticketMaxLength = (int) $params->get('ticket_max_length', 32);
$textSuccessClass = $params->get('text_success_class', 'text-success');
$textWarningClass = $params->get('text_warning_class', 'text-danger');
$layout = $params->get('layout', 'default');

$doc->addScriptOptions('checkinUrl', $checkinUrl);
$doc->addScriptOptions('checkInInterval', $checkInInterval);
$doc->addScriptOptions('ticketMaxLength', $ticketMaxLength);
$doc->addScriptOptions('successAudioUrl', 'media/com_eventbooking/audios/success.mp3');
$doc->addScriptOptions('failAudioUrl', 'media/com_eventbooking/audios/fail.mp3');
$doc->addScriptOptions('textSuccessClass', $textSuccessClass);
$doc->addScriptOptions('textWarningClass', $textWarningClass);
$doc->addScriptOptions('MOD_EVENT_QRSCAN_START', JText::_('MOD_EVENT_QRSCAN_START'));
$doc->addScriptOptions('MOD_EVENT_QRSCAN_STOP', JText::_('MOD_EVENT_QRSCAN_STOP'));
$doc->addScript('modules/mod_event_qrscan/js/html5-qrcode.min.js');
$doc->addScript('modules/mod_event_qrscan/js/site-checkin-default.min.js');

require ModuleHelper::getLayoutPath('mod_event_qrscan', $layout);
