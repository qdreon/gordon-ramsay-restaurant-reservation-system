This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install dependencies

From this directory, install the project packages:

```bash
npm install
```

### 2. Create your local environment file

Copy the committed template into a private local file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Then ask the project owner for the real values and replace the placeholders in `.env.local`.

Required for normal app usage:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for email/health checks (pick one delivery method):

- **SMTP (recommended if your host gave you SMTP credentials):** set `SMTP_HOST`, and usually `SMTP_USER` / `SMTP_PASSWORD`. Optional: `SMTP_PORT` (default 587), `SMTP_SECURE=true` for implicit TLS (e.g. port 465), `SMTP_REQUIRE_TLS=true` if your provider requires STARTTLS.
- **Mailtrap HTTP API:** set `MAILTRAP_API_TOKEN` (transactional sending token from Mailtrap Sending, or testing token with sandbox below).
- **Mailtrap Email Testing inbox:** set `MAILTRAP_USE_SANDBOX=true` and `MAILTRAP_INBOX_ID` to your inbox number so messages appear in the Mailtrap testing UI instead of hitting the transactional API.

Always set a From address:

- `MAILTRAP_FROM` or `EMAIL_FROM`

Optional metadata:

- `RESTAURANT_NAME`
- `RESTAURANT_ADDRESS`

Important: never commit `.env.local`. It contains private credentials and is ignored by Git.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
