import { redirect } from "next/navigation";

import { createServiceRoleClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const db = createServiceRoleClient();
  const { data, error } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();

  if (error || !data) {
    redirect("/awaiting-admin");
  }

  return user;
}
