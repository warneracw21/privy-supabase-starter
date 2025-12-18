import { NextRequest, NextResponse } from "next/server";
import { privy } from "@/lib/privy";

export async function POST(request: NextRequest) {
  try {
    const { sub, email } = await request.json();

    if (!sub) {
      return NextResponse.json(
        { error: "Missing sub claim" },
        { status: 400 }
      );
    }

    const privyUser = await privy.users().create({
      linked_accounts: [
        {
          type: "custom_auth",
          custom_user_id: sub,
        },
      ],
      wallets: [
        {
          chain_type: "ethereum",
        }
      ]
    });

    return NextResponse.json({ success: true, privyUser });
  } catch (error) {
    console.error("Error creating Privy user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Privy user" },
      { status: 500 }
    );
  }
}

