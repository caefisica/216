import type { CopyCondition, CopyOrigin, CopyStatus, Location } from "./types";

export const ORIGIN_LABELS: Record<CopyOrigin, string> = {
  original: "Original",
  copy: "Copia",
};

export const STATUS_LABELS: Record<CopyStatus, string> = {
  present: "En estante",
  maintenance: "En mantenimiento",
  missing: "Extraviado",
};

export const CONDITION_LABELS: Record<CopyCondition, string> = {
  good: "Bueno",
  fair: "Regular",
  poor: "Deteriorado",
};

export function locationLabel(
  location: Pick<Location, "cabinet" | "shelf" | "bay">,
  categoryCode?: string | null,
) {
  const place = `${location.cabinet} · estante ${location.shelf} · tramo ${location.bay}`;
  return categoryCode ? `${place} (${categoryCode})` : place;
}

export function availabilityLabel(lendable: number, total: number) {
  if (total === 0) return "Sin ejemplares";
  if (lendable === 0) return "No disponible";
  return total === 1 ? "Disponible" : `Disponible ${lendable}/${total}`;
}
