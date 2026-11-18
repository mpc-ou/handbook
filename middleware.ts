import { NextResponse, type NextRequest } from "next/server";

/** Công cụ tìm kiếm chỉ được lập chỉ mục trang chủ; mọi đường dẫn khác nhận noindex (kể cả API, ảnh OG). */
function withRobotsHeader(res: NextResponse, pathname: string) {
  if (pathname !== "/" && pathname !== "/robots.txt" && pathname !== "/sitemap.xml") {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const redirect = (to: URL) => withRobotsHeader(NextResponse.redirect(to), pathname);

  if (pathname === "/analytics") {
    return redirect(new URL("/studio/members", req.url));
  }

  // Đường dẫn cũ (mô hình Category + Article) → mô hình Course → Lesson → Item
  if (pathname.startsWith("/editor/")) {
    const id = pathname.replace("/editor/", "");
    return redirect(new URL(`/studio/items/${id || "new"}`, req.url));
  }

  if (pathname === "/studio/articles" || pathname.startsWith("/studio/articles/")) {
    return redirect(new URL(pathname.replace("/studio/articles", "/studio/items"), req.url));
  }

  // Slug cũ không map được sang cấu trúc mới, đưa về trang chủ để chọn khóa học
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return redirect(new URL("/", req.url));
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
      return redirect(loginUrl);
    }
  }

  return withRobotsHeader(NextResponse.next(), pathname);
}

export const config = {
  // Bỏ qua tệp tĩnh của Next và tài nguyên công khai; mọi thứ còn lại đi qua để gắn X-Robots-Tag
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|npc/).*)"],
};
