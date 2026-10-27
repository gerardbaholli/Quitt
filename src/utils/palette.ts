/** Color palettes; the colors themselves live in index.css under [data-palette="<id>"] */
export const PALETTES = [
  // dark
  { id: "grafite", name: "Grafite" },
  { id: "ardesia", name: "Ardesia" },
  { id: "salvia", name: "Salvia" },
  { id: "ambra", name: "Ambra" },
  { id: "prugna", name: "Prugna" },
  { id: "giornata", name: "Giornata" },
  // light
  { id: "carta", name: "Carta" },
  { id: "nebbia", name: "Nebbia" },
  { id: "foglia", name: "Foglia" },
  { id: "sabbia", name: "Sabbia" },
  { id: "cipria", name: "Cipria" },
  { id: "lavanda", name: "Lavanda" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

const STORAGE_KEY = "quitt-palette";

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
