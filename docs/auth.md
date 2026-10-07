# Accounts and roles

Sign-in is built in `src/features/auth/`. There is no external identity
provider.

## Sign up and verify

1. `/auth/signup` takes a name, an email and a password of 8 to 255 characters.
   The password is checked against the Have I Been Pwned range API; a password
   found in a breach is refused. If that API is unreachable the check passes.
2. The account is created, a six-digit code valid for 10 minutes is stored, and
   the code is emailed.
3. The user is signed in and sent to `/auth/verify-email` to enter the code. The
   **Reenviar código** button on that page sends a new code. See
   [Rate limits](#rate-limits) for how many codes are issued.

If the email cannot be sent, the account is deleted, the user is not signed in
and the form says the email could not be sent. The same address can sign up
again. A failed resend leaves the previous code valid.

## Email

[`mailer.ts`](../src/features/auth/core/mailer.ts) sends the verification and
password reset codes through the [Resend](https://resend.com) API. It depends on
two variables, described in [configuration](configuration.md):

| `RESEND_API_KEY` and `MAIL_FROM` | `NODE_ENV`     | What happens                                                                           |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| Both set                         | any            | The email is sent. A provider error, or no answer in 10 seconds, fails the send.       |
| Either missing                   | not production | The email is not sent. The message is written to the server log.                       |
| Either missing                   | `production`   | The send fails with an error that names the missing variables. The code is not logged. |

In development with no mail settings, read the code in the `bun run dev`
terminal:

```text
[email] To student@example.com: Tu código de verificación es 482913. Expira en 10 minutos.
```

## Password reset

`/auth/reset-password` takes an email. If an account has it, the app stores a
reset session with a six-digit code valid for 10 minutes, emails the code, and
sets the `password_reset_session` cookie to a random token. The email is sent
after the response, so the page does not wait for the provider. If the send
fails, the error is logged and the session is deleted. The page answers the same
way, with a cookie, whether or not the account exists.

No page asks for the code. The form that sets the new password is
`/auth/reset-password/<token>`, and the email carries no link. The token is the
value of the `password_reset_session` cookie in the browser that made the
request, so open that URL with it. The new password must be 8 to 255 characters
and pass the same breach check as at sign-up.

## Sessions

A session is a random token in the `session` cookie (`httpOnly`, `SameSite=Lax`,
`Secure` when `NODE_ENV` is `production`). The database stores only its SHA-256
hash. A session lasts 30 days and renews when fewer than 15 days remain.
Passwords are hashed with PBKDF2-SHA256, 600,000 iterations.

[`src/middleware.ts`](../src/middleware.ts) sets the cookie again, with a 30-day
lifetime, on every GET that carries one. For other methods it answers 403 unless
the `Origin` header matches `Host`.

## Rate limits

Limits are held in memory in each Worker instance, so they reset when the
instance restarts and are not shared between instances.

| Action             | Limit                                                         |
| ------------------ | ------------------------------------------------------------- |
| Sign in            | 20 attempts per IP, refilling one per second.                 |
| Sign in, per user  | Waits of 1, 2, 4, 8, 16, 30, 60, 180, 300 s between tries.    |
| Sign up            | 3 per IP, refilling one per 10 seconds.                       |
| Verification codes | 3 per account in each 10-minute window.                       |
| Password reset     | None.                                                         |
| Entering a code    | None. A wrong verification code can be retried without limit. |

The IP is the `x-forwarded-for` header, else `x-real-ip`, else `unknown`.
Sign-up attempts count even when the form is then rejected. The per-user wait
applies only to emails that have an account, grows by one step on each try,
stays at 300 seconds after the ninth, and clears on a successful sign-in. A try
inside the wait is refused even with the right password.

The verification-code window opens at the first code an instance issues for an
account. When it ends, the next request starts a new window of 3 codes.

## Roles

`user.role` is one of four values. Sign-up creates `user`.

| Role        | Can do                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| `user`      | Browse, favorite, request loans, edit own name.                         |
| `librarian` | Everything a user can, plus manage books and images, and approve loans. |
| `admin`     | Everything a librarian can, plus change roles and suspend users.        |
| `suspended` | Sign in and browse. Every action that needs a role is refused.          |

Roles are enforced in server actions by `protectedAction` and
`authenticatedAction` in
[`protected-action.ts`](../src/features/auth/protected-action.ts). An `admin`
passes every role check. The `/admin` and `/admin/books/create` pages also
redirect users who are not a librarian or admin.

Two groups of actions do not use those wrappers. The sign-in, sign-up,
verification and reset actions in `src/features/auth/actions/` run before there
is a role to check. The image actions in `src/features/books/actions/editor.ts`
(`uploadBookImage`, `moveImageFromTemp`, `saveBookWithImages`,
`deleteBookImage`, `setCoverImage`) check only that a session exists, so any
signed-in account, whatever its role, can call them.

The admin dashboard is the home page (`/`) for a librarian or admin. It has tabs
for books, loan requests and users.
