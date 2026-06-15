'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RoomRedirectPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();

  useEffect(() => {
    router.replace(`/las-vegas/game/${params.code}`);
  }, [params.code, router]);

  return null;
}
