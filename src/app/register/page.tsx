'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterPage(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [repeat,setRepeat]=useState('');
  const [error,setError]=useState<string|null>(null); const [ok,setOk]=useState(false);
  async function onSubmit(e:React.FormEvent){e.preventDefault();setError(null);
    if(password!==repeat){setError('Şifreler eşleşmiyor');return;}
    if(password.length<6){setError('Şifre en az 6 karakter olmalı');return;}
    const res=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!res.ok){const data=await res.json();setError(data.error||'Kayıt başarısız');return;}
    setOk(true);
  }
  return (<div className='mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow'>
    <h1 className='text-lg font-semibold'>Üye Ol</h1>
    {ok?<p className='text-sm text-green-700'>Kayıt başarılı. Giriş yapabilirsiniz.</p>:
    <form onSubmit={onSubmit} className='space-y-3'>
      <Input type='email' placeholder='E-posta' value={email} onChange={e=>setEmail(e.target.value)} />
      <Input type='password' placeholder='Şifre' value={password} onChange={e=>setPassword(e.target.value)} />
      <Input type='password' placeholder='Şifre Tekrar' value={repeat} onChange={e=>setRepeat(e.target.value)} />
      <div className='space-y-2 rounded-xl border p-3 text-xs text-gray-600'>
        <label className='flex items-center gap-2'><input type='checkbox' required/> Üyelik koşullarını kabul ediyorum.</label>
        <label className='flex items-center gap-2'><input type='checkbox' required/> KVKK/Aydınlatma metnini okudum.</label>
        <label className='flex items-center gap-2'><input type='checkbox' required/> Topluluk kurallarını kabul ediyorum.</label>
      </div>
      <Button type='submit'>Üye Ol</Button>
      {error && <p className='text-sm text-red-600'>{error}</p>}
    </form>}
  </div>);
}
