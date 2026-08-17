const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, macMetni, REPO}=require('./kaynak.js');

/* 30 KATEGORİLİK REKABET ANALİZİ — ÖLÇÜMÜ KİLİTLE.

   Erdal'ın gönderdiği analiz SUFLE sütununu tahminle puanlamıştı. Tur 55'te
   aynı rubrikte her puan kodda ölçüldü: 53,6 → 63,0 (6. → 4.). Fark tek satır
   yeni özellik yazılmadan geldi; analiz yayında olan şeyleri bilmiyordu.

   Bir denetim belgesi, dayandığı kod değişince SESSİZCE yalan söylemeye başlar
   ve bu depoda en pahalı hata sınıfı odur. Bu dosya belgeyi koda bağlıyor:
   "var" dediği özellik kalkarsa da, "yok" dediği şey belirirse de kapı önce
   kırılır.

   Belge KARAR VERMİYOR, ölçüyor — ve kendi sınırını da yazıyor: yalnız SUFLE
   sütunu ölçüldü, rakip puanlarına dokunulmadı. */

const tel = oku(telefonYolu());
const mac = macMetni();
const belYol = (() => {
  const v = process.env.SUFLE_REKABET;
  if (v && !fs.existsSync(v)) throw new Error('Verilen yol yok: ' + v);
  return v || path.join(REPO, 'belgeler', 'REKABET_30_OLCULDU.md');
})();
ok('ölçüm belgesi depoda', fs.existsSync(belYol));
const bel = fs.readFileSync(belYol, 'utf8');
const belD = bel.replace(/\s+/g, ' ');

/* ---------- "VAR" DEDİKLERİ GERÇEKTEN VAR MI ---------- */
{
  /* Belge bu on bir kategoriyi YÜKSELTTİ ve her birini bir kanıta dayandırdı.
     Kanıt koddan kalkarsa yükseltme dayanaksız kalır. */
  const KANIT = {
    '2 · sesle takip':            [tel, /SpeechRecognition/],
    '2 · sessiz ölüm nöbetçisi':  [tel, /sessizNobet=setTimeout\(/],
    '4 · kumanda tuş öğretme':    [tel, /learnKey/],
    '8 · docx içe aktarma':       [tel, /docxMetni/],
    '11 · 4K kayıt':              [tel, /data-q="4k"/],
    '11 · kare hızı seçimi':      [tel, /frameRate/],
    '12 · odak/pozlama':          [tel, /focusMode|exposureMode/],
    '12 · cihaz seçimi':          [tel, /enumerateDevices/],
    '14 · SRT üretimi':           [tel, /function srtText\(\)/],
    '14 · altyazı gömme':         [tel, /tgBurn/],
    '15 · video budama':          [tel, /function openTrim\(\)/],
    '22 · kalıcı hata günlüğü':   [tel, /logErr\(/],
    '26 · ayarlarda arama':       [tel, /Ayarlarda ara/],
    '30 · OBS tarayıcı kaynağı':  [mac, /\?obs=1/],
    /* 16 Ağustos: iki kategori FAZ G ile yükseldi, dayanakları burada. */
    '15 · klip önerisi':          [tel, /function klipOnerileri\(/],
    '15 · kesim kaynağı koruyor': [tel, /kesKaynak=\{blob:lastBlob/],
    '28 · satır yönü':            [tel, /function metinYonu\(/],
    '28 · RTL noktalaması':       [tel, /؟/],
    /* 16 Ağustos, ikinci tur: 7. kategori (senaryo kütüphanesi) G.8 ile
       yükseldi — arama, üç sıralama kipi, çoğaltma, geri alınabilir çöp,
       iki sürümlü senaryo ve artık TÜRETİLMİŞ bilgi (son değişiklik +
       çekim sayısı). Klasör ve etiket yok, o yüzden 5 değil 4. */
    /* İDDİA "kutu duruyor" değil "arama ÇALIŞIYOR": kutunun kimliği kodda
       kalıp da yazınca hiçbir şey olmayan bir arama, bu kategoriyi hak
       etmezdi. O yüzden yazdıkça listeyi tazeleyen bağ aranıyor. */
    '7 · senaryo araması':        [tel, /\$\('#scriptFind'\)\.oninput=\(\)=>renderScripts\(\)/],
    '7 · sıralama kipleri':       [tel, /st\.scSort/],
    '7 · geri alınabilir çöp':    [tel, /st\.trash/],
    '7 · türetilmiş bilgi':       [tel, /senaryoBilgi\(s, cekimSayaci\)/],
  };
  for (const ad in KANIT) {
    const [src, d] = KANIT[ad];
    ok('belgenin dayandığı kanıt kodda: ' + ad, d.test(src));
  }

  /* 14. kategori 5 aldı ve gerekçesi ŞU: altyazı konuşma tanımadan üretiliyor.
     Bir gün ASR'ye geçilirse gerekçe çürür — üstünlük ortadan kalkar. */
  ok('altyazı hâlâ konuşma tanımadan üretiliyor',
     /okuma çizgisini geçtiği an/.test(belD) &&
     !/srtText[\s\S]{0,400}SpeechRecognition/.test(tel));
}

/* ---------- "YOK" DEDİKLERİ GERÇEKTEN YOK MU ---------- */
{
  /* Belgenin en önemli çıkarımı bu dört sıfıra dayanıyor: kalan boşluğun %18'i
     sunucu/pazar gerektiriyor. Biri sessizce eklenirse hem skor hem de
     "sunucu işletmek istiyor muyuz?" sorusu değişir. */
  const temiz = (tel + mac).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok('AI sağlayıcı çağrısı yok', !/openai|anthropic\.com|api\.gpt|generativelanguage/i.test(temiz));
  ok('bize ait sunucuya çağrı yok', !/fetch\(['"]https?:\/\//.test(temiz));
  ok('hesap/giriş yok', !/signIn|createAccount|oturum aç/i.test(temiz));
  ok('sanal kamera / NDI yok (30. kategori 5 değil 3)',
     !/virtual\s*cam|\bNDI\b/i.test(temiz));
  /* 17 Ağustos: PDF ayrıştırıcı EKLENDİ (cekirdek/pdf.js) ve 8. kategori
     3→4 oldu. 5 değil, çünkü Drive/bulut içe aktarma hâlâ yok ve okuyucu
     bilerek sınırlı: eşleme yoksa metin ÜRETMİYOR. Kategorinin puanı
     "okuyabildiğini doğru okuyor"a dayanıyor, "her dosyayı açar"a değil. */
  ok('PDF ayrıştırıcı VAR (8. kategori 3 değil 4)', /pdfMetni/.test(temiz));
  ok('PDF okuyucu emin olmadığında metin üretmiyor',
     /pdf belirsiz/.test(temiz) && /pdf cid esleme yok/.test(temiz));
  ok('bulut/Drive içe aktarma hâlâ yok (5 değil 4)',
     !/drive\.google|dropbox|onedrive/i.test(temiz));
}

/* ---------- HESAP DOĞRU MU ---------- */
{
  /* Skor belgede yazılı; aritmetiği burada TEKRAR yapılıyor. Elle yazılmış bir
     sayı, kategoriler değişince sessizce yanlışa döner. */
  const AGIRLIK = [5,5,4,4,3,3,3,2,4,3,4,3,2,3,2,3,3,2,2,4,4,4,3,2,5,2,3,2,2,3];
  /* 16 Ağustos, FAZ G sonrası: 15. kategori 3→4 (klip önerisi + kesim artık
     kaynağı koruyor, tek çekimden çok klip çıkıyor), 28. kategori 1→3
     (satır satır bidi, RTL noktalaması, karaoke vurgusu doğru uçta). */
  /* 16 Ağustos ikinci tur: 7. kategori 3→4 (G.8 türetilmiş bilgi + zaten
     var olan arama/sıralama/çöp/iki sürüm). Klasör-etiket yok → 5 değil. */
  /* 17 Ağustos: 8. kategori (İçe aktarma) 3→4 — PDF okuyucu eklendi. */
  /* 17 Ağustos, ikinci ekleme: 12. kategori (kamera denetimleri) 3→4 —
     elle pozlama ve beyaz ayarı, yeteneğe bağlı gösterimle. */
  const PUAN    = [4,4,5,4,3,5,4,4,0,5,4,4,4,5,4,5,0,0,0,2,0,3,5,5,4,3,5,3,0,3];
  ok('30 kategori var', AGIRLIK.length === 30 && PUAN.length === 30);

  const top = AGIRLIK.reduce((a, w, i) => a + w * PUAN[i], 0);
  const mx  = AGIRLIK.reduce((a, w) => a + w * 5, 0);
  const skor = top / mx * 100;
  ok('ölçülen skor 66,0 (hesaplanan ' + skor.toFixed(1) + ')', Math.abs(skor - 66.0) < 0.1);
  ok('belge aynı skoru yazıyor', /\*\*66,0\*\*/.test(bel));
  ok('belge bir önceki ölçümü de saklıyor (64,9)', /64,9/.test(bel));
  ok('belge ilk ölçümü de saklıyor (63,0)', /63,0/.test(bel));

  /* Sunucusuz tavan: sıfır alan altı kategori hiç kazanılamazsa ulaşılabilecek
     en yüksek skor. Belgenin ana çıkarımı bu sayıya dayanıyor. */
  const sifirAgirlik = AGIRLIK.filter((_, i) => PUAN[i] === 0).reduce((a, w) => a + w, 0);
  ok('sıfır alan kategorilerin ağırlığı 17 (' + sifirAgirlik + ')', sifirAgirlik === 17);
  const tavan = (mx - sifirAgirlik * 5) / mx * 100;
  ok('sunucusuz tavan 81,9 (' + tavan.toFixed(1) + ')', Math.abs(tavan - 81.9) < 0.1);
  ok('belge tavanı yazıyor', /81,9/.test(bel));

  /* BELGE İLE DİZİ AYRIŞMASIN. Skor burada, tablo orada duruyordu; ikisi
     ayrı ayrı elle güncellenirse belge sessizce başka bir ürünü anlatmaya
     başlar. Tablo artık koddan okunuyor. */
  const SATIR = /^\| (\d+) \| ([^|]+) \| ×(\d) \| (\d) \| (ölçüldü|sıfır doğrulandı|tahmin korundu) \|$/gm;
  const satirlar = [...bel.matchAll(SATIR)];
  ok('belgede 30 satırlık tam rubrik var (' + satirlar.length + ')', satirlar.length === 30);
  let uyum = true, sira = true;
  satirlar.forEach((sm, i) => {
    if (+sm[1] !== i + 1) sira = false;
    if (+sm[3] !== AGIRLIK[i] || +sm[4] !== PUAN[i]) uyum = false;
  });
  ok('tablo sırası 1..30', sira);
  ok('tablodaki ağırlık ve puanlar diziyle aynı', uyum);
  /* Sıfır puanlı satırın durumu "tahmin korundu" olamaz: sıfırların ölçüldüğü
     bu belgenin ana çıkarımının dayanağı. */
  ok('sıfır puanlı satırların hepsi ölçülmüş',
     satirlar.every(sm => +sm[4] !== 0 || sm[5] === 'sıfır doğrulandı'));
  const olculen = satirlar.filter(sm => sm[5] !== 'tahmin korundu').length;
  ok('30 kategorinin 19u ölçülmüş (' + olculen + ')', olculen === 19);
  /* Ölçülmemiş satırların VARLIĞI da yazılı olmalı: belge kendi boşluğunu
     saklarsa "hepsi ölçüldü" sanılır. */
  ok('ölçülmeyen satırların olduğu belgede yazılı', /tahmin korundu/.test(bel));
  /* Kalan pay TÜRETİLİYOR: elle yazılan bir fark, skor değişince sessizce
     yanlışa döner (18,9 tam da böyle bayatlamıştı). */
  const kalan = tavan - skor;
  const kalanYazi = kalan.toFixed(1).replace('.', ',');
  ok('belge kalan kazanılabilir payı doğru yazıyor (' + kalanYazi + ')',
     new RegExp(kalanYazi.replace(',', '[,.]')).test(bel));
}

/* ---------- BELGE KENDİ SINIRINI SÖYLÜYOR MU ---------- */
{
  /* Bu depoda bir denetim belgesinin en tehlikeli hâli, ölçmediği şeyi ölçmüş
     gibi sunmasıdır. Rakip puanları TAHMİN olarak kaldı; belge bunu açıkça
     söylemezse "biz 4. sıradayız" cümlesi ölçülmüş bir iddia sanılır. */
  ok('yalnız SUFLE sütununun ölçüldüğü yazılı',
     /Yalnız \*\*SUFLE sütunu\*\* yeniden ölçüldü/.test(bel));
  ok('rakip puanlarının tahmin olduğu yazılı', /hâlâ tahmin/.test(belD));
  ok('öz-değerlendirme olduğu yazılı', /öz-değerlendirmedir/.test(belD));

  /* Belgenin fiyat belgesiyle aynı sonuca VARDIĞI, ama bağımsız yoldan
     vardığı yazılı olmalı — yoksa iki belge birbirini tekrar ediyor sanılır. */
  ok('fiyat belgesiyle bağı kuruluyor',
     /FIYATLANDIRMA\.md/.test(bel) && /sunucu işletmek istiyor muyuz/.test(belD));

  /* Kalan işler SIRALANMIŞ olmalı: "geride kaldığımız yerler" listesi tek
     başına bir yol haritası değildir. */
  ok('sunucusuz kazanç sıraya konmuş', /puan \/ iş yükü/.test(belD));
  ok('en büyük hamlenin mağaza olduğu yazılı', /En büyük tek hamle mağazaya çıkmak/.test(belD));
  /* Mağaza engelinin ÖLÇÜLÜP çürüdüğü yazılı olmalı: yoksa okuyan kişi hâlâ
     aşılmaz bir engel olduğunu sanır (aylarca öyle sanıldı). */
  ok('iOS engelinin çürüdüğü belgede yazılı', /ölçüldü ve \*\*çürüdü\*\*/.test(bel));
}
