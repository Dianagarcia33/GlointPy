export type Page = "home" | "about" | "investment" | "place" | "tech" | "contact" | "registro";
export const DARK = "#0E0D0C";
export const DARK2 = "#171614";
export const GOLD = "#D4A537";
export const ORANGE = "#B8861B";

// ─── Nav ──────────────────────────────────────────────────────────────────────
export const SERVICE_LINKS: { label: string; id: Page; color: string; desc: string }[] = [
  { label: "GLOINT Investment", id: "investment", color: GOLD, desc: "Gestión estratégica de capital digital" },
  { label: "GLOINT Place", id: "place", color: ORANGE, desc: "E-commerce de productos exclusivos" },
  { label: "GLOINT Tech", id: "tech", color: "#60a5fa", desc: "Tecnología para PyMEs" },
];

