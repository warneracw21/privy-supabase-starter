# Privy + Supabase Starter

Use Supabase as your authentication provider while leveraging Privy's wallet infrastructure. This starter demonstrates how to authenticate users with Supabase and use their JWT tokens to authorize wallet actions through Privy's server-side SDK.

**[📖 Full Documentation](https://docs.privy.io/recipes/authentication/using-supabase-for-custom-auth)**

## Features

- 🔐 Supabase email/password authentication
- 👛 Privy embedded wallet creation on signup
- ✍️ Server-side message signing with user authorization
- 💸 Sponsored transactions on Base Sepolia
- 🎫 JWT token inspection and decoding

## Prerequisites

- A [Supabase](https://supabase.com) project
- A [Privy](https://privy.io) app

---

## Setup

### 1. Configure Supabase JWT Signing Keys

Privy requires RS256 (asymmetric) JWT signing. By default, Supabase uses HS256.

1. Go to your **Supabase Dashboard** → **Project Settings** → **API** → **JWT Settings**
2. Create a new **Standby signing key** with RS256
3. Click **Rotate keys** to make it the active signing key

> ⚠️ **Gotcha:** Verify the JWKS endpoint returns keys. If the `keys` array is empty, complete the JWT signing key migration first.
>
> Check your endpoint: `https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/.well-known/jwks.json`

### 2. Configure Privy Custom Auth

1. Go to your **Privy Dashboard** → **User Management** → **Authentication**
2. Enable **Custom JWT authentication**
3. Enter your Supabase JWKS endpoint:
   ```
   https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/.well-known/jwks.json
   ```

### 3. Enable Gas Sponsorship (Optional)

To use sponsored transactions on Base Sepolia:

1. Go to your **Privy Dashboard** → **Policies & Controls** → **Gas Sponsorship**
2. Enable **Base Sepolia** as a supported chain
3. All testnet transactions are free!

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key

# Privy
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
```

## Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## How It Works

### Authentication Flow

1. User signs up/in with Supabase (email + password)
2. On signup, a Privy user is created with a `custom_auth` linked account using the Supabase user ID
3. An embedded Ethereum wallet is automatically created for the user

### Authorized Wallet Actions

Server-side endpoints use the Supabase JWT to authorize Privy wallet operations:

```typescript
// Get session from cookies
const { data: { session } } = await supabase.auth.getSession();

// Sign message with user's wallet
await privy.wallets().ethereum().signMessage(walletId, {
  message: "hello world",
  authorization_context: {
    user_jwts: [session.access_token],
  },
});
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/create-privy-user` | Creates a Privy user with embedded wallet on signup |
| `POST /api/sign-message` | Signs "hello world" with the user's wallet |
| `POST /api/send-transaction` | Sends a sponsored 0 ETH transaction on Base Sepolia |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── create-privy-user/   # Create Privy user on signup
│   │   ├── sign-message/        # Sign message with wallet
│   │   └── send-transaction/    # Send sponsored transaction
│   └── page.tsx                 # Login UI + JWT display
├── lib/
│   ├── privy.ts                 # Privy server client
│   ├── supabase.ts              # Supabase browser client
│   └── supabase-server.ts       # Supabase server client (cookies)
```

---

## Resources

- [Privy Custom Auth Documentation](https://docs.privy.io/recipes/authentication/using-supabase-for-custom-auth)
- [Supabase JWT Signing Keys](https://supabase.com/docs/guides/auth/jwts)
- [Privy Server Wallets](https://docs.privy.io/guide/server-wallets)
