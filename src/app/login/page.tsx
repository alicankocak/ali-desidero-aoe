'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LoginPage(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function onSubmit(e:React.FormEvent){e.preventDefault();setLoading(true);setError(null);
    const res=await signIn('credentials',{redirect:false,email,password}); setLoading(false);
    if(res?.ok) window.location.href='/'; else setError('Giriş başarısız. Bilgileri kontrol edin.');
  }
  return (<div className='mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow'>
    <h1 className='text-lg font-semibold'>Giriş Yap</h1>
    <form onSubmit={onSubmit} className='space-y-3'>
      <Input type='email' placeholder='E-posta' value={email} onChange={e=>setEmail(e.target.value)} />
      <Input type='password' placeholder='Şifre' value={password} onChange={e=>setPassword(e.target.value)} />
      <Button disabled={loading} type='submit'>{loading?'Giriş yapılıyor…':'Giriş Yap'}</Button>
    </form>
    {error && <p className='text-sm text-red-600'>{error}</p>}
    <div className='text-sm'><Link href='/forgot' className='text-blue-600 hover:underline'>Şifremi unuttum</Link></div>
    <div className='text-sm text-gray-600'>Üye değilseniz <Link href='/register' className='text-blue-600 hover:underline'>üye olun</Link>.</div>
  </div>);
}
