# Sunday Headcount

Sunday attendance, offerings and assembly reports for Rehoboth Temple – Toronto.
Built with Next.js, Supabase (database and sign-in) and Nodemailer (email through the church's mailbox), hosted on Netlify.

This is **iteration 1**: everything the prototype does, with real accounts and a real database.

| Screen | Who sees it | What it does |
| --- | --- | --- |
| Sunday | Everyone | Enter men, women, children, new members; 1st, 2nd and special offerings, tithe and pledge, each in CAD and USD. Copies the message. Saving emails the summary. |
| Trends | Everyone | Weekly attendance, monthly offerings, month-by-month table. |
| Monthly | Pastor, admins | Month summary, fiscal obligations, monthly PDF. |
| Reports | Pastor, admins | Quarterly Assembly Reporting Form: report numbers, 3 steps, signature, PDF. |
| Settings | Admins | Assembly details, Sunday email list, team and roles. |

---

## 1. Run it on your computer

You need Node.js 20 or newer (`node -v`).

```bash
cd ~/Documents/sunday-headcount
npm install
cp .env.example .env.local      # then fill it in (step 2)
npm run dev                     # opens on http://localhost:3000
```

Run `npm run build` once before deploying. It type-checks the whole project and fails on any error.

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick the **Canada (Central)** region if offered.
2. **Create the tables.** Open **SQL Editor → New query**, paste all of `supabase/migrations/0001_init.sql`, and click **Run**. Then do the same, in number order, with `0002_profiles.sql` (people's names) `0003_usd_and_new_members.sql` (USD offerings and new members) and `0004_special_pledge_tithe.sql` (special offering, pledge and tithe). Later updates add more files; run each new one once.
3. **Copy the keys** from **Project Settings → API** (or **API Keys**) into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**server only, never share it or commit it**)
4. **Password rules.** In **Authentication → Sign In / Providers → Email**: keep **Email** enabled and set **Minimum password length** to `12`.
5. **Turn off public sign-up.** In **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**. Only admins add people.
6. **Create your own account.** In **Authentication → Users → Add user → Create new user**: your email, a strong password (12+ characters), and tick **Auto Confirm User**.
7. **Make yourself the first admin.** Open `supabase/bootstrap.sql`, replace `YOUR_EMAIL`, and run it in the SQL Editor. The last query should show one row with `admin`.

Sign in at http://localhost:3000 with that email and password.

### Adding people and resetting passwords

- **Add someone:** **Settings → Team** → first name, last name, email and role → **Add person**. The app shows a one-time password once.
  Give it to them in person or by text (not email). When they first sign in, they must choose their own password.
- **Forgotten password:** **Settings → Team** → **Reset password** next to their name. Same one-time password flow; their old password stops working.
- **Change your own password:** **My account** (top right).
- **Locked out as the only admin:** set your password from the project folder with the service key:
  ```bash
  node --env-file=.env.local scripts/set-test-password.mjs you@example.com 'a-new-long-password'
  ```

## 3. Set up email (Nodemailer + a dedicated mailbox)

The app sends the Sunday email with Nodemailer through an ordinary mailbox. Use a mailbox created
just for this app (e.g. `rehoboth.headcount@gmail.com`), never someone's personal account: its
app password can read that whole mailbox.

**Gmail (simplest)**
1. Create a new Google account for the app.
2. Turn on **2-Step Verification**: myaccount.google.com → **Security**.
3. Create an **app password**: myaccount.google.com → search **App passwords** → name it `Sunday Headcount` → copy the 16 characters (no spaces).
4. In `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=rehoboth.headcount@gmail.com
   SMTP_PASS=the16characterpassword
   EMAIL_FROM="Sunday Headcount <rehoboth.headcount@gmail.com>"
   ```
   Gmail always sends from the signed-in address, so `EMAIL_FROM` must use that same address.
5. Restart `npm run dev`, add yourself in **Settings → Sunday email**, and save a Sunday. Check spam the first time and mark it *Not spam*.

**Google Workspace** (church domain): same steps with the church mailbox; the email then comes from the church's address.
**Microsoft 365**: host `smtp.office365.com`, port `587`. An admin must turn on *Authenticated SMTP* for the mailbox, and Microsoft is phasing out password sign-in for SMTP, so prefer Gmail or Workspace.

Sign-in uses passwords, so the app no longer needs Supabase to send sign-in emails. Until email is set up, saving still works and the app says the email was not sent.
To revoke access at any time, delete the app password in the Google account; nothing else changes.

## 4. Deploy to Netlify

1. **Put the code on GitHub** (private repository):
   ```bash
   cd ~/Documents/sunday-headcount
   git init && git add . && git commit -m "Sunday Headcount iteration 1"
   ```
   Create an empty **private** repo on github.com, then run the two `git remote add` / `git push` lines it shows.
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub**, pick the repo. Netlify detects Next.js; keep the build command `npm run build`.
3. **Environment variables** (Site configuration → Environment variables), add every value from `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`,
   and `NEXT_PUBLIC_SITE_URL` = your Netlify address (e.g. `https://rehoboth-headcount.netlify.app`).
4. **Deploy site.** When it finishes, open the address.
5. **Point Supabase at the live site.** In **Authentication → URL Configuration**, set **Site URL** to the Netlify address and add `https://YOUR-SITE.netlify.app/**` to **Redirect URLs**.
6. (Optional) **Custom domain.** In Netlify, **Domain management → Add a domain**, e.g. `headcount.yourchurch.org`. Then update `NEXT_PUBLIC_SITE_URL` and the Supabase URLs to match, and redeploy.
7. **Install on phones.** Open the site in Safari (iPhone) → Share → **Add to Home Screen**, or Chrome (Android) → menu → **Install app**.

Every push to the `main` branch redeploys automatically.

## 5. Check it works

- [ ] Sign in on your phone with your email and password.
- [ ] Add a test usher from Settings, sign in with the one-time password, choose a new one; they can open Sunday and Trends but not Monthly, Reports or Settings.
- [ ] Save a Sunday; the recipients get the email with the same text as the WhatsApp message.
- [ ] Set a month's fiscal records, then open the quarter in Reports: questions 27–31 and 34 are pre-filled.
- [ ] Download the monthly and quarterly PDFs and compare them with the paper form.

---

## How the code is organised

```
supabase/migrations/0001_init.sql   tables, permissions (row-level security), audit log
src/lib/reports/registry.ts          the list of report types
src/lib/reports/assembly-quarterly.ts  the Assembly Reporting Form: questions and how answers are worked out
src/lib/pdf/                         PDF layouts (monthly, assembly form)
src/app/(app)/sunday                 Sunday entry + save + email
src/app/(app)/reports/[template]/[period]   report screens
src/app/(app)/settings               details, email list, team
```

### Adding a report for another group (later iterations)

Reports are **templates**. Answers for every template live in one table (`report_submissions`), keyed by
`template_key` and `period_key`, so a new report needs no database change:

1. Add an entry to `src/lib/reports/registry.ts` (key, title, group, monthly or quarterly, which roles).
2. Write its questions in a new file beside `assembly-quarterly.ts`.
3. Add its screen in `src/app/(app)/reports/[template]/[period]/page.tsx` (and a PDF layout in `src/lib/pdf/`).

If a group needs its own people (e.g. a youth leader who should only see the youth report), add a `group`
column to `memberships` and to the template's `roles` check in that iteration.

## Security notes

- Permissions are enforced by the database (row-level security), not just by hiding buttons.
- `SMTP_PASS` is an app password for the app's mailbox. Keep it only in `.env.local` and Netlify, and revoke it in the Google account if it ever leaks.
- The service role key bypasses those rules. It is only read on the server (`src/lib/supabase/admin.ts`). Never put it in a `NEXT_PUBLIC_` variable.
- Every change to Sundays, monthly records, reports, the team and the email list is written to `audit_log`.
- The Sunday email contains offering amounts. Keep the list to people who should see them.
- Passwords: 12+ characters, one-time passwords are random and shown once, and people must replace them at first sign-in. Supabase slows down repeated wrong attempts.
- Typed initials are not a verified signature. The app records who saved the report and when (`updated_by`, `updated_at`).

## Next iterations (not built yet)

- Work offline in the sanctuary and sync when back online (service worker + local queue).
- PNG app icons for older phones.
- "Forgot password?" by email, once the church's email sending is reliable.
- Wait a few minutes before emailing, so several quick corrections send one email.
- Import past Sundays from a spreadsheet.
- Reports for other groups (see above).
