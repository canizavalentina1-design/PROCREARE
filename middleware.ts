import { NextResponse, type NextRequest } from "next/server";
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("procreare_session")?.value);
  if (!hasSession) return NextResponse.redirect(new URL("/ingresar", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/", "/animales/:path*", "/pesajes/:path*", "/ventas/:path*", "/importar/:path*"] };
