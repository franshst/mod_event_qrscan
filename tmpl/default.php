<?php
defined('_JEXEC') or die;
use Joomla\CMS\HTML\HTMLHelper;
HTMLHelper::_('bootstrap.modal', 'qrscanModal', array(
	'backdrop' => 'static',
	'keyboard' => true,
));
?>
<div id="reader"></div>
<p id="aim-instruction"><?php echo JText::_('MOD_EVENT_QRSCAN_AIM_INSTRUCTION'); ?></p>
<button id="start-stop-btn" type="button" class="btn btn-primary"> <?php echo JText::_('MOD_EVENT_QRSCAN_START'); ?></button>
<button id="switch-camera-btn" type="button" class="btn btn-secondary"> <?php echo JText::_('MOD_EVENT_QRSCAN_SWITCH_CAMERA'); ?></button>
<div id="qrscanModal" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title"><?php echo JText::_('MOD_EVENT_QRSCAN_RESULT'); ?></h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?php echo JText::_('MOD_EVENT_QRSCAN_CLOSE'); ?>"></button>
			</div>
			<div class="modal-body text-success"></div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary" data-bs-dismiss="modal"><?php echo JText::_('MOD_EVENT_QRSCAN_CLOSE'); ?></button>
			</div>
		</div>
	</div>
</div>
