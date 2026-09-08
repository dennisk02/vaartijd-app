/**
 * Simpele, uitlegbare afwijkingsdetectie voor de rapportages (§ n.a.v.
 * "afwijkt van de trend"-verzoek, sep 2026) -- bewust gewone lineaire
 * regressie i.p.v. een zwaarder tijdreeksmodel: genoeg om te herkennen
 * welke punten duidelijk uit de pas lopen, en voor een admin-dashboard
 * beter uit te leggen dan een black-box-model. Toont zelf geen
 * voorspellingslijn (op verzoek verwijderd, sep 2026) -- alleen de
 * afwijkingen.
 */

export type TrendAnalysis = {
  /** Trendwaarde per bestaand punt, zelfde lengte als de input. */
  trendLine: number[];
  /** Indexen (in de input) die significant afwijken van de trendlijn. */
  deviations: { index: number; actual: number; expected: number }[];
};

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, x) => s + x * v, 0);
  const sumXX = values.reduce((s, _, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * `values` moet chronologisch en gelijk verdeeld in tijd zijn (bv. één
 * waarde per dag, of per maand -- geen gaten). `thresholdStdDev` bepaalt hoe
 * ver een punt van de trendlijn moet liggen (in standaardafwijkingen van de
 * residuen) voordat het als afwijkend geldt; 1,5 raakt in de praktijk de
 * duidelijke uitschieters zonder elke kleine schommeling te markeren.
 */
export function analyzeTrend(values: number[], minPoints = 4, thresholdStdDev = 1.5): TrendAnalysis {
  if (values.length < minPoints) {
    // Te weinig data voor een zinvolle afwijkingsanalyse.
    const last = values.length > 0 ? values[values.length - 1] : 0;
    return { trendLine: values.map(() => last), deviations: [] };
  }

  const { slope, intercept } = linearRegression(values);
  const trendLine = values.map((_, x) => slope * x + intercept);

  const residuals = values.map((v, i) => v - trendLine[i]);
  const meanResidual = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const variance = residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / residuals.length;
  const stdDev = Math.sqrt(variance);

  const deviations: { index: number; actual: number; expected: number }[] = [];
  if (stdDev > 0.01) {
    values.forEach((actual, i) => {
      const expected = trendLine[i];
      if (Math.abs(actual - expected) > thresholdStdDev * stdDev) {
        deviations.push({ index: i, actual, expected });
      }
    });
  }

  return { trendLine, deviations };
}
