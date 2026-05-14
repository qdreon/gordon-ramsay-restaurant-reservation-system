import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/authGuards";

export async function GET() {
  try {
    const { user, profile } = await getServerAuthContext();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
        },
        profile,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve current user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
