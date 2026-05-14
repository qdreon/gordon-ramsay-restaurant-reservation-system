import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const auth = await getApiAuthContext(request);

  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json(
    {
      user: auth.user,
      role: auth.role,
    },
    { status: 200 },
  );
}
