import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;

  // Canonical 301 redirect: www.a1score.app -> https://a1score.app
  if (host === "www.a1score.app" || host.startsWith("www.a1score.app")) {
    const url = new URL(`${pathname}${search}`, "https://a1score.app");
    return NextResponse.redirect(url, 301);
  }

  // Canonical 301 redirect: a1score.pages.dev -> https://a1score.app
  if (host === "a1score.pages.dev") {
    const url = new URL(`${pathname}${search}`, "https://a1score.app");
    return NextResponse.redirect(url, 301);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  } as any);

  // Prevent search engines from indexing any preview deployments
  if (host.includes("pages.dev")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, manifest.webmanifest
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)",
  ],
};
