import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaguesPage(){
  const leagues = await prisma.leagueTable.findMany({
    orderBy: { createdAt: "desc" },
    include: { seasons: { orderBy: { startAt: "desc" } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Ligler</h2>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href="/admin/leagues/new">Lig Oluştur</Link>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Lig</th>
              <th className="px-3 py-2">Oyuncu Sayısı</th>
              <th className="px-3 py-2">Aktif Sezon</th>
              <th className="px-3 py-2">Sezon Adedi</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map(l => {
              const active = l.seasons.find(s=>s.isActive);
              const playerCount = active ? active.memberships?.length ?? 0 : 0;
              return (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2">{l.name} {l.isActive ? "" : <span className="text-xs text-muted-foreground">(pasif)</span>}</td>
                  <td className="px-3 py-2 text-center">{playerCount}</td>
                  <td className="px-3 py-2 text-center">{active?.label ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{l.seasons.length}</td>
                  <td className="px-3 py-2 text-center">
                    <Link href={`/admin/leagues/${l.id}/edit`} className="underline underline-offset-4 hover:no-underline">Düzenle</Link>
                  </td>
                </tr>
              );
            })}
            {leagues.length===0 && (
              <tr><td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>Kayıt yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
