This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
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

## Paystack checkout setup

Before checkout can run:

1. Run `supabase/migrations/202610300001_paystack_checkout.sql` in the Supabase SQL Editor.
2. Add these server-only environment variables to local `.env.local` and the Vercel project:
   - `PAYSTACK_SECRET_KEY` — use a Paystack test key during development.
   - `SUPABASE_SECRET_KEY` — use the Supabase secret/service-role key. `SUPABASE_SERVICE_ROLE_KEY` is also accepted for older projects.
   - `PLATFORM_FEE_PERCENT` — a number from 0 to 100, without a `%` sign. Checkout stays disabled until this is set.
3. Set the Paystack webhook URL to `https://<your-deployed-domain>/api/payments/paystack/webhook`.

The launch checkout currently accepts NGN listings only. Never expose the Paystack or Supabase secret keys in a `NEXT_PUBLIC_` variable.
