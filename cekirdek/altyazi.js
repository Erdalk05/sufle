/* ALTYAZI GÖRÜNÜMÜ — TEK KAYNAK (G.2).

   Neden çekirdekte: altyazı iki kabukta da videoya yakılıyor. Tema tablosu
   kopyalansaydı biri düzeltilip diğeri unutulurdu — bu deponun 1 numaralı
   hata sınıfı (yarım özellik). Tablo veri, çizim kabuğa özel.

   ÖLÇÜLEN BAŞLANGIÇ (2026-08-15): "Sade / Sosyal" seçeneği çizimi HİÇ
   değiştirmiyordu; yalnız punto ve konumu ayarlayan bir kısayoldu
   (`st.capStyle` çizimde bir kez bile okunmuyor). Yani uygulamanın tek bir
   altyazı görünümü vardı. BIGVU ve teleprompter.com tema/renk/animasyon
   satıyor; bu modül o boşluğu kapatıyor.

   KURAL — HER TEMA OKUNUR OLMAK ZORUNDA: arkasında dolu bir zemin yoksa
   metnin konturu ya da gölgesi OLMALI. Video her renkte olabilir; zeminsiz
   ve konturusuz beyaz yazı beyaz duvarda kaybolur. tests/151 bunu tema tema
   ölçüyor, yani yeni tema eklerken kural kendiliğinden uygulanıyor. */

/* zemin: 'bant' tam genişlik şerit · 'kutu' satır arkası keskin kutu ·
          'hap' satır arkası yuvarlak · 'yok' zemin yok
   konturOran/golgeOran: punto ile çarpılır (punto değişince oran korunur)
   vurguZemin: vurgulanan kelimenin ARKASINA dolu hap çizilsin mi
   metin/vurgu/vurguMetin: 'jeton:<ad>' yazan alan kabukta jetondan okunur */
const ALTYAZI_TEMA = {
  /* Bugünkü görünüm birebir korunuyor: varsayılan tema hiçbir şeyi
     değiştirmemeli, yoksa mevcut kullanıcının çekimi bir gecede başkalaşır. */
  sade:     {zemin:'bant', zeminAlfa:0.45, dolgu:0.35, yaricap:0,
             konturOran:0.14, golgeOran:0, vurguZemin:false},
  kutu:     {zemin:'kutu', zeminAlfa:0.72, dolgu:0.30, yaricap:0,
             konturOran:0.10, golgeOran:0, vurguZemin:false},
  hap:      {zemin:'hap',  zeminAlfa:0.72, dolgu:0.34, yaricap:0.42,
             konturOran:0.10, golgeOran:0, vurguZemin:false},
  seritsiz: {zemin:'yok',  zeminAlfa:0,    dolgu:0.30, yaricap:0,
             konturOran:0.20, golgeOran:0, vurguZemin:false},
  vurguHap: {zemin:'yok',  zeminAlfa:0,    dolgu:0.30, yaricap:0.42,
             konturOran:0.16, golgeOran:0, vurguZemin:true},
  golge:    {zemin:'yok',  zeminAlfa:0,    dolgu:0.30, yaricap:0,
             konturOran:0,    golgeOran:0.16, vurguZemin:false}
};
const ALTYAZI_TEMA_SIRA = ['sade','kutu','hap','seritsiz','vurguHap','golge'];

function altyaziTema(ad){
  return ALTYAZI_TEMA[ad] || ALTYAZI_TEMA.sade;
}

/* Zeminsiz tema kontursuz ya da gölgesiz OLAMAZ. Ayrı fonksiyon çünkü hem
   çizim hem test aynı kuralı sorabilsin — kural koda gömülü kalırsa test
   onu kopyalar ve kopya bir gün sessizce yalan söyler. */
function altyaziOkunur(t){
  if(!t) return false;
  if(t.zemin!=='yok') return true;
  return (t.konturOran>0) || (t.golgeOran>0) || !!t.vurguZemin;
}

/* VURGU ANİMASYONU. Kelime altyazıya girdikten sonra geçen süreye bakar.
   `sure` bilerek kısa: altyazı okunacak bir şey, gösteri değil. 200 msnin
   üstü, hızlı konuşmada bir sonraki kelime gelmeden bitmez ve vurgu
   sürekli hareket hâlinde görünür (ölçüldü: 180 kelime/dakikada kelime
   başına 333 ms).
   Dönüş: olcek (büyütme), alfa (saydamlık), kayma (satır yüksekliği oranı). */
function kkAnim(tur, gecen){
  const durgun={olcek:1, alfa:1, kayma:0};
  if(tur==='yok' || !(gecen>=0)) return durgun;
  const sure = (tur==='sicra') ? 180 : 150;
  const t = gecen>=sure ? 1 : gecen/sure;
  const e = 1-Math.pow(1-t,3);            // easeOutCubic: çıkışta yavaşlar
  if(tur==='sicra') return {olcek: 1+0.18*(1-e), alfa:1, kayma:0};
  if(tur==='yumusak') return {olcek:1, alfa:e, kayma:(1-e)*0.22};
  return durgun;
}

/* Konum oranı: kadrajın neresinde duracağı. Üst seçeneği yeni (G.2);
   platform arayüzleri (Reels ölçüm çubuğu, YouTube başlığı) alt ve üst
   kenarı yiyebildiği için oranlar kenardan içeri alınmış durumda. */
function altyaziKonumOrani(konum){
  if(konum==='middle') return 0.50;
  if(konum==='top')    return 0.18;
  return 0.84;                            // bottom (varsayılan)
}

/* Bloğun MERKEZİ nerede duracak. Oranın neyi çapaladığı konuma göre değişir:
   altta bloğun ALT kenarı, üstte ÜST kenarı, ortada merkezin kendisi. Böylece
   satır sayısı arttıkça altyazı kadrajın dışına doğru değil İÇERİ doğru büyür.
   Alt ve orta için sonuç eski koddaki hesapla birebir aynı (0.84 ve 0.50):
   yeni konum eklerken eski davranışın kayması sessiz bir gerileme olurdu. */
function altyaziMerkezY(konum, Hh, blokY){
  const o=altyaziKonumOrani(konum);
  if(konum==='middle') return Hh*o;
  if(konum==='top')    return Hh*o + blokY/2;
  return Hh*o - blokY/2;
}

/* KARAOKE PARÇALAMA — satırı görsel parçalara böler ve vurgulanacak parçayı
   söyler. İKİ KABUKTA DA BİREBİR AYNI 398 karakterdi (2026-08-16 denetim
   turunda ölçüldü); bu deponun ölçülmüş hata sınıfı tam olarak budur:
   sürüklenmiş kopya bir tarafta düzeltilir, diğerinde unutulur ve iki
   platform aynı çekim için farklı şey gösterir (`metin.js`teki `cleanText`
   vakası). Ölçüm KABUĞUN işi (yazı tipi ve tuval oradadır), yerleşim
   hesabı ortak: `measure` geri çağrısı dışarıdan geliyor.
   Yön kuralı `yon.js`ten (gorselSira) geliyor ve o modül BU dosyadan ÖNCE
   gömülüyor. */
function kkParcala(measure, ln, yon){
  const okuma=String(ln||'').split(' ').filter(Boolean);
  /* G.12 — GÖRSEL SIRA. Sağdan sola metinde okuma sırası ile ekrandaki
     sıra TERSTİR. Bunu atlamak, vurgunun cümlenin YANLIŞ UCUNDA yanması
     demek: kullanıcı okuduğu kelimeyi değil karşı uçtakini vurgulu görür. */
  const parts=gorselSira(okuma, yon);
  if(!parts.length) return null;
  const bosluk=measure(' ');
  const gen=parts.map(p=>measure(p));
  const toplam=gen.reduce((a,b)=>a+b,0)+bosluk*(parts.length-1);
  const xs=[]; let x=-toplam/2;
  for(let i=0;i<parts.length;i++){ xs.push(x); x+=gen[i]+bosluk; }
  /* Vurgulanan kelime okuma sırasının SONUNCUSU; görsel sırada bu,
     sağdan solada ilk parçadır. */
  const vurguIdx = yon==='rtl' ? 0 : parts.length-1;
  return {parts, xs, gen, toplam, vurguIdx};
}
