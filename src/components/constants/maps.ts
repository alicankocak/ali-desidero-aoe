export const MAP_OPTIONS = [
  { value: "RANDOM",        label: "Random" },
  { value: "Arabia",        label: "Arabia" },
  { value: "Arena",         label: "Arena" },
  { value: "Afrika açık",   label: "Afrika açık" },
  { value: "Kara Orman",    label: "Kara Orman" },
  { value: "Göçebe",        label: "Göçebe" },
  { value: "Kara Göçebesi", label: "Kara Göçebesi" },
] as const;

export type MapValue = typeof MAP_OPTIONS[number]["value"];
