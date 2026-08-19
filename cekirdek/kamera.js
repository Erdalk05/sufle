/* ELLE KAMERA DENETİMLERİNİN KARARLARI — tek kaynak, iki kabuk.

   NEDEN ÇEKİRDEKTE: bu kurallar "hangi cihazda hangi denetim GÖSTERİLİR"
   sorusunu cevaplıyor ve yanlış cevap her seferinde aynı kusuru üretiyor:
   **ön koşulu olan ayar = sessiz ölü özellik.** Kullanıcı sürgüyü oynatıyor,
   kamera hiç değişmiyor, sebebi hiçbir yerde yazmıyor. Kural iki kabukta
   kopya yaşasaydı biri düzeltilip diğeri unutulurdu; bu depoda o sınıf
   defalarca çıktı.

   ÖLÇÜLMÜŞ GERÇEK: cihazlar pozlamayı İKİ ayrı yoldan veriyor —
     · `exposureCompensation` → otomatik pozlamaya ±sapma (bazı Android'ler)
     · `exposureMode:'manual'` + `exposureTime` → pozlamanın kendisi
   Yalnız birine bakmak, desteği olan cihazların yarısını dışarıda bırakır.
   Kullanıcıya gösterilen şey ikisinde de aynı: "parlaklık".

   BEYAZ AYARINDA KİP VE DEĞER BİRLİKTE GİDER: yalnız `colorTemperature`
   istemek, kip `continuous` kalırken sessizce hiçbir şey yapmaz (deponun
   "yarım kalmış düzeltme" sınıfı). */

/* Odak/pozlama kilidi hangi kiplerle yapılabilir?
   'manual' yoksa 'single-shot' da kilitler; iOS ve Android farklı ad veriyor.
   Hiçbiri yoksa `var:false` → anahtar HİÇ gösterilmemeli. */
function kamKilitKipleri(caps){
  const odakK=(caps && caps.focusMode) || [];
  const pozK =(caps && caps.exposureMode) || [];
  const odak=[...odakK].find(k=>k==='manual'||k==='single-shot');
  const poz =[...pozK].find(k=>k==='manual');
  return {odak, poz, var:!!(odak||poz)};
}

/* Kilidi kameraya gönderilecek kısıta çevir.
   YALNIZ DESTEKLENEN ALAN GÖNDERİLİYOR: desteksiz bir alanı istemek bazı
   tarayıcılarda TÜM kısıtı reddettiriyor ve kilit sessizce hiç uygulanmıyordu. */
function kamKilitKisiti(kipler, acik){
  const ileri={};
  if(kipler && kipler.odak) ileri.focusMode = acik ? kipler.odak : 'continuous';
  if(kipler && kipler.poz)  ileri.exposureMode = acik ? kipler.poz : 'continuous';
  return Object.keys(ileri).length ? ileri : null;
}

/* Pozlama yolu ve sürgü aralığı. `yol:null` → sürgü HİÇ gösterilmemeli. */
function kamPozYolu(caps){
  const sapma = caps && caps.exposureCompensation;
  const elleKip = ((caps && caps.exposureMode) || []).includes('manual');
  const sure = caps && caps.exposureTime;
  const yol = sapma ? 'sapma' : (elleKip && sure ? 'sure' : null);
  if(!yol) return {yol:null};
  const yet = yol==='sapma' ? sapma : sure;
  const min=(yet.min!==undefined?yet.min:-3), max=(yet.max!==undefined?yet.max:3);
  const adim=(yet.step||((max-min)/12)||1);
  /* Varsayılan: sapmada 0 (nötr), sürede aralığın ortası — cihazın kendi
     otomatik değeri bilinmiyor, orta değer en az sürprizli başlangıç. */
  const varsayilan = yol==='sapma' ? Math.min(Math.max(0,min),max)
                                   : Math.round((min+max)/2);
  return {yol, min, max, adim, varsayilan};
}

/* Pozlama kısıtı. Kip ile değer BİRLİKTE gidiyor. */
function kamPozKisiti(yol, deger){
  if(!yol || deger===undefined || deger===null) return null;
  return yol==='sapma' ? {exposureMode:'continuous', exposureCompensation:deger}
                       : {exposureMode:'manual', exposureTime:deger};
}

/* Kullanıcıya yazılacak değer. Sapma nötre göre ±, süre ham sayı olduğu için
   yüzdeye çevriliyor — ham mikrosaniye kimseye bir şey anlatmaz. */
function kamPozYazi(yol, deger, min, max){
  if(!yol || deger===undefined || deger===null) return '—';
  if(yol==='sapma') return (deger>0?'+':'')+deger;
  const aralik=Math.max(1,(max-min));
  return Math.round((deger-min)/aralik*100)+'%';
}

/* Beyaz ayarı aralığı. Kip 'manual' YOKSA `var:false` — sıcaklık tek başına
   uygulanmaz, o yüzden sürgüyü göstermek ölü ayar olur. */
function kamWbAralik(caps){
  const kip = ((caps && caps.whiteBalanceMode) || []).includes('manual');
  const yet = caps && caps.colorTemperature;
  if(!(kip && yet)) return {var:false};
  return {var:true, min:yet.min||2800, max:yet.max||7500, adim:yet.step||100};
}

/* Beyaz ayarı kısıtı. 0 = otomatik (kullanıcı elle bir değer seçmedi). */
function kamWbKisiti(deger){
  return deger ? {whiteBalanceMode:'manual', colorTemperature:deger}
               : {whiteBalanceMode:'continuous'};
}
