'use client';
export default function FormError({message}){ if(!message) return null; return <div role='alert'>{message}</div>; }

