"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function Home() {
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Lig Tablosu</h1>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <CardTitle className="text-base">shadcn/ui test</CardTitle>
          <Button
            onClick={() =>
              toast({
                title: "Merhaba!",
                description: "shadcn/ui kurulumun başarılı 🎉",
              })
            }
          >
            Bildirim Göster
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
