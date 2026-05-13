import { Badge } from "@/components/ui/badge";
import type { DemoSiteStatus, OutreachStatus, WebsiteStatus } from "@/lib/types";

type Status = WebsiteStatus | DemoSiteStatus | OutreachStatus | string | null | undefined;

export function StatusBadge({ status }: { status: Status }) {
  const value = status ?? "missing";
  const variant =
    value === "good_website" || value === "approved" || value === "published" || value === "sent"
      ? "default"
      : value === "weak_website" || value === "rejected"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{value.replaceAll("_", " ")}</Badge>;
}
