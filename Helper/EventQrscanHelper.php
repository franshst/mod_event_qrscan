<?php

defined('_JEXEC') or die;

use Joomla\CMS\Factory;

class EventQrscanHelper
{
	public static function getTicketMaxLength($params)
	{
		return (int) $params->get('ticket_max_length', 32);
	}

	public static function getDedupInterval($params)
	{
		return (int) $params->get('checkin_interval', 2000);
	}

	public static function validateTicketCode($decodedText, $maxLength = 32)
	{
		if (empty($decodedText)) {
			return false;
		}

		if (!ctype_alnum($decodedText)) {
			return false;
		}

		if (strlen($decodedText) > $maxLength) {
			return false;
		}

		return true;
	}

	public static function getErrorMessage($case)
	{
		$messages = array(
			'no_camera' => 'No camera available.',
			'offline' => 'No network, check-in service unavailable',
			'invalid_qr' => 'This seems not to be a ticket QR code',
			'bad_key' => 'Invalid ticket code',
			'eb_absent' => 'Error while communicating with check-in service, error code is %s',
		);

		return isset($messages[$case]) ? $messages[$case] : 'An error occurred';
	}
}
