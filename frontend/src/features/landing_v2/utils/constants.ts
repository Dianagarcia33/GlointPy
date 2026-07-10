export type Page = "home" | "about" | "investment" | "place" | "tech" | "contact" | "registro";
export const DARK = "#0d1526";
export const DARK2 = "#111827";
export const GOLD = "#C59B4E";
export const ORANGE = "#F97316";

// ─── Nav ──────────────────────────────────────────────────────────────────────
export const SERVICE_LINKS: { label: string; id: Page; color: string; desc: string }[] = [
  { label: "GLOINT Investment", id: "investment", color: GOLD, desc: "Gestión estratégica de capital digital" },
  { label: "GLOINT Place", id: "place", color: ORANGE, desc: "E-commerce de productos exclusivos" },
  { label: "GLOINT Tech", id: "tech", color: "#60a5fa", desc: "Tecnología para PyMEs" },
];

