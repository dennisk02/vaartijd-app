import { NextRequest, NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// "/2fa-verify" heeft bewust geen volledige sessie nodig (tussenstap na
// wachtwoord, vóór de TOTP-code -- zie lib/session.ts' pending-cookie).
const publicRoutes = ["/login", "/2fa-verify"];
// Verplichte 2FA-instelpagina zelf -- uitgezonderd van de "stuur door naar
// /2fa-instellen"-regel hieronder, anders zou die op zichzelf blijven loopen.
const totpSetupRoute = "/2fa-instellen";

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(cookie);

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // 2FA is verplicht voor alle accounts -- een sessie zonder voltooide
  // TOTP-instelling mag nergens anders komen dan de instelpagina zelf.
  if (!isPublicRoute && session?.userId && !session.totpEnabled && path !== totpSetupRoute) {
    return NextResponse.redirect(new URL(totpSetupRoute, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|manifest.json|sw.js|icon-.*\\.png$|apple-touch-icon\\.png$).*)"],
};
