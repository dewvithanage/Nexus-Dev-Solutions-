import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// Returns the currently logged-in user (from the session cookie), or null.
// Client components use this instead of reading localStorage.
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.name,
      email: user.email,
      businessName: user.entrepreneurProfile?.business?.businessName ?? null,
      status: user.entrepreneurProfile?.status ?? null,
    },
  });
}
