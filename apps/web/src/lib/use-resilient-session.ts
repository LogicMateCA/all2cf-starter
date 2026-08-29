import { useEffect, useState } from "react";
import { authClient, type AuthSession } from "@/lib/auth-client";

export function useResilientSession() {
  const query = authClient.useSession();
  const [stable, setStable] = useState<AuthSession | null | undefined>(query.data);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (query.data?.user) {
      setStable(query.data);
      setConfirming(false);
      return;
    }
    if (query.isPending || !stable?.user) return;
    let active = true;
    setConfirming(true);
    const timer = window.setTimeout(() => {
      void authClient.getSession().then((result) => {
        if (!active) return;
        setStable(result.data?.user ? result.data : null);
        setConfirming(false);
      }).catch(() => {
        if (active) setConfirming(false);
      });
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query.data, query.isPending, stable?.user]);

  return {
    ...query,
    data: query.data?.user ? query.data : stable,
    isPending: query.isPending || confirming,
  };
}
