import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: Request){
  const { email, password } = await req.json();
  if(!email || !password || password.length<6) return NextResponse.json({ error:'Geçersiz veri' }, { status:400 });
  const exists = await prisma.user.findUnique({ where:{ email } });
  if(exists) return NextResponse.json({ error:'Bu e-posta kayıtlı' }, { status:409 });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data:{ email, passwordHash } });
  return NextResponse.json({ ok:true, id:user.id });
}
