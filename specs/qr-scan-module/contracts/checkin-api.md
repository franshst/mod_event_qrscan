# Contract: Check-in API

## Request

```text
GET {checkinUrl}&value={ticket}&t={ts}
```

- `checkinUrl`: full EB check-in URL from EB `getConfig()` (server-side), e.g.
  `https://balfolkamsterdam.nl/index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=BA123kassa`
- `value`: `encodeURIComponent(ticketCode)`; ticket alphanumeric, 1..32 chars by default (configurable max).
- `t`: `Date.now()` cache-buster only. No business meaning.

Sample:

```text
https://balfolkamsterdam.nl/index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=BA123kassa&value=Z8GiIIIKzOKwbvO6&t=1789149638905
```

The full URL is constructed server-side by the module (`Route::_()`); the JS
appends only `&value=` + `&t=`.

## Response

JSON:

```json
{ "success": true, "message": "Ticket accepted" }
{ "success": false, "message": "Already checked in" }
```

## Errors

| Case | Detection | UX |
|---|---|---|
| Invalid QR (non-alphanumeric/overlong) | client validation | modal: "This seems not to be a ticket QR code", no request |
| Missing check-in URL (EB absent/misconfigured) | empty EB value | error text "Events Booking is required", no scanner |
| Network fail | `Joomla.request.onError` | modal: "No network, check-in service unavailable", no `alert()` |
| HTTP 401 / bad key | `success:false` or error | check-in module returns its own message |
| No camera | scanner init fail | modal: "No camera available." |

`message` must be text-escaped before `innerHTML`.

## Security (out of module scope)

Secure transmission is provided by the site's HTTPS; every request requires a
logged-in Joomla user (enforced by the site/EB endpoint). This module adds no
additional security measures and performs no extra logging.
