type Props = { civ?: string | null; className?: string };

const map: Record<string, string> = {
  Mayans: "🦅",
  Huns: "🏹",
  Aztecs: "🐍",
  Vikings: "🛶",
  Franks: "⚜️",
  Mongols: "🏇",
  Britons: "🛡️",
  Chinese: "🐉",
  Teutons: "✝️",
  Byzantines: "🦅",
};

export default function CivIcon({ civ, className }: Props){
  const k = civ ?? "";
  const emoji = map[k] ?? "🏰";
  return <span className={className} title={civ ?? "-"}>{emoji}</span>;
}
