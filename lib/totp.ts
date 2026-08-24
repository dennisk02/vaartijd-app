import "server-only";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

/**
 * TOTP-2FA (§ scoped-admin/2FA-plan) -- authenticator-app-gebaseerd (Google/
 * Microsoft Authenticator e.d.), 6 cijfers, 30-seconden periode, SHA1 (de
 * standaard-combinatie die elke authenticator-app ondersteunt). QR wordt als
 * SVG gegenereerd (niet PNG/canvas) om elke native dependency te vermijden --
 * relevant gezien de bestaande Windows/Prisma-DLL-valkuil in dit project.
 */

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function buildTotp(secret: string, email: string) {
  return new OTPAuth.TOTP({
    issuer: "Vaartijd",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
}

/** SVG-QR als data-URL, klaar om direct in een <img src=...> te zetten. */
export async function totpQrSvgDataUrl(secret: string, email: string): Promise<string> {
  const otpauthUrl = buildTotp(secret, email).toString();
  const svg = await QRCode.toString(otpauthUrl, { type: "svg" });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** ±1 stap (~30s) tolerantie voor kloksynchronisatieverschillen. */
export function verifyTotpToken(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = buildTotp(secret, "");
  return totp.validate({ token, window: 1 }) !== null;
}
