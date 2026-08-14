const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* YAYIN PAKETİ ÇEKİLEN SENARYOYU DEĞİL, O AN AÇIK OLANI ANLATIYORDU
   `paketPaylas` ve `yayinNotu` metni `active()` ile alıyordu. İki sürümlü
   senaryoda (⇄) tipik akış şu: Türkçe sürümü çek → pakete geçmeden önce
   İngilizce sürüme geç (ya da başka bir senaryo aç) → paketi oluştur.
   Sonuç: elindeki video Türkçe, paketteki `senaryo.txt` ve `yayin-notu.txt`
   İngilizce. Kullanıcı paketi açana kadar fark etmiyor — sessiz sapma.

   Yayın notu daha da yanıltıcı: başlık adayları, açıklama taslağı ve etiketler
   BAŞKA bir metinden üretiliyor ama süre/tempo çekimin kendisinden geliyor.
   Yani not, iki farklı şeyin karışımı oluyor.

   KARAR (C1 — planda "ikinci sürüm de eklensin mi" diye soruluyordu):
   pakete YALNIZ çekilen sürüm giriyor. İkinci sürüm başka bir videonun metni;
   bu videonun paketine koymak yanıltıcı olur ve dosya adlarını da belirsizleştirir. */

/* ---------- ÇEKİM BAŞINDA DAMGALANIYOR MU ---------- */
const ds=cikar(kod,/function doStartRec\(\)\{[\s\S]*?\n\}/,'doStartRec');
ok('çekim başlarken senaryo damgalanıyor', /cekimSenaryo=_s \?/.test(ds));
ok('damgada metin var', /text:_s\.text\|\|''/.test(ds));
ok('damgada başlık var', /title:_s\.title\|\|''/.test(ds));
ok('damgada hangi sürüm olduğu var', /surum2:!!_s\.surum2/.test(ds));
ok('damga KOPYA (canlı nesneye bağlanmıyor)', !/cekimSenaryo=_s;/.test(ds));
ok('senaryo yoksa damga null', /cekimSenaryo=_s \? \{[^}]*\} : null;/.test(ds));

/* Damganın kopya olması kritik: canlı nesneye bağlansaydı kullanıcı metni
   düzenleyince damga da değişir ve düzeltme hiçbir şey yapmazdı. */
{
  const damga=new Function('__s', `
    let cekimSenaryo=null;
    const active=()=>__s;
    ${cikar(ds,/\{ const _s=active\(\);[\s\S]*?: null; \}/,'damga')}
    return cekimSenaryo;
  `);
  const canli={title:'Tanıtım', text:'ilk metin', surum2:false};
  const d=damga(canli);
  canli.text='SONRADAN DEĞİŞTİ';
  ok('damga alındıktan sonra senaryo düzenlense de değişmiyor', d.text === 'ilk metin');
  ok('senaryo yokken damga null', damga(null) === null);
}

/* ---------- PAKET DAMGAYI KULLANIYOR MU ---------- */
const pp=cikar(kod,/async function paketPaylas\(\)\{[\s\S]*?\n\}/,'paketPaylas');
ok('paket damgalı senaryoyu tercih ediyor', /const s=cekimSenaryo\|\|active\(\);/.test(pp));
ok('senaryo dosyası hâlâ pakete giriyor', /ad:'senaryo\.txt'/.test(pp));
ok('boş senaryo pakete girmiyor', /if\(s && \(s\.text\|\|''\)\.trim\(\)\)/.test(pp));

const yn=cikar(kod,/function yayinNotu\(\)\{[\s\S]*?\n\}/,'yayinNotu');
ok('yayın notu da damgalı senaryoyu tercih ediyor', /const s=cekimSenaryo\|\|active\(\)\|\|\{\}/.test(yn));
ok('paketten önce hiç çekim yoksa yine de çalışıyor (active yedek)',
   /cekimSenaryo\|\|active\(\)/.test(yn) && /cekimSenaryo\|\|active\(\)/.test(pp));

/* ---------- ASIL SENARYO: ÇEKİMDEN SONRA SÜRÜM DEĞİŞTİRME ---------- */
{
  /* Damga varken active() değişse bile paket damgayı kullanmalı. */
  const sec=new Function('__damga','__aktif', `
    const cekimSenaryo=__damga;
    const active=()=>__aktif;
    const s=cekimSenaryo||active();
    return s;
  `);
  const damga={title:'Tanıtım', text:'Türkçe metin', surum2:false};
  const aktif={title:'Intro', text:'English text', surum2:true};
  ok('çekimden sonra sürüm değişse de paket çekilen metni alıyor',
     sec(damga,aktif).text === 'Türkçe metin');
  ok('hiç çekim yapılmamışsa açık senaryo kullanılıyor',
     sec(null,aktif).text === 'English text');
}

/* ---------- ALTYAZI ZATEN DOĞRU DAVRANIYOR ----------
   Sürüm değişince buildContent+reset kelimeleri yeniden kuruyor ve capTimes
   sıfırlanıyor; buildCues boş dönüyor, yani YANLIŞ altyazı üretilmiyor —
   sessizce kayboluyor. Bu, yanlış altyazıdan iyidir ama bilinçli olduğu
   kayda geçsin. */
/* Korunan iddia: damgasız kelime altyazıya girmiyor. Damganın nereden
   okunduğu (ekran ya da çekimin anlık görüntüsü) uygulama ayrıntısı — I6da
   altyazı çekime bağlanınca bu iddia davranış bozulmadan kırmızıya döndü. */
ok('altyazı yalnız damgalı zamanlardan üretiliyor',
   /\.t==null\) continue;|if\(capTimes\[i\]==null\) continue;/.test(
     cikar(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues')));
ok('sürüm değişince içerik yeniden kuruluyor',
   /fillEditor\(\); renderScripts\(\); buildContent\(\); reset\(\);/.test(cikar(kod,/function surumDegistir\(\)\{[\s\S]*?\n\}/,'surumDegistir')));

/* ---------- KARAR: İKİNCİ SÜRÜM PAKETE GİRMİYOR ----------
   Bilinçli karar; ileride değişirse bu iddia da değişmeli. */
ok('pakete ikinci sürüm dosyası eklenmiyor', !/senaryo2|text2/.test(pp));
ok('pakette dört dosya sınırı korunuyor (video + srt + senaryo + not)',
   (pp.match(/dosyalar\.push/g)||[]).length === 3);
