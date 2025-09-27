"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function ConfirmDelete({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/leagues/${leagueId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Silme başarısız.");
        return;
      }
      setOpen(false);
      router.replace("/admin/leagues");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Ligi Sil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ligi silmek istediğine emin misin?</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <b>{leagueName}</b> ligini siliyorsun. Bu işlem aşağıdakileri de kaldırır:
          </p>
          <ul className="list-disc pl-5">
            <li>Bağlı <b>sezonlar</b></li>
            <li>Sezon <b>üyelikleri</b></li>
            <li>Tüm <b>maçlar</b> (fikstür)</li>
            <li>(Varsa) <b>Fixture</b> kayıtları</li>
          </ul>
          <p className="mt-2">Geri alınamaz.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Siliniyor…" : "Evet, Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
