export function formatPipelineMetric(total: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: total >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(total);
}
