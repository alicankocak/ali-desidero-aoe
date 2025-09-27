import PlayersClient from "./players-client";

async function fetchInitial() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/players?take=20`, { cache: "no-store" });
  if (!res.ok) return { total: 0, items: [] as any[] };
  return res.json();
}

export default async function PlayersPage() {
  const initial = await fetchInitial();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Oyuncular</h1>
      <PlayersClient initial={initial} />
    </section>
  );
}
