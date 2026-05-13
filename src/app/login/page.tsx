import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";

import { signInAction, signUpAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; mode?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle>{params.mode === "signup" ? "Create account" : "Sign in"}</CardTitle>
          <CardDescription>Use Supabase Auth to access the lead dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            {params.error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>{params.mode === "signup" ? "Sign up failed" : "Sign in failed"}</AlertTitle>
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            ) : null}
            {params.message ? (
              <Alert className="mb-4">
                <AlertTitle>Next step</AlertTitle>
                <AlertDescription>{params.message}</AlertDescription>
              </Alert>
            ) : null}
          </Suspense>
          <form action={params.mode === "signup" ? signUpAction : signInAction} className="grid gap-4">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={params.mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </div>
            <Button type="submit">{params.mode === "signup" ? "Create account" : "Sign in"}</Button>
          </form>
          <div className="text-muted-foreground mt-4 text-sm">
            {params.mode === "signup" ? (
              <>
                Already have an account?{" "}
                <a className="text-foreground underline" href={`/login?next=${encodeURIComponent(params.next ?? "/dashboard")}`}>
                  Sign in
                </a>
                .
              </>
            ) : (
              <>
                No account yet?{" "}
                <a
                  className="text-foreground underline"
                  href={`/login?mode=signup&next=${encodeURIComponent(params.next ?? "/dashboard")}`}
                >
                  Create one
                </a>
                .
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
