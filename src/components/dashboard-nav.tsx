import Link from "next/link";
import { Building2, FileUp, LayoutDashboard, Plus, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/discover", label: "Discover", icon: Search },
  { href: "/dashboard/businesses", label: "Businesses", icon: Building2 },
  { href: "/dashboard/businesses/new", label: "New Lead", icon: Plus },
  { href: "/dashboard/import", label: "Import", icon: FileUp },
];

export function DashboardNav() {
  return (
    <aside className="border-border bg-card/60 flex min-h-svh w-full flex-col border-r px-4 py-5 md:w-64">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-5 w-5" />
        LocalLead MVP
      </Link>
      <nav className="grid gap-1">
        {links.map((link) => (
          <Button key={link.href} asChild variant="ghost" className="justify-start">
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          </Button>
        ))}
      </nav>
      <form action={signOutAction} className="mt-auto pt-6">
        <Button variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </aside>
  );
}
