export type Page = "home" | "about" | "investment" | "place" | "tech" | "contact" | "registro";
export const DARK = "#0E0D0C";
export const DARK2 = "#171614";
export const GOLD = "#E8A83E";
export const ORANGE = "#B97A1A";

// ─── Nav ──────────────────────────────────────────────────────────────────────
export const SERVICE_LINKS: { label: string; id: Page; color: string; desc: string }[] = [
  { label: "GLOINT Investment", id: "investment", color: GOLD, desc: "Gestión estratégica de capital digital" },
  { label: "GLOINT Place", id: "place", color: ORANGE, desc: "E-commerce de productos exclusivos" },
  { label: "GLOINT Tech", id: "tech", color: "#C9CDD3", desc: "Tecnología para PyMEs" },
];

