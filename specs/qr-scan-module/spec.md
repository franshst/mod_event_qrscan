# Feature Specification: QR Scan Module

## Short Name: qr-scan-module

## Purpose

This feature provides a web-based QR scan module for event volunteers to check tickets at the entrance. Users select the module from the event organizer's website and interact with a simple interface to scan QR codes.

## User Scenarios & Testing

### Primary User Flow

1. **User selects QR scan module** from the event organizer's website
2. **Blank screen with camera area** appears, ready to scan
3. **User clicks camera button** to cycle through available cameras (default: "Back camera")
4. **User clicks start/stop button** to begin scanning
5. **Camera image displays** in the designated area
6. **QR code is recognized** and ticket code is sent to check-in module
7. **Response pop-up appears** with scan result
8. **User reads pop-up and clicks OK** to dismiss
9. **Ready to scan next QR code**

### Edge Cases

- **No camera available**: User should be informed of the issue
- **Camera in use**: User should be informed the camera is in use by another application
- **Network error**: Clear indication of connection problem
- **Invalid QR code**: Display error message
- **Pop-up display failure**: Clear error message

## Glossary (canonical terms)

- **EB** = Events Booking (`com_eventbooking`). **Check-in Module** = EB `scan.qr_code_checkin` endpoint: accepts ticket codes from this module, forwards to the Reservation Module, and returns the result; this module displays the returned message. **Reservation Module** = EB backend that validates the ticket and performs the check-in, returning either success or an error message to the Check-in Module.
- JS option keys (canonical): `checkinUrl`, `checkInInterval`, `ticketMaxLength`, `successAudioUrl`, `failAudioUrl`, `textSuccessClass`, `textWarningClass`.

## Functional Requirements (stable IDs for coverage mapping)

1. **FR-1 User Interface**: Volunteer can Start → scan → dismiss result using only the on-screen instruction and button labels (no external guidance); aim instruction (“Hold the ticket code inside the square”), Start/Stop + Switch-camera buttons visible.
2. **FR-2 Camera Selection**: Ability to switch between available cameras with default back camera (`facingMode exact environment` → label match → first; chosen `deviceId` persisted in `localStorage` and reused next session, overriding the back-camera default).
3. **FR-3 Start/Stop Control**: Custom Start/Stop button starts/stops `Html5Qrcode` decoder (no `Html5QrcodeScanner` widget UI).
4. **FR-4 QR Recognition**: QR-only decode attempt at `fps: 1`, `qrbox` 250×250, `formatsToSupport: [QR_CODE]`, `disableFlip: true`.
5. **FR-5 Ticket Code Transmission**: Send `GET {checkinUrl}&value={encodeURIComponent(ticket)}&t={Date.now()}` to Check-in Module; secure transmission delegated to site HTTPS + logged-in user (no extra module crypto).
6. **FR-6 Response Display**: Single Bootstrap 5 modal (`qrscanModal`) shows text-escaped `message`; Close via `data-bs-dismiss`. If `bootstrap.Modal` is unavailable, render the message as inline text instead (FR-7 error path; modal and inline fallback are never shown simultaneously). Body styling uses module params `text_success_class` (default `text-success`) and `text_warning_class` (default `text-danger`); no module CSS.
7. **FR-7 User Feedback**: All failures show human-readable modal/inline text (no `alert()`). Acceptance criteria: each negative case (no camera, camera in use, offline, invalid QR, bad key, EB absent) yields modal/inline text with the correct EB sound where applicable.
8. **FR-8 Non-Scanning During Processing**: No check-in request while `isProcessing===true` (software flag + guarded `pause(true)`/`resume()`); verified by single request in devtools Network.
9. **FR-9 Ticket Code Pre-validation**: Before any network call, reject `decodedText` that is empty, non-alphanumeric, or longer than `ticket_max_length` (default 32); show human-readable modal/inline error and send no request. Undecodable frames (`onScanFailure`) stay silent no-ops.
10. **FR-10 Audio Feedback**: On each resolved result, play EB `success.mp3` iff `success:true`, else `fail.mp3` — including client-validation and network failures. Guard `Audio` playback errors with silent fallback; result display (FR-6/FR-7) always takes precedence. No audio assets are bundled in the ZIP (EB-sourced, see R7).
11. **FR-11 Rescan Dedup + Background Suspend**: After modal dismiss, suppress resend of the same ticket code while `now - sessionStorage[value] < checkInInterval` (default 2000 ms); a different code always sends immediately. On `document.visibilitychange`, pause when hidden and resume when visible (guarded by `getState()`, same pattern as FR-8).

## Success Criteria

1. **SC-1 User Experience [informational]**: 95% of users can successfully scan and receive response within 1 second (post-launch survey, not a build gate). NOTE: Fulfilling this timing is out of scope of this first implementation, as scan processing speed is heavily influenced by lighting conditions and camera quality and cannot be influenced by the HTML5 QR code JavaScript implementation.
2. **SC-2 Accuracy [informational]**: 99% of QR codes are recognized correctly (post-launch, not a build gate).
3. **SC-3 Response Time [informational]**: Response pop-up appears within 1 second of QR recognition. NOTE: Fulfilling this timing is out of scope of this first implementation, as scan processing speed is heavily influenced by lighting conditions and camera quality and cannot be influenced by the HTML5 QR code JavaScript implementation. (monitored via T16 manual scan.)
4. **SC-4 User Satisfaction [informational]**: 80% of users report the interface is easy to use (post-launch survey, not a build gate). NOTE: Scan timing targets (<1 second) are out of scope of this first implementation, as scan processing speed is heavily influenced by lighting conditions and camera quality.
5. **SC-5 Error Handling [build-gate]**: Every error case displays a specific human-readable message and the correct EB sound where applicable: no camera → "No camera available."; camera in use → "Camera is in use by another application."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → not detected by this module (check-in module returns its own message); EB absent → "Error while communicating with check-in service, error code is %s" (where `%s` is the HTTP status code). Verified by T16 negatives.
6. **SC-6 Reliability [out-of-scope]**: Out of scope — uptime is dictated by the availability of the underlying (out-of-scope) software/hardware.

## Key Entities

- **User**: Volunteer scanning tickets
- **Camera**: Device capturing QR code images
- **Check-in Module**: EB endpoint receiving ticket codes from this module and returning the check-in result for display
- **Reservation Module**: EB backend validating tickets and performing the check-in
- **QR Code**: Data encoded on tickets
- **Ticket Code**: Unique identifier for each ticket
- **Pop-up** (= Bootstrap 5 `qrscanModal`): User interface displaying scan results

## Assumptions

1. Internet connection is available at the event entrance
2. QR codes are properly formatted and readable
3. Camera devices are properly calibrated and functional
4. Check-in module is accessible and operational
5. Network latency is within acceptable limits
6. User has basic computer literacy

## Clarifications

### Session 2026-09-13

- Q: How is JS minification handled? → A: Minification is done by `build.py` using `uglify-js` (`uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`). `build.yml` also installs `uglify-js` for CI consistency.

### Session 2026-09-16

- Q: What should the camera-in-use message say? → A: B — "Camera is in use by another application." (inform only, no retry guidance)

## Notes

- Mobile phone camera (default: Back camera)
- Handle technical errors only, apart from simple check on QR code contents (Alphanumeric only, limited length). Functional validation is done by the Reservation Module, which returns either a successful check-in or an error message to the Check-in Module; this module displays that message.
- No additional security measures needed in this module: secure transmission is provided by the site's HTTPS, and calls to the Check-in Module require a logged-in user.
