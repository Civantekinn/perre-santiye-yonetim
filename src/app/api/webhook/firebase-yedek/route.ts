import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { getFirebaseDb } from "@/lib/firebase-admin";
import { yedekTabloMu } from "@/lib/yedek-tablolar";

/**
 * Supabase Database Webhook hedefi.
 * Desteklenen tablolarda INSERT/UPDATE → Firestore yedek/{tablo}/kayitlar/{id}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const table = (body.table || body.table_name) as string;
    const record = body.record || body.new || body;

    if (!yedekTabloMu(table)) {
      return NextResponse.json(
        { ok: false, hata: "Desteklenmeyen tablo" },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json(
        {
          ok: false,
          hata: "Firebase yapılandırılmamış. FIREBASE_* ortam değişkenlerini ekleyin.",
        },
        { status: 503 }
      );
    }

    const kayitId = String(record.id ?? `${record.kullanici_id}_${record.santiye_id}`);
    if (!kayitId || kayitId === "undefined_undefined") {
      return NextResponse.json(
        { ok: false, hata: "Kayıt id eksik" },
        { status: 400 }
      );
    }

    await db
      .collection("yedek")
      .doc(table)
      .collection("kayitlar")
      .doc(kayitId)
      .set(
        {
          ...record,
          _yedek_zamani: new Date().toISOString(),
          _kaynak: "supabase-webhook",
        },
        { merge: true }
      );

    try {
      const supabase = createServiceClient();
      const { data: mevcut } = await supabase
        .from("yedekleme_durumu")
        .select("id, kayit_sayisi")
        .eq("katman", "firebase")
        .eq("tablo_adi", table)
        .maybeSingle();

      if (mevcut) {
        await supabase
          .from("yedekleme_durumu")
          .update({
            kayit_sayisi: Number(mevcut.kayit_sayisi) + 1,
            son_senkron: new Date().toISOString(),
            durum: "aktif",
            mesaj: "Firebase senkron çalışıyor",
            updated_at: new Date().toISOString(),
          })
          .eq("id", mevcut.id);
      } else {
        await supabase.from("yedekleme_durumu").insert({
          katman: "firebase",
          tablo_adi: table,
          kayit_sayisi: 1,
          son_senkron: new Date().toISOString(),
          durum: "aktif",
          mesaj: "Firebase senkron çalışıyor",
        });
      }
    } catch {
      // durum güncellemesi başarısız olsa bile yedek yazıldı
    }

    return NextResponse.json({ ok: true, tablo: table, id: kayitId });
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ ok: false, hata: mesaj }, { status: 500 });
  }
}
