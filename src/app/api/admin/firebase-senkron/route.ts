import { NextResponse } from "next/server";
import { getOturum } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firebaseYapilandirilmis, getFirebaseDb } from "@/lib/firebase-admin";
import { YEDEK_TABLOLAR } from "@/lib/yedek-tablolar";

/** Tüm yedek tablolarını Firebase'e toplu yazar (admin). */
export async function POST() {
  const oturum = await getOturum();
  if (!oturum?.profil || oturum.profil.rol !== "admin") {
    return NextResponse.json({ ok: false, hata: "Yetkisiz" }, { status: 401 });
  }

  if (!firebaseYapilandirilmis()) {
    return NextResponse.json(
      {
        ok: false,
        hata: "FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY eksik",
      },
      { status: 503 }
    );
  }

  const db = getFirebaseDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, hata: "Firebase başlatılamadı" },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const ozet: { tablo: string; adet: number }[] = [];

  for (const tablo of YEDEK_TABLOLAR) {
    const { data, error } = await supabase.from(tablo).select("*");
    if (error) {
      ozet.push({ tablo, adet: -1 });
      continue;
    }
    const rows = data ?? [];
    let batch = db.batch();
    let n = 0;
    for (const row of rows) {
      const id = String(
        (row as { id?: string }).id ??
          `${(row as { kullanici_id?: string }).kullanici_id}_${(row as { santiye_id?: string }).santiye_id}`
      );
      const ref = db
        .collection("yedek")
        .doc(tablo)
        .collection("kayitlar")
        .doc(id);
      batch.set(
        ref,
        {
          ...row,
          _yedek_zamani: new Date().toISOString(),
          _kaynak: "toplu-senkron",
        },
        { merge: true }
      );
      n++;
      if (n % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    if (n % 400 !== 0 && n > 0) await batch.commit();

    await supabase
      .from("yedekleme_durumu")
      .update({
        kayit_sayisi: rows.length,
        son_senkron: new Date().toISOString(),
        durum: "aktif",
        mesaj: "Toplu senkron tamam",
        updated_at: new Date().toISOString(),
      })
      .eq("katman", "firebase")
      .eq("tablo_adi", tablo);

    ozet.push({ tablo, adet: rows.length });
  }

  return NextResponse.json({ ok: true, ozet });
}

export async function GET() {
  const oturum = await getOturum();
  if (!oturum?.profil || oturum.profil.rol !== "admin") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    firebase: firebaseYapilandirilmis(),
    tablolar: YEDEK_TABLOLAR,
  });
}
