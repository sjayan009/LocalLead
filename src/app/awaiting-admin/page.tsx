import { ShieldAlert } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export default async function AwaitingAdminPage() {
  const user = await requireUser();

  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <CardTitle>Awaiting admin access</CardTitle>
          <CardDescription>
            You are signed in as {user.email}, but this dashboard is limited to approved admin users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Ask the Supabase project owner to add your user ID to the <code>admin_users</code> table. This keeps new
            signups from automatically accessing lead, payment, and outreach data.
          </p>
          <form action={signOutAction}>
            <Button variant="outline">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
