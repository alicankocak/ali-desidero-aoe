"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Row = { id:string; name:string; mp:number; w:number; d:number; l:number; gw:number; gl:number; pts:number };

export default function LeagueClient(){
  const [league,setLeague]=useState<"LIG1"|"LIG2">("LIG1");
  const [season,setSeason]=useState("2025-1");
  const [rows,setRows]=useState<Row[]>([]);

  async function load(){
    const q=new URLSearchParams({ league, season });
    const r=await fetch(`/api/standings?`+q.toString(),{cache:"no-store"});
    const d=await r.json();
    setRows(d.rows||[]);
  }
  useEffect(()=>{ load(); },[league,season]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Lig</span>
            <Select value={league} onValueChange={(v:any)=>setLeague(v)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LIG1">Lig 1</SelectItem>
                <SelectItem value="LIG2">Lig 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sezon</span>
            <Select value={season} onValueChange={(v:any)=>setSeason(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-1">2025 - 1</SelectItem>
                <SelectItem value="2025-2">2025 - 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Oyuncu</TableHead>
              <TableHead>O</TableHead>
              <TableHead>G</TableHead>
              <TableHead>B</TableHead>
              <TableHead>M</TableHead>
              <TableHead>GW</TableHead>
              <TableHead>GL</TableHead>
              <TableHead>P</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r,i)=>(
              <TableRow key={r.id}>
                <TableCell>{i+1}</TableCell>
                <TableCell><a href={`/players/${r.id}`} className="underline">{r.name}</a></TableCell>
                <TableCell>{r.mp}</TableCell>
                <TableCell>{r.w}</TableCell>
                <TableCell>{r.d}</TableCell>
                <TableCell>{r.l}</TableCell>
                <TableCell>{r.gw}</TableCell>
                <TableCell>{r.gl}</TableCell>
                <TableCell className="font-semibold">{r.pts}</TableCell>
              </TableRow>
            ))}
            {rows.length===0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-6 text-gray-500">Kayıt yok.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
