/** Storage path veya URL → imzalı erişim linki */
export async function imzaliUrl(
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (
          path: string,
          expiresIn: number
        ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
      };
    };
  },
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresIn = 60 * 60
): Promise<string | null> {
  if (!pathOrUrl) return null;
  // Eski public URL kayıtları: doğrudan kullan (imza gerekmez)
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function imzaliUrlHaritasi(
  supabase: Parameters<typeof imzaliUrl>[0],
  bucket: string,
  paths: (string | null | undefined)[],
  expiresIn = 60 * 60
): Promise<Record<string, string>> {
  const tekil = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const entries = await Promise.all(
    tekil.map(async (p) => {
      const url = await imzaliUrl(supabase, bucket, p, expiresIn);
      return [p, url ?? ""] as const;
    })
  );
  return Object.fromEntries(entries.filter(([, url]) => Boolean(url)));
}
