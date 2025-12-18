import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { privy } from "@/lib/privy";

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

    // Sign the message using the Privy wallet
    const message = "hello world";
    const walletId = (wallet as { id: string }).id;
    const signature = await privy.wallets().ethereum().signMessage(walletId, {
      message,
      authorization_context: {
        user_jwts: [privyAccessToken],
      },
    });

    return NextResponse.json({
      success: true,
      message,
      signature: signature.signature,
      walletAddress: wallet.address,
    });
  } catch (error) {
    console.error("Error signing message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign message" },
      { status: 500 }
    );
  }
}
