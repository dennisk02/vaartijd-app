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

type AfasConfig = {
  token: string;
  baseUrl: string;
};

function getAfasConfig(): AfasConfig | null {
  const environmentId = process.env.AFAS_ENVIRONMENT_ID;
  const token = process.env.AFAS_TOKEN;
  if (!environmentId || !token) return null;

  const baseUrl = process.env.AFAS_BASE_URL || `https://${environmentId}.rest.afas.online/ProfitRestServices`;
  return { token, baseUrl };
}

export function isAfasConfigured() {
  return getAfasConfig() !== null;
}

/**
 * @param path Pad relatief aan de ProfitRestServices-basis-URL, bv.
 *   `connectors/MijnConnector` of `metainfo/update/MijnConnector`.
 */
export async function afasFetch(path: string, options: { method: "GET" | "POST"; body?: unknown }) {
  const config = getAfasConfig();
  if (!config) {
    throw new AfasApiError("AFAS-koppeling is niet geconfigureerd (AFAS_ENVIRONMENT_ID / AFAS_TOKEN ontbreken).");
  }

  const url = `${config.baseUrl}/${path}`;
  const response = await fetch(url, {
    method: options.method,
    headers: {
      Authorization: `AfasToken ${config.token}`,
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
