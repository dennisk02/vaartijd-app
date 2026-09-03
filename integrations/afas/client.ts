import "server-only";

export class AfasApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message);
    this.name = "AfasApiError";
    this.status = options?.status;
    this.body = options?.body;
  }
}

/**
 * AFAS geeft bij een 500 op een UpdateConnector vaak een bruikbare
 * `externalMessage` terug in de responsbody (bv. "De ingevulde waarde bij
 * 'Projectgroep' bestaat niet.", bevestigd via een live test, 2 sep 2026) --
 * veel specifieker dan de generieke "AFAS-aanroep mislukt (HTTP 500)."
 * Gebruik dit i.p.v. `error.message` bij het opslaan van een sync-foutmelding
 * zodat een admin direct weet wát er mis is.
 */
export function afasErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AfasApiError)) return fallback;
  const body = error.body as { externalMessage?: string } | undefined;
  return body?.externalMessage ? `${error.message} ${body.externalMessage}` : error.message;
}

type AfasConfig = {
  /** Ruwe omgevingscode zoals ingevuld, bv. "T36369AA" (voor logging). */
  environmentCode: string;
  /** Alleen de cijfers uit de omgevingscode -- dát is wat AFAS in de
   * REST-hostname verwacht (`<cijfers>.<resthost>.afas.online`), niet de
   * volledige code met voorvoegsel/suffix. Het voorvoegsel geeft het
   * omgevingstype aan (O=Productie, T=Test, A=Acceptatie) en telt niet mee
   * in de hostnaam zelf -- het bepaalt wél wélk deel van de hostnaam
   * (`rest`/`resttest`/...) gebruikt moet worden, zie `restHost`. */
  environmentNumber: string;
  /** Het hostname-segment vóór ".afas.online" -- verschilt per
   * omgevingstype. Bevestigd via AFAS' eigen testtool (connect.afas.nl/
   * tools/restget), die voor een Test-omgeving (T-voorvoegsel) een cURL-
   * voorbeeld met `resttest.afas.online` toont i.p.v. het (Productie-)
   * `rest.afas.online` dat hier eerder altijd werd gebruikt -- dat verschil
   * was de daadwerkelijke oorzaak van de aanhoudende "Unknown AppConnector"-
   * fout (27 aug 2026, na live vergelijking met een screenshot van die tool).
   * Alleen O en T zijn op deze manier bevestigd; A/overige voorvoegsels
   * vallen terug op "rest" met een waarschuwing, niet gefabriceerd. */
  restHost: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
};

function restHostFor(envType: string): string {
  if (envType === "O") return "rest";
  if (envType === "T") return "resttest";
  console.warn(
    `AFAS-omgevingsvoorvoegsel "${envType}" heeft geen bevestigde REST-hostnaam (alleen O->rest en T->resttest ` +
      `zijn bevestigd via connect.afas.nl/tools/restget) -- valt terug op "rest", controleer dit expliciet als de ` +
      `verbinding faalt.`
  );
  return "rest";
}

function getAfasConfig(): AfasConfig | null {
  const environmentCode = process.env.AFAS_ENVIRONMENT_ID;
  const clientId = process.env.AFAS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.AFAS_OAUTH_CLIENT_SECRET;
  if (!environmentCode || !clientId || !clientSecret) return null;

  const environmentNumber = environmentCode.replace(/\D/g, "");
  if (!environmentNumber) return null;

  // Zichtbaar in de serverlogs welk omgevingstype actief is -- vooral
  // belangrijk zolang dit een T(est)-omgeving is: uren komen dan niet in de
  // echte/productie-AFAS-boekhouding terecht.
  const envType = environmentCode.trim().charAt(0).toUpperCase();
  if (envType !== "O") {
    console.warn(
      `AFAS-omgevingscode "${environmentCode}" is geen Productie-omgeving (voorvoegsel "${envType}", ` +
        `verwacht "O"). Uren komen dus niet in de echte AFAS-boekhouding terecht.`
    );
  }
  const restHost = restHostFor(envType);

  const baseUrl = process.env.AFAS_BASE_URL || `https://${environmentNumber}.${restHost}.afas.online/profitrestservices`;
  return { environmentCode, environmentNumber, restHost, clientId, clientSecret, baseUrl };
}

export function isAfasConfigured() {
  return getAfasConfig() !== null;
}

/**
 * OAuth2 client-credentials-token, in-memory gecached (proces-breed, dus
 * per server-instance) totdat het bijna verloopt -- AFAS-tokens zijn
 * doorgaans ~1 uur geldig. Ingericht door Royaal/Willem van Melis
 * (24 aug 2026), zie e-mail-uitleg in HANDOVER.md §10.1.
 *
 * LET OP: het exacte request-formaat hieronder (form-urlencoded,
 * grant_type=client_credentials) volgt de RFC 6749-standaard voor OAuth2
 * client-credentials, die AFAS zelf noemt te gebruiken -- maar is niet
 * regel-voor-regel geverifieerd tegen AFAS' eigen (JS-gerenderde, niet
 * scrapebare) technische documentatie. Verifieer dit via
 * `testAfasConnection()` vóórdat hier op vertrouwd wordt voor echte
 * urenexport.
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: AfasConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const tokenUrl = `https://${config.environmentNumber}.${config.restHost}.afas.online/profitrestservices/oauth/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // AFAS geeft bij fouten soms platte tekst terug.
  }

  if (!response.ok) {
    throw new AfasApiError(`AFAS OAuth-token ophalen mislukt (HTTP ${response.status}).`, {
      status: response.status,
      body: parsedBody,
    });
  }

  const data = parsedBody as { access_token?: string; expires_in?: number } | null;
  if (!data?.access_token) {
    throw new AfasApiError("AFAS OAuth-respons bevat geen access_token.", { body: parsedBody });
  }

  cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

/**
 * @param path Pad relatief aan de ProfitRestServices-basis-URL, bv.
 *   `connectors/PtRealisation` of `metainfo/update/PtRealisation`.
 */
export async function afasFetch(path: string, options: { method: "GET" | "POST"; body?: unknown }) {
  const config = getAfasConfig();
  if (!config) {
    throw new AfasApiError(
      "AFAS-koppeling is niet geconfigureerd (AFAS_ENVIRONMENT_ID / AFAS_OAUTH_CLIENT_ID / AFAS_OAUTH_CLIENT_SECRET ontbreken)."
    );
  }

  const token = await getAccessToken(config);
  const url = `${config.baseUrl}/${path}`;
  const response = await fetch(url, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // AFAS geeft bij fouten soms platte tekst terug in plaats van JSON.
  }

  if (!response.ok) {
    throw new AfasApiError(`AFAS-aanroep mislukt (HTTP ${response.status}).`, {
      status: response.status,
      body: parsedBody,
    });
  }

  return parsedBody;
}

/**
 * Lichte verbindingstest: haalt de metadata van de ingestelde uren-connector op.
 * Dit vereist geen kennis van de exacte veldnamen en werkt dus al voordat
 * de precieze koppeling (mapTimeEntryToAfas) is afgestemd.
 */
export async function testAfasConnection() {
  const connector = process.env.AFAS_HOURS_CONNECTOR;
  if (!connector) {
    throw new AfasApiError("AFAS_HOURS_CONNECTOR is niet ingesteld.");
  }
  return afasFetch(`metainfo/update/${connector}`, { method: "GET" });
}
