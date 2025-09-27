import PlayerClient from "./player-client";

async function getData(id: string){
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/players/${id}`, { cache: "no-store" });
  if(!res.ok) return null;
  return res.json();
}

export default async function PlayerPage({ params }: { params: { id: string } }){
  const data = await getData(params.id);
  if(!data) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Oyuncu</h1>
        <div className="rounded-xl border bg-white p-4">Oyuncu bulunamadı.</div>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{data.player.displayName}</h1>
      <PlayerClient initial={data} />
    </section>
  );
}
