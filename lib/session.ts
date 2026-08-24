import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/// Tussenstap-cookie voor "wachtwoord goed, TOTP-code nog nodig" -- bewust
/// een aparte, kortlevende cookie i.p.v. de volledige sessie, zodat iemand
/// zonder geldige 2FA-code geen toegang tot de app krijgt (zie proxy.ts en
/// lib/actions/auth.ts). Draagt bewust geen `role` -- pas na een geverifieerde
/// code wordt de echte sessie aangemaakt.
const PENDING_TOTP_COOKIE = "2fa_pending";
const PENDING_TOTP_DURATION_MS = 5 * 60 * 1000;

function getEncodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ontbreekt in de omgevingsvariabelen.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "EMPLOYEE" | "ADMIN";
  /// Of deze gebruiker TOTP-2FA al volledig heeft ingesteld. Zit in de sessie
  /// (i.p.v. een losse DB-call) zodat proxy.ts zonder databasetoegang kan
  /// afdwingen dat iedereen zonder 2FA naar /2fa-instellen gestuurd wordt.
  totpEnabled: boolean;
};

export type PendingTotpPayload = {
  userId: string;
};

async function signPayload(payload: object, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getEncodedKey());
}

async function verifyPayload<T>(token: string | undefined = ""): Promise<(T & { exp: number; iat: number }) | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as T & { exp: number; iat: number };
  } catch {
    return null;
  }
}

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return signPayload(payload, expiresAt);
}

export async function decrypt(session: string | undefined = "") {
  return verifyPayload<SessionPayload>(session);
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await signPayload(payload, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionPayload() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(session);
}

/** Tussenstap na correct wachtwoord, in afwachting van de TOTP-code. */
export async function createPendingTotpSession(payload: PendingTotpPayload) {
  const expiresAt = new Date(Date.now() + PENDING_TOTP_DURATION_MS);
  const token = await signPayload(payload, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(PENDING_TOTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getPendingTotpSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_TOTP_COOKIE)?.value;
  return verifyPayload<PendingTotpPayload>(token);
}

export async function clearPendingTotpSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_TOTP_COOKIE);
}

export { SESSION_COOKIE };
