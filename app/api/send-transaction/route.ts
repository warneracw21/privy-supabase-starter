import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { privy } from "@/lib/privy";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BASE_SEPOLIA_CAIP2 = "eip155:84532";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const privyAccessToken = authHeader?.replace("Bearer ", "");

    if (!privyAccessToken) {
      return NextResponse.json(
        { error: "Missing Privy access token" },
        { status: 401 }
      );
    }

    // Get the Supabase session from cookies to get user ID
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the Privy user by their custom auth ID (Supabase user ID)
    const privyUser = await privy.users().getByCustomAuthID({ custom_user_id: session.user.id });

    if (!privyUser) {
      return NextResponse.json(
        { error: "Privy user not found" },
        { status: 404 }
      );
    }

    // Find the user's embedded wallet
    const wallet = privyUser.linked_accounts.find(
      (account) => account.type === "wallet" && "wallet_client" in account && account.wallet_client === "privy"
    );

    if (!wallet || wallet.type !== "wallet" || !("id" in wallet)) {
      return NextResponse.json(
        { error: "No embedded wallet found" },
        { status: 404 }
      );
    }

    const walletId = (wallet as { id: string }).id;

    // Send 0 ETH to the zero address on Base Sepolia
    const result = await privy.wallets().ethereum().sendTransaction(walletId, {
      sponsor: true,
      params: {
        transaction: {
          to: ZERO_ADDRESS,
          value: "0x0",
        },
      },
      caip2: BASE_SEPOLIA_CAIP2,
      authorization_context: {
        user_jwts: [privyAccessToken],
      },
    });

    return NextResponse.json({
      success: true,
      transactionHash: result.hash,
      walletAddress: wallet.address,
      chain: BASE_SEPOLIA_CAIP2,
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send transaction" },
      { status: 500 }
    );
  }
}
