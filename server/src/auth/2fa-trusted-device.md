# 2FA with Trusted Device (Remember This Device)

This document explains the two-factor authentication (2FA) flow and the
**trusted device** mechanism that lets a verified user skip 2FA on the
same device for 30 days.

---

## Overview

- Standard TOTP-based 2FA (compatible with Google Authenticator, Authy, etc.)
- Recovery codes as a backup login method if the authenticator device is lost
- Optional **"Trust this device for 30 days"** — reduces friction for repeat
  logins on the same device without weakening security on other devices
- Trust state is stored per-session (`RefreshToken` collection), not in a
  separate table — no additional schema needed

---

## Login Flow

```text
Email + Password
        │
        ▼
  Password valid?
        │
       YES
        │
        ▼
  2FA enabled on account?
        │
   ┌────┴────┐
   NO        YES
   │          │
   │          ▼
   │   Trusted device cookie present & valid?
   │          │
   │     ┌────┴────┐
   │    YES         NO
   │     │           │
   │     ▼           ▼
   │  Login      Return tempToken (5 min)
   │  (2FA          │
   │  skipped)      ▼
   │             Client shows 2FA screen
   │                 │
   │                 ▼
   │         User submits 6-digit TOTP code
   │            (or a recovery code)
   │                 │
   │                 ▼
   │            Code valid?
   │                 │
   │                YES
   │                 │
   │                 ▼
   │        "Trust this device?"
   │                 │
   │            ┌────┴────┐
   │            NO         YES
   │            │           │
   │            │           ▼
   │            │   Generate trustedDeviceToken
   │            │   (30-day expiry, hashed in DB)
   │            │           │
   │            └─────┬─────┘
   │                  │
   └──────────────────┤
                      ▼
                  Login complete
           (access + refresh token issued)
```

---

## Why Trust State Lives in `RefreshToken`, Not a Separate Collection

Each login creates a session document (`RefreshToken`). The trusted-device
token is tied to the **session that created it**, not the user directly.
This means:

- Revoking a single session also revokes any trust it granted
- `logout-all` revokes every session → every trusted device is invalidated
  in one operation, with no extra cleanup query
- No orphaned trust records if a session expires naturally (TTL index cleans
  both up together)

---

## Security Properties

| Property | Behavior |
|---|---|
| Trust token storage | SHA-256 hash only — raw token never persisted |
| Trust token transport | `httpOnly`, `secure` (prod), `sameSite: strict` cookie |
| Trust token lifetime | 30 days, hard expiry — no silent renewal on use |
| Reuse | One-time: consumed and cleared on successful skip, not reissued |
| Scope | Per device (per cookie), not per account — other devices unaffected |
| Revocation | `logout` revokes that session only; `logout-all` revokes trust everywhere |

> **Note:** Trust is intentionally *not* renewed on skip. A device that
> reuses a valid trust token still has to re-authenticate with 2FA after the
> original 30-day window closes. This is a deliberate trade-off favoring
> security over convenience — see [Extending This](#extending-this) if you
> want rotating trust instead.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Step 1 — email + password. Returns `tempToken` if 2FA required, or a full session if not (or if trusted device matched) |
| `POST` | `/auth/2fa/generate` | Generates TOTP secret + QR code (setup step 1) |
| `POST` | `/auth/2fa/enable` | Verifies a code and turns 2FA on, returns recovery codes |
| `POST` | `/auth/2fa/disable` | Requires password + valid code to turn 2FA off |
| `POST` | `/auth/2fa/verify-login` | Step 2 — submits `tempToken` + code (+ `trustDevice` flag) |
| `POST` | `/auth/2fa/verify-recovery` | Same as above but with a recovery code instead of TOTP |
| `POST` | `/auth/logout` | Revokes current session only |
| `POST` | `/auth/logout-all` | Revokes all sessions (and therefore all trusted devices) |

---

## Environment / Constants

Configured in `src/constants/auth.constants.ts`:

```ts
MAX_ACTIVE_DEVICES     // cap on concurrent sessions per user
ACCESS_TOKEN_TTL_MS    // short-lived JWT access token
REFRESH_TOKEN_TTL_MS   // refresh token / session lifetime
TRUSTED_DEVICE_TTL_MS  // 30 days — trust window
```

---

## Extending This

- **Rotating trust** — reissue a new 30-day token on every successful skip
  instead of requiring re-verification after expiry. Trade-off: weaker
  security if a device is compromised long-term.
- **Per-device session list UI** — `GET /auth/sessions` already returns
  active sessions; a "trusted" badge can be derived from
  `trustedDeviceExpiresAt`.
- **Device naming** — `deviceName` is currently inferred from `User-Agent`
  (Windows/Mac/Linux/Mobile) — could be made user-editable.
