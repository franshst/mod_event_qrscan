<?php
defined('_JEXEC') or die;
use Joomla\CMS\HTML\HTMLHelper;
HTMLHelper::_('bootstrap.modal', 'qrscanModal', array(
	'backdrop' => 'static',
	'keyboard' => true,
));
$textSuccessClass = $params->get('text_success_class', 'text-success');
$textWarningClass = $params->get('text_warning_class', 'text-danger');
?>
<div id="reader"></div>
<p id="aim-instruction"><?php echo JText::_('MOD_EVENT_QRSCAN_AIM_INSTRUCTION'); ?></p>
<button id="start-stop-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_START'); ?></button>
<button id="switch-camera-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_SWITCH_CAMERA'); ?></button>
<p id="aim-instruction"><?php echo JText::_('MOD_EVENT_QRSCAN_AIM_INSTRUCTION'); ?></p>
<button id="start-stop-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_START'); ?></button>
<button id="switch-camera-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_SWITCH_CAMERA'); ?></button>
<div id="qrscanModal" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title"><?php echo JText::_('MOD_EVENT_QRSCAN_RESULT'); ?></h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body <?php echo $textSuccessClass; ?>"></div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo JText::_('MOD_EVENT_QRSCAN_CLOSE'); ?></button>
			</div>
		</div>
	</div>
</div>
