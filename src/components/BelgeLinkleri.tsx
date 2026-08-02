"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { imzaliUrlHaritasi } from "@/lib/signed-url";
import { ExternalLink, FileText } from "lucide-react";

const BUCKET = "malzeme-belgeleri";

export function BelgeLinkleri({
  faturaUrl,
  resimUrl,
  belgeUrl,
}: {
  faturaUrl?: string | null;
  resimUrl?: string | null;
  belgeUrl?: string | null;
}) {
  const [linkler, setLinkler] = useState<Record<string, string>>({});

  useEffect(() => {
    const paths = [faturaUrl, resimUrl, belgeUrl];
    if (!paths.some(Boolean)) return;

    const supabase = createClient();
    let iptal = false;

    async function hazirla() {
      const harita = await imzaliUrlHaritasi(supabase, BUCKET, paths);
      if (!iptal) setLinkler(harita);
    }
    hazirla();
    return () => {
      iptal = true;
    };
  }, [faturaUrl, resimUrl, belgeUrl]);

  const faturaHref = (faturaUrl && linkler[faturaUrl]) || (belgeUrl && linkler[belgeUrl]) || null;
  const resimHref = resimUrl ? linkler[resimUrl] || null : null;

  if (!faturaHref && !resimHref) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {faturaHref && (
        <a
          href={faturaHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-perre-700 underline"
        >
          <FileText className="h-3.5 w-3.5" /> Fatura
        </a>
      )}
      {resimHref && (
        <a
          href={resimHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-perre-700 underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Resim
        </a>
      )}
    </div>
  );
}
