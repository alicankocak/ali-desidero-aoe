"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CommentsPanel({ params }: { params: { id:string } }){
  const matchId = params.id;
  const [items,setItems]=useState<Array<{id:string; author:string; body:string; createdAt:string}>>([]);
  const [me,setMe]=useState<{name?:string}|null>(null);
  const [text,setText]=useState("");

  async function load(){
    const r=await fetch(`/api/matches/${matchId}/comments`,{cache:"no-store"});
    const d=await r.json();
    setItems(d.items||[]);
  }
  useEffect(()=>{ load(); },[matchId]);

  useEffect(()=>{
    fetch("/api/auth/session").then(r=>r.json()).then(s=>{
      setMe(s?.user ? { name: s.user.name || s.user.email } : null);
    });
  },[]);

  async function send(){
    const r=await fetch(`/api/matches/${matchId}/comments`,{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ body: text })
    });
    const d=await r.json();
    if(d?.ok){ setText(""); load(); } else alert(d?.error||"Hata");
  }

  return (
    <div className="p-3">
      <div className="mb-2 text-sm text-gray-600">Sohbet</div>
      <div className="flex flex-col gap-2">
        {items.map(c=>(
          <div key={c.id} className="rounded-xl bg-gray-100 p-2">
            <div className="text-xs text-gray-500">{c.author} • {new Date(c.createdAt).toLocaleTimeString("tr-TR")}</div>
            <div className="text-sm">{c.body}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-xs text-gray-500">Mesaj yok.</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <Input placeholder={me?.name ? `${me.name} olarak yaz...` : "Yorum için giriş yap"} value={text} onChange={e=>setText(e.target.value)} disabled={!me} />
        <Button onClick={send} disabled={!me || !text.trim()}>Gönder</Button>
      </div>
    </div>
  );
}
