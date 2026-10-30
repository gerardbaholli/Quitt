/** Color palettes; the colors themselves live in index.css under [data-palette="<id>"] */
export const PALETTES = [
  { id: "grafite", name: "Grafite", tone: "dark" },
  { id: "ardesia", name: "Ardesia", tone: "dark" },
  { id: "salvia", name: "Salvia", tone: "dark" },
  { id: "ambra", name: "Ambra", tone: "dark" },
  { id: "prugna", name: "Prugna", tone: "dark" },
  { id: "giornata", name: "Giornata", tone: "dark" },
  { id: "carta", name: "Carta", tone: "light" },
  { id: "nebbia", name: "Nebbia", tone: "light" },
  { id: "foglia", name: "Foglia", tone: "light" },
  { id: "sabbia", name: "Sabbia", tone: "light" },
  { id: "cipria", name: "Cipria", tone: "light" },
  { id: "lavanda", name: "Lavanda", tone: "light" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

const STORAGE_KEY = "quitt-palette";

export function getTone(id: PaletteId): "dark" | "light" {
  return PALETTES.find((p) => p.id === id)!.tone;
}

export function loadPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = PALETTES.find((p) => p.id === saved);
    if (match) return match.id;
  } catch {
    // ignore
  }
  return PALETTES[0].id;
}

export function savePalette(id: PaletteId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable: choice lasts for this session only
  }
}
