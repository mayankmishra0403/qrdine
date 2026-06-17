import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const sessionCookie = request.cookies.get("session")?.value;

  if (path.startsWith("/waiter") && !sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (path.startsWith("/admin") && !path.startsWith("/admin/login") && !path.startsWith("/api/")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (path.startsWith("/kitchen") && !sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (path.startsWith("/bill") && !sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (path.startsWith("/waiter-app") && !sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/waiter/:path*", "/bill/:path*", "/waiter-app/:path*"],
};
