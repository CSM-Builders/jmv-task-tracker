import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabaseConfigured)
    return <DashboardShell mode="demo" userEmail="demo@local" />;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return (
    <DashboardShell
      mode="supabase"
      userEmail={data.user.email ?? "Signed-in user"}
    />
  );
}
