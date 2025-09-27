import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const item = await prisma.news.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, title: true, content: true, category: true, year: true, tags: true, createdAt: true
    }
  });
  if (!item) return notFound();

  // basit related: aynı kategori ve yıl’dan son 5 (kendisi hariç)
  const related = await prisma.news.findMany({
    where: { category: item.category, year: item.year, NOT: { id: item.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, slug: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{item.category}</Badge>
        <Badge variant="outline">{item.year}</Badge>
        <span className="ml-auto text-xs text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>
      <h1 className="text-2xl font-bold">{item.title}</h1>

      <article className="prose max-w-none prose-sm sm:prose-base">
        {/* içerik düz metin; istersen markdown parser ekleriz */}
        <p className="whitespace-pre-wrap">{item.content}</p>
      </article>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold">Benzer içerikler</div>
            <ul className="space-y-1">
              {related.map(r => (
                <li key={r.id} className="text-sm">
                  <Link className="underline underline-offset-2" href={`/news/${r.slug}`}>{r.title}</Link>
                  <span className="ml-2 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
