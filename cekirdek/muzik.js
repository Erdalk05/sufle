/* MÜZİK YATAĞI — kısılma (ducking) hesabı ve kullanılabilirlik kuralı (G.5).

   ÖLÇÜLMÜŞ RİSK, ÖNCE O: bu depoda iPhone'da KAYIT SIRASINDA mikrofonu
   Web Audio'ya bağlamak MediaRecorder'ın ses yazmasını durduruyor. Ses
   Stüdyosu bu yüzden iOS'ta hiç çalışmıyor (`fxOn()` içinde `!IS_WK`) ve
   Nefesle Akış kayıt başlarken kapanıyor. Müzik yatağı da AYNI zincire
   bağlanıyor, yani aynı riski taşıyor.

   KARAR (Erdal uyurken alındı, sebebi burada): müzik iOS'ta AÇILMIYOR ve
   sebebi arayüzde YAZIYOR. Alternatif "yine de aç" olurdu ve bedeli
   SESSİZ ÇEKİM — bu üründe en pahalı kayıp, çünkü kullanıcı ancak
   oynatınca fark eder ve o an konuşma bitmiştir. Sessizce kapatmak da
   yasak (ön koşulu olan ayar = ölü ayar), o yüzden durum ve sebep
   birlikte döndürülüyor.

   Kısılma (ducking) da tahmin değil ÖLÇÜM: gürültü kapısının zaten
   hesapladığı RMS kullanılıyor, yani müzik için ikinci bir analiz
   zinciri kurulmuyor. */

const MUZIK_MAX = 20*1024*1024;     // 20 MB — dakikalarca müzik için fazlasıyla yeter
const MUZIK_KIS_ESIK = 0.035;       // bu RMS üstü "konuşuyor" sayılır (kapı eşiğiyle aynı sınıf)

/* Konuşurken müzik ne kadar kısılsın.
   `taban` kullanıcının seçtiği ses düzeyi (0..1), `oran` kısılma miktarı
   (0 = hiç kısma, 1 = tamamen sustur).
   Geçiş SERT DEĞİL: eşiğin hemen üstünde ani düşüş, müziği pompalatır ve
   kulakta "makine" hissi bırakır; o yüzden eşik çevresinde yumuşak bir
   geçiş bandı var. */
function muzikKisilmaKazanci(rms, taban, oran){
  const t=Math.max(0, Math.min(1, +taban||0));
  const o=Math.max(0, Math.min(1, oran===undefined?0.8:+oran));
  const r=+rms||0;
  if(o===0) return t;
  const bant=MUZIK_KIS_ESIK*1.6;
  let konusma;
  if(r<=MUZIK_KIS_ESIK) konusma=0;
  else if(r>=MUZIK_KIS_ESIK+bant) konusma=1;
  else konusma=(r-MUZIK_KIS_ESIK)/bant;
  return t*(1-o*konusma);
}

/* Dosya kabulü: tür ve boyut, ikisi de kullanıcıya AÇIKÇA söylenir. */
function muzikDosyaKabul(tur, boyut){
  const t=String(tur||'');
  if(!/^audio\//.test(t)) return {ok:false, sebep:'tur'};
  if((+boyut||0) > MUZIK_MAX) return {ok:false, sebep:'boyut'};
  return {ok:true, sebep:null};
}

/* Müzik yatağı şu an çalışabilir mi ve çalışmıyorsa NEDEN.
   Sebep dizesi arayüzde gösterilecek mesajın anahtarıdır; "false" dönüp
   susmak bu depoda yasak (kullanıcı ayarı açar, hiçbir şey olmaz). */
function muzikDurum(iosMu, hamSes, dosyaVar, fxKapali){
  if(iosMu) return {calisir:false, sebep:'ios'};
  if(hamSes) return {calisir:false, sebep:'ham'};
  /* DENETİM TURUNDA BULUNDU (2026-08-16): Ses Stüdyosu "Kapalı" seçiliyken
     ses zinciri hiç kurulmuyor (`fxOn()` false), yani müzik anahtarı
     açılıyor ve HİÇBİR ŞEY olmuyordu — üstelik sebebi de yazmıyordu.
     Bu deponun 3 numaralı hata sınıfı: ön koşulu olan ayar = ölü ayar.
     Koşul ya sağlanır ya sebebi söylenir; sessiz kalmak yasak. */
  if(fxKapali) return {calisir:false, sebep:'fxKapali'};
  if(!dosyaVar) return {calisir:false, sebep:'dosyaYok'};
  return {calisir:true, sebep:null};
}
