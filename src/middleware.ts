import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.method === "GET" || request.method === "HEAD") {
    const response = NextResponse.next();
    const token = request.cookies.get("session")?.value ?? null;
    if (token !== null) {
      response.cookies.set("session", token, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  }

  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");
  if (!origin || !host) {
    return new NextResponse(null, { status: 403 });
  }
  try {
    if (new URL(origin).host !== host) {
      return new NextResponse(null, { status: 403 });
    }
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
