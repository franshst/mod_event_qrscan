<div id="reader"></div>
<p id="aim-instruction"><?php echo JText::_('MOD_EVENT_QRSCAN_AIM_INSTRUCTION'); ?></p>
<button id="start-stop-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_START'); ?></button>
<button id="switch-camera-btn"><?php echo JText::_('MOD_EVENT_QRSCAN_SWITCH_CAMERA'); ?></button>

<?php
JHtml::_('bootstrap.modal', 'qrscanModal', array(
	'backdrop' => 'static',
	'keyboard' => true,
));
?>
<div id="qrscanModal" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title"><?php echo JText::_('MOD_EVENT_QRSCAN_RESULT'); ?></h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body"></div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-dismiss="modal"><?php echo JText::_('MOD_EVENT_QRSCAN_CLOSE'); ?></button>
			</div>
		</div>
	</div>
</div>
