import dns from "node:dns/promises";
import net from "node:net";

import type { WebsiteStatus } from "@/lib/types";

export type WebsiteCheckResult = {
  status: WebsiteStatus;
  leadScore: number;
  normalizedUrl: string | null;
  issues: string[];
};

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 120_000;

export async function checkWebsiteStatus(inputUrl: string | null | undefined): Promise<WebsiteCheckResult> {
  const normalizedUrl = normalizeWebsiteUrl(inputUrl);

  if (!normalizedUrl) {
    return {
      status: "no_website",
      leadScore: 95,
      normalizedUrl: null,
      issues: ["No website URL is listed."],
    };
  }

  let currentUrl = normalizedUrl;
  const issues: string[] = [];

  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const parsed = new URL(currentUrl);
      await assertSafePublicUrl(parsed);

      if (parsed.protocol !== "https:") {
        issues.push("Website URL does not use HTTPS.");
      }

      const response = await fetch(currentUrl, {
        headers: {
          "user-agent": "LocalBusinessMVP/1.0 (+human-reviewed demo checker)",
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        currentUrl = new URL(response.headers.get("location") ?? "", currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        return scoreIssues(["Website URL did not resolve successfully."], currentUrl, "weak_website");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return scoreIssues(["Website resolved, but did not return an HTML page."], currentUrl, "unknown");
      }

      const html = (await response.text()).slice(0, MAX_HTML_BYTES);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
      const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);

      if (!title) {
        issues.push("Website has an empty or missing title tag.");
      }
      if (!hasViewport) {
        issues.push("Website appears to be missing mobile viewport metadata.");
      }

      if (issues.length > 0) {
        return scoreIssues([...new Set(issues)], currentUrl, "weak_website");
      }

      return {
        status: "good_website",
        leadScore: 20,
        normalizedUrl: currentUrl,
        issues: ["Basic checks passed."],
      };
    }

    return scoreIssues(["Website redirects too many times."], currentUrl, "weak_website");
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Website check timed out." : "Website could not be checked safely.";
    return scoreIssues([message], currentUrl, "unknown");
  }
}

function normalizeWebsiteUrl(inputUrl: string | null | undefined) {
  const trimmed = inputUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function assertSafePublicUrl(url: URL) {
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Local URLs are not allowed.");
  }

  const records = await dns.lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Private network targets are not allowed.");
  }
}

function isPrivateAddress(address: string) {
  if (net.isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) {
      return isPrivateAddress(lower.replace("::ffff:", ""));
    }

    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80:") ||
      lower.startsWith("2001:db8:")
    );
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a >= 224 && a <= 255)
  );
}

function scoreIssues(issues: string[], normalizedUrl: string | null, status: WebsiteStatus): WebsiteCheckResult {
  const leadScore = status === "weak_website" ? 78 : 55;
  return { status, leadScore, normalizedUrl, issues };
}
