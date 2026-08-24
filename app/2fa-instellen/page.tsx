import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, totpQrSvgDataUrl } from "@/lib/totp";
import { TotpSetupForm } from "@/components/totp-setup-form";

/**
 * Verplichte 2FA-instelpagina -- proxy.ts stuurt elke gebruiker met
 * `totpEnabled=false` hierheen (behalve op deze pagina zelf). Genereert bij
 * eerste bezoek een onbevestigd secret (totpSecretPending) en toont de QR;
 * bij een tweede bezoek (bv. na verversen) wordt hetzelfde secret hergebruikt
 * i.p.v. een nieuwe QR te tonen die niet meer bij een reeds gescand secret
 * past.
 */
export default async function TotpSetupPage() {
  const user = await getUser();

  let secret = (await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecretPending: true } }))
    ?.totpSecretPending;

  if (!secret) {
    secret = generateTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecretPending: secret } });
  }

  const qrDataUrl = await totpQrSvgDataUrl(secret, user.email);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-red-800">Vaartijd</h1>
        <p className="mb-4 text-sm text-slate-500">
          2-staps-verificatie is verplicht. Scan onderstaande QR-code met je authenticator-app
          (bv. Google of Microsoft Authenticator).
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR-code voor 2FA-instelling" className="mx-auto mb-4 h-48 w-48" />
        <p className="mb-4 break-all rounded-lg bg-slate-100 p-2 text-center text-xs text-slate-500">
          Kan je niet scannen? Voer handmatig in: <span className="font-mono">{secret}</span>
        </p>
        <TotpSetupForm />
      </div>
    </main>
  );
}
