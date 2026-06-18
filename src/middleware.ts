import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: NextRequest): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const now = Date.now();
  const record = ipRequests.get(ip);

  if (!record || now > record.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  record.count++;
  return record.count > RATE_LIMIT_MAX;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isRateLimited(request)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const sessionCookie = request.cookies.get("session")?.value;

  const protectedPaths = ["/admin", "/kitchen", "/waiter-app"];
  const needsAuth = protectedPaths.some(
    (p) => path.startsWith(p) && !path.startsWith("/admin/login") && !path.startsWith("/api/")
  );

  if (needsAuth && !sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/waiter-app/:path*"],
};
