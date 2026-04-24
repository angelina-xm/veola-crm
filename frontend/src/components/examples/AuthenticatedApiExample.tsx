"use client";

/**
 * Пример: любой доменный метод из `@/src/lib/api` уже использует `fetchWithAuth`
 * (заголовки Authorization + X-Company-ID, обработка 401 + refresh).
 * Можно также вызывать `fetchWithAuth` напрямую для произвольных путей.
 */

import { useEffect, useState } from "react";
import { fetchWithAuth, getDeals } from "@/src/lib/api";

type Props = {
  companyId: number;
};

export function AuthenticatedApiExample({ companyId }: Props) {
  const [viaHelper, setViaHelper] = useState<string>("loading…");
  const [viaRaw, setViaRaw] = useState<string>("loading…");

  useEffect(() => {
    getDeals(companyId)
      .then((data) => setViaHelper(JSON.stringify(data).slice(0, 200)))
      .catch((e) => setViaHelper(String(e)));

    fetchWithAuth("/deals/", { method: "GET" }, companyId)
      .then(async (res) => {
        const json = await res.json();
        setViaRaw(JSON.stringify(json).slice(0, 200));
      })
      .catch((e) => setViaRaw(String(e)));
  }, [companyId]);

  return (
    <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
      <p>
        <span className="font-semibold">getDeals(companyId):</span> {viaHelper}
      </p>
      <p>
        <span className="font-semibold">fetchWithAuth(&quot;/deals/&quot;):</span>{" "}
        {viaRaw}
      </p>
    </div>
  );
}
