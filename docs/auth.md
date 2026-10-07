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
password reset codes through the `EMAIL` Cloudflare Email Service binding. It
needs that binding and the `MAIL_FROM` variable, described in
[configuration](configuration.md) and [deployment](deployment.md#email):

| `EMAIL` and `MAIL_FROM` | `NODE_ENV`     | What happens                                                                     |
| ----------------------- | -------------- | -------------------------------------------------------------------------------- |
| Both present            | any            | The email is sent. A provider error, or no answer in 10 seconds, fails the send. |
| Either missing          | not production | The email is not sent. The message is written to the server log.                 |
| Either missing          | `production`   | The send fails with an error that names what is missing. The code is not logged. |

In production with a setting missing, sign-up and password reset check this
before they touch the database. They log `Cannot send email: MAIL_FROM not set.`
(or the missing binding) and answer that email cannot be sent, with no account
or reset session created. The password reset answer is the same for every
address, so it still does not reveal which addresses have an account.

In development, `MAIL_FROM` is empty, so read the code in the `bun run dev`
terminal:

```text
[email] To student@example.com: Tu código de verificación es 482913. Expira en 10 minutos.
```

## Password reset

`/auth/reset-password` takes an email. If mail is not set up in production, it
answers with an error for every address, as described under [Email](#email).
Otherwise, if an account has the address, the app stores a reset session with a
six-digit code valid for 10 minutes, emails the code, and sets the
`password_reset_session` cookie to a random token. The email is sent after the
response, so the page does not wait for the provider. If the send fails, the
error is logged and the session is deleted. The page answers the same way, with
a cookie, whether or not the account exists.

After the request, the same page asks for the emailed code and the new password.
The email carries no link. The code only works together with the
`password_reset_session` cookie of the browser that made the request. The new
password must be 8 to 255 characters and pass the same breach check as at
sign-up. Changing the password signs the account out of every session.

A wrong code is refused the same way as an unknown or expired session. After 5
wrong codes in 10 minutes for an account, even the right code is refused until
the window ends. Asking for a new code does not reset the count.

## Sessions

A session is a random token in the `session` cookie (`httpOnly`, `SameSite=Lax`,
`Secure` when `NODE_ENV` is `production`). The database stores only its SHA-256
hash. A session lasts 30 days and renews when fewer than 15 days remain.
Passwords are hashed with PBKDF2-SHA256, 100,000 iterations, the most the
Workers runtime allows.

[`src/middleware.ts`](../src/middleware.ts) sets the cookie again, with a 30-day
lifetime, on every GET or HEAD that carries one. For other methods it answers
403 unless the `Origin` header matches `Host`.

## Rate limits

Limits are rows in the `rate_limit` table, shared by every Worker instance and
kept across restarts. Each decision is one SQL statement, and D1 runs statements
one at a time, so two simultaneous attempts cannot both take the last token. A
Durable Object would not make this stricter. Expired rows are deleted on the
next attempt. Instances compare their own clocks with the stored times, so the
clocks need to agree to within about a second.

| Action                  | Limit                                                      |
| ----------------------- | ---------------------------------------------------------- |
| Sign in                 | 20 attempts per IP, refilling one per second.              |
| Sign in, per user       | Waits of 1, 2, 4, 8, 16, 30, 60, 180, 300 s between tries. |
| Sign up                 | 3 per IP, refilling one per 10 seconds.                    |
| Verification codes      | 3 per account in each 10-minute window.                    |
| Entering a verification | 5 tries per account in each 10-minute window.              |
| Password reset request  | 3 per IP, refilling one per 30 seconds.                    |
| Entering a reset code   | 5 tries per account in each 10-minute window.              |

The IP is the `cf-connecting-ip` header that Cloudflare sets, else `unknown`.
`x-forwarded-for` is not used, because the client can send any value. Sign-up
attempts count even when the form is then rejected. The per-user wait applies
only to emails that have an account, grows by one step on each try, stays at 300
seconds after the ninth, and clears on a successful sign-in. A try inside the
wait is refused even with the right password.

The verification-code window opens at the first code issued for an account. When
it ends, the next request starts a new window of 3 codes.

## Roles

`user.role` is one of four values. Sign-up creates `user`.

| Role        | Can do                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| `user`      | Browse, favorite, request loans, edit own name.                         |
| `librarian` | Everything a user can, plus manage books and images, and approve loans. |
| `admin`     | Everything a librarian can, plus change roles and suspend users.        |
| `suspended` | Sign in and browse. Every action that needs a role is refused.          |

Roles are enforced in server actions by `protectedAction`, `staffAction` and
`authenticatedAction` in
[`protected-action.ts`](../src/features/auth/protected-action.ts). `staffAction`
admits a librarian or admin, and every action that creates, edits or deletes a
book, an image or a loan decision uses it, including those in
`src/features/books/actions/editor.ts`. An `admin` passes every role check. A
wrapper checks the session and role before it validates the input. The
`/admin/books/create` and `/admin/books/[id]` pages call `requireStaffPage` and
redirect users who are not a librarian or admin.

No role acts before its email is verified, because anyone can sign up with any
address. The wrapper refuses an unverified caller with the `unverified` code.
The pages that need a session send an unverified user to `/auth/verify-email`.
Reads that anyone may call (`getBooks`, `getBookById` and the home page) show an
unverified account the same view as a visitor, without its favorites, and the
book page hides staff controls from it. `getFavoriteBooks` is an authenticated
action, so an unverified caller gets `unverified`.

A wrapped action never throws to the browser. Production Next.js replaces the
message of a thrown error, so the wrapper returns a result: `Ok(value)`, or
`Err({ code, message })` with the code `unauthorized`, `forbidden`,
`unverified`, `invalid` or `failed`. Services throw `UserError` for failures the
user should read, and the wrapper passes its Spanish message on. Any other error
is logged and shown as a generic message.

A role change is refused when the actor targets their own account.

The sign-in, sign-up, verification and reset actions in
`src/features/auth/actions/` do not use the wrappers. They run before there is a
role to check.

The admin dashboard is the home page (`/`) for a librarian or admin. It has tabs
for books, loan requests and users.
