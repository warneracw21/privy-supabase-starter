"use client";

import { useState, useMemo } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { usePrivy } from "@privy-io/react-auth";

interface JwtPayload {
  sub?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  email?: string;
  role?: string;
  iss?: string;
  [key: string]: unknown;
}

function decodeJwt(token: string): { header: object; payload: JwtPayload } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const decodeBase64Url = (str: string) => {
      const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    };

    return {
      header: decodeBase64Url(parts[0]),
      payload: decodeBase64Url(parts[1]),
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const { supabase, session, loading: sessionLoading } = useSupabase();
  const { getAccessToken } = usePrivy();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<{
    signature: string;
    walletAddress: string;
    message: string;
  } | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [showRawJwt, setShowRawJwt] = useState(false);
  const [sendingTx, setSendingTx] = useState(false);
  const [txResult, setTxResult] = useState<{
    transactionHash: string;
    walletAddress: string;
    chain: string;
  } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const decodedJwt = useMemo(() => {
    if (!session?.access_token) return null;
    return decodeJwt(session.access_token);
  }, [session?.access_token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSignatureResult(null);
    setSignError(null);
    setTxResult(null);
    setTxError(null);
  };

  const handleSignMessage = async () => {
    setSigning(true);
    setSignError(null);
    setSignatureResult(null);

    try {
      const privyAccessToken = await getAccessToken();
      
      const response = await fetch("/api/sign-message", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${privyAccessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign message");
      }

      setSignatureResult({
        signature: data.signature,
        walletAddress: data.walletAddress,
        message: data.message,
      });
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Failed to sign message");
    } finally {
      setSigning(false);
    }
  };

  const handleSendTransaction = async () => {
    setSendingTx(true);
    setTxError(null);
    setTxResult(null);

    try {
      const privyAccessToken = await getAccessToken();
      
      const response = await fetch("/api/send-transaction", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${privyAccessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send transaction");
      }

      setTxResult({
        transactionHash: data.transactionHash,
        walletAddress: data.walletAddress,
        chain: data.chain,
      });
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Failed to send transaction");
    } finally {
      setSendingTx(false);
    }
  };

  // Loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  // Authenticated view - show JWT
  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
                <p className="text-purple-300/70 text-sm">{session.user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200 text-sm font-medium"
              >
                Sign out
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">Authenticated</span>
              </div>

              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white/90 font-semibold">Access Token (JWT)</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRawJwt(!showRawJwt)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                    >
                      {showRawJwt ? "Decoded" : "Raw"}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(session.access_token)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {showRawJwt ? (
                  <div className="font-mono text-xs text-purple-200/60 break-all leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {session.access_token}
                  </div>
                ) : decodedJwt ? (
                  <div className="space-y-4 max-h-64 overflow-y-auto scrollbar-thin">
                    {/* Algorithm Note */}
                    <div className={`px-3 py-2 rounded-lg text-xs ${
                      (decodedJwt.header as { alg?: string }).alg === "RS256"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    }`}>
                      <span className="font-medium">
                        {(decodedJwt.header as { alg?: string }).alg === "RS256" ? "✓ " : "⚠ "}
                        Algorithm: {(decodedJwt.header as { alg?: string }).alg}
                      </span>
                      <span className="text-white/50 ml-1">
                        — Privy requires RS256. Set in Supabase → Project Settings → API → JWT Settings → Rotate to RS256 key.
                      </span>
                    </div>

                    {/* Header */}
                    <div>
                      <h3 className="text-white/50 text-xs uppercase tracking-wide mb-2">Header</h3>
                      <pre className="font-mono text-xs text-purple-200/70 bg-black/20 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(decodedJwt.header, null, 2)}
                      </pre>
                    </div>

                    {/* Payload */}
                    <div>
                      <h3 className="text-white/50 text-xs uppercase tracking-wide mb-2">Payload</h3>
                      <pre className="font-mono text-xs text-purple-200/70 bg-black/20 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(decodedJwt.payload, null, 2)}
                      </pre>
                    </div>

                    {/* Key Claims */}
                    <div>
                      <h3 className="text-white/50 text-xs uppercase tracking-wide mb-2">Key Claims</h3>
                      <div className="grid gap-2 text-sm">
                        {decodedJwt.payload.sub && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Subject (sub)</span>
                            <span className="text-white/80 font-mono text-xs">{decodedJwt.payload.sub}</span>
                          </div>
                        )}
                        {decodedJwt.payload.email && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Email</span>
                            <span className="text-white/80 font-mono text-xs">{decodedJwt.payload.email}</span>
                          </div>
                        )}
                        {decodedJwt.payload.role && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Role</span>
                            <span className="text-white/80 font-mono text-xs">{decodedJwt.payload.role}</span>
                          </div>
                        )}
                        {decodedJwt.payload.iat && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Issued At</span>
                            <span className="text-white/80 font-mono text-xs">
                              {new Date(decodedJwt.payload.iat * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {decodedJwt.payload.exp && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Expires</span>
                            <span className="text-white/80 font-mono text-xs">
                              {new Date(decodedJwt.payload.exp * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-300 text-sm">Failed to decode JWT</div>
                )}
              </div>

              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <h2 className="text-white/90 font-semibold mb-4">Token Details</h2>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Token Type</span>
                    <span className="text-white/80 font-mono">{session.token_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Expires At</span>
                    <span className="text-white/80 font-mono">
                      {new Date(session.expires_at! * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">User ID</span>
                    <span className="text-white/80 font-mono text-xs">{session.user.id}</span>
                  </div>
                </div>
              </div>

              {/* Sign Message Section */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <h2 className="text-white/90 font-semibold mb-4">Sign Message with Privy Wallet</h2>
                
                <button
                  onClick={handleSignMessage}
                  disabled={signing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25"
                >
                  {signing ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing...
                    </span>
                  ) : (
                    'Sign "hello world"'
                  )}
                </button>

                {signError && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    {signError}
                  </div>
                )}

                {signatureResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400 text-sm font-medium">Message signed successfully!</span>
                    </div>
                    
                    <div className="grid gap-3 text-sm">
                      <div>
                        <span className="text-white/40 block mb-1">Message</span>
                        <span className="text-white/80 font-mono">{signatureResult.message}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-1">Wallet Address</span>
                        <span className="text-white/80 font-mono text-xs break-all">{signatureResult.walletAddress}</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/40">Signature</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(signatureResult.signature)}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="font-mono text-xs text-emerald-200/60 break-all leading-relaxed">
                          {signatureResult.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Send Transaction Section */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <h2 className="text-white/90 font-semibold mb-2">Send Sponsored Transaction</h2>
                <p className="text-white/40 text-xs mb-4">
                  Note: Make sure you have enabled Base Sepolia as a supported chain for gas sponsorship. All testnet transactions are free!
                </p>
                
                <button
                  onClick={handleSendTransaction}
                  disabled={sendingTx}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  {sendingTx ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send 0 ETH on Base Sepolia'
                  )}
                </button>

                {txError && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    {txError}
                  </div>
                )}

                {txResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                      <span className="text-blue-400 text-sm font-medium">Transaction sent!</span>
                    </div>
                    
                    <div className="grid gap-3 text-sm">
                      <div>
                        <span className="text-white/40 block mb-1">Chain</span>
                        <span className="text-white/80 font-mono text-xs">{txResult.chain}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-1">Wallet Address</span>
                        <span className="text-white/80 font-mono text-xs break-all">{txResult.walletAddress}</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/40">Transaction Hash</span>
                          <a
                            href={`https://sepolia.basescan.org/tx/${txResult.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            View on BaseScan ↗
                          </a>
                        </div>
                        <div className="font-mono text-xs text-blue-200/60 break-all leading-relaxed">
                          {txResult.transactionHash}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-6">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg shadow-purple-500/25">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-purple-300/60 text-sm">
              {isSignUp
                ? "Sign up to get started"
                : "Sign in to view your JWT token"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : isSignUp ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-purple-300/70 hover:text-purple-300 transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-white/30 text-xs">
          Powered by Supabase Auth + Privy
        </p>
      </div>
    </div>
  );
}
