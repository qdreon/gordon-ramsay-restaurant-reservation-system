import { AuthClient } from "@supabase/supabase-js";
import { redirect } from 'next/navigation';

export default async function rootPage() {
  const session = await new AuthClient();

  if (session) { redirect("/auth/login")};

  redirect("/customer/dashboard");

  //test
}
