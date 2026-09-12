<?php

defined('_JEXEC') or die;

use Joomla\CMS\Module\ModuleHelper;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Uri\Uri;

require_once JPATH_ADMINISTRATOR . '/components/com_eventbooking/libraries/rad/bootstrap.php';

$app = JFactory::getApplication();
$config = EventbookingHelper::getConfig();

if (!$config || empty($config->checkin_api_key)) {
	echo '<p>' . JText::_('MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG') . '</p>';
	return;
}

$checkinUrl = Route::_('index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=' . $config->checkin_api_key);
$params = $module->params;
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

require ModuleHelper::getLayoutPath('mod_event_qrscan', $layout);
