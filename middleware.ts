import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/analytics") {
    return NextResponse.redirect(new URL("/studio/members", req.url));
  }

  if (pathname.startsWith("/editor/")) {
    const id = pathname.replace("/editor/", "");
    return NextResponse.redirect(
      new URL(`/studio/articles/${id || "new"}`, req.url)
    );
  }

  if (pathname.startsWith("/studio")) {
    const sessionToken =
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/editor/:path*", "/analytics"],
};
