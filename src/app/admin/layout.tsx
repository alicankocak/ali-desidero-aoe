import Link from "next/link";
import { requireAdminOrModerator } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdminOrModerator();
  if (!me) redirect("/");

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Admin</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/admin/leagues" className="underline-offset-4 hover:underline">Ligler</Link>
          <Link href="/admin/fixtures" className="underline-offset-4 hover:underline">Fikstürler</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
