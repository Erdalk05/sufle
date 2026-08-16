/* SENARYO LİSTESİ BİLGİSİ — TÜRETİLİR, TUTULMAZ (G.8 kararı).

   BIGVU'nun "içerik planlayıcı" modülü senaryolara durum (çekilecek/çekildi/
   yayınlandı) ve tarih tutuyor. Ölçüm (2026-08-16) o modülün büyük kısmının
   bizde ZATEN VAR olduğunu gösterdi:
     · `s.up` — son değişiklik zamanı her senaryoda tutuluyor ama LİSTEDE
       gösterilmiyordu;
     · çekim arşivi her çekime senaryonun BAŞLIĞINI yazıyor, yani "bu
       senaryoyu kaç kez çektim" arşivden ÖLÇÜLEBİLİYOR.

   KARAR: yeni bir durum alanı tutulmadı. Tutulan durum BAKIM ister ve
   kullanıcı güncellemezse yalan söyler; türetilen bilgi yalan söyleyemez.
   Bu deponun kuralı: ölçülebilen şeyi tutma, türet.

   KABUL ÖLÇÜTLERİ (hepsi burada, testi tests/162):
     ① `s.up` yoksa tarih HİÇ yazılmaz — eski kayıtlarda o alan yok ve
        "01.01.1970" göstermek veri uydurmaktır.
     ② Sayım arşivden BİR KEZ okunur; liste her çizimde depoya gitmez.
        (Okuma kabuğun işi; burası hazır listeyi sayıyor.)
     ③ Arşiv okunamadıysa sayı HİÇ gösterilmez — 0 yazmak "hiç çekmedin"
        demektir ve bu YANLIŞ bir iddia olur.
     ④ Sıfır çekim de gösterilmez: her satıra "0 çekim" yazmak gürültüdür.

   BİLİNEN SINIR (kasıtlı): bağ BAŞLIK üzerinden kuruluyor. Senaryonun adı
   değişirse eski çekimlerle bağ kopar ve sayı düşer. Alternatif, çekime
   senaryo kimliği yazmaktı; ama eski çekimlerde o alan YOK ve olmayan alanı
   varmış gibi okumak bu deponun 6 numaralı hata sınıfı. Yanlış sayı
   göstermektense bağın kopması yeğ. */

/* Arşiv üstverisinden başlık → çekim sayısı tablosu.
   Liste verilmezse (okuma başarısız) null döner — "bilmiyorum" ile
   "sıfır" farklı şeylerdir ve arayüz bu farkı göstermek zorundadır. */
function cekimSayilari(liste){
  if(!Array.isArray(liste)) return null;
  const tablo=new Map();
  for(const c of liste){
    const ad=String((c && c.title) || '').trim();
    if(!ad) continue;                       // başlıksız çekim kimseye bağlanmaz
    tablo.set(ad, (tablo.get(ad)||0)+1);
  }
  return tablo;
}

/* Bir senaryo satırında gösterilecek TÜRETİLMİŞ bilgi.
   Dönüş: {ts, cekim} — ikisi de null olabilir ve null "yazma" demektir. */
function senaryoBilgi(s, sayilar){
  const up=s && s.up;
  const ts=(typeof up==='number' && isFinite(up) && up>0) ? up : null;
  let cekim=null;
  if(sayilar && typeof sayilar.get==='function'){
    const ad=String((s && s.title) || '').trim();
    const n=ad ? (sayilar.get(ad)||0) : 0;
    cekim = n>0 ? n : null;
  }
  return {ts, cekim};
}
