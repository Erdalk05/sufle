const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar,blokKes}=require('./kaynak');
const mac=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
const tel=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* MAC'TE İŞARETLEME MOTORU HİÇ YOKTU
   Mac'in buildWords()'ü her belirteci olduğu gibi .w içine sarıyordu:
     html+='<div class="ln">'+r.replace(/\S+/g,m=>'<span class="w">'+biyonik(m)+'</span>')+'</div>';
   Yani *vurgu*, {telaffuz} ve / // (2) duraklama işaretleri kameradaki kişinin
   OKUDUĞU metinde harfi harfine görünüyor, altyazı dosyasına da öyle giriyordu.
   Ölçüldü: "Bu *çok* önemli!" ekranda aynen "Bu *çok* önemli!" çıkıyordu.

   En kötüsü: Mac'te "🫁 Nefes işareti" düğmesi metne `/` işaretleri EKLİYOR.
   Yani aracın kendisi sufleyi bozuyordu — kullanıcı düğmeye basıyor, sonra
   ekranda eğik çizgiler okuyor.

   Telefondaki kurallar Mac'e taşındı; duraklamalar artık gerçekten bekletiyor. */

const macIsaretle=new Function('escapeHtml','biyonik',
  /* GİRİNTİYE KİLİTLENMİŞTİ: desen kapanışı `\n  }` diye arıyordu, yani
     fonksiyonun İÇ BOŞLUĞUNU iddia ediyordu. `vurguYay` çekirdeğe taşınınca
     (tek kaynak) girinti değişti ve desen komşu fonksiyonu da yuttu.
     İddia girintiye değil FONKSİYONUN KENDİSİNE bağlandı. */
  blokKes(mac,'function vurguYay(')+'\n'+
  cikar(mac,/function isaretle\(tok\)\{[\s\S]*?\n  \}/,'Mac isaretle')+
  '; return {isaretle,vurguYay};')(s=>s,s=>s);
/* Satır düzeyi: dağıtım buildWords içinde yapılıyor, tek belirteçte değil. */
const isaretle=tok=>macIsaretle.vurguYay(tok).replace(/\S+/g,macIsaretle.isaretle);
/* markup artık çok kelimeli vurguyu dağıtan vurguYay'a bağımlı (B1, tests/70). */
const markup=new Function('esc','bionic',
  blokKes(tel,'function vurguYay(')+'\n'+
  cikar(tel,/function markup\(raw\)\{[\s\S]*?\n\}/,'telefon markup')+'; return markup;')(s=>s,s=>s);

/* Mac HTML varlıklarıyla yazıyor (kaynak dosyada okunur kalsın diye) — karşılaştırmadan önce çöz. */
const norm=h=>String(h).replace(/&#9208;/g,'⏸').replace(/&#8214;/g,'‖').replace(/\s+/g,' ').trim();

/* ---------- İKİ PLATFORM AYNI ÇIKTIYI VERİYOR ---------- */
const BELIRTECLER=['Bu','*çok*','*harika*!','(*vurgu*)','"*vurgu*"','*son*.','**kalın**',
                   'Goethe{gö-te}','Goethe{gö-te}nin','/','//','(2)','(1,5s)','düz.','2*3'];
for(const t of BELIRTECLER)
  ok('Mac ile telefon aynı — '+JSON.stringify(t), norm(isaretle(t)) === norm(markup(t)));

/* ---------- İŞARETLER ARTIK OKUNAN METNE GİRMİYOR ---------- */
const okunan=h=>[...norm(h).matchAll(/<span class="w[^"]*"[^>]*>([\s\S]*?)<\/span>/g)]
  .map(x=>x[1]).join(' ').replace(/\s+/g,' ').trim();
ok('vurgu yıldızları okunan metinde yok', okunan(isaretle('*çok*')) === 'çok');
ok('noktalamaya yapışık vurgu da temizleniyor', okunan(isaretle('*harika*!')) === 'harika!');
ok('telaffuz ipucu okunan metinde yok', okunan(isaretle('Goethe{gö-te}')) === 'Goethe');
ok('duraklama işareti kelime sayılmıyor', okunan(isaretle('/')) === '' && okunan(isaretle('(2)')) === '');
ok('duraklama simgesi ekranda görünüyor', /class="hold"/.test(isaretle('/')));

/* ---------- VURGU VE İPUCU İŞARETLENİYOR ---------- */
ok('vurgu sınıfı veriliyor', /class="w em"/.test(isaretle('*çok*')));
ok('telaffuz ipucu saklanıyor', /data-ph="gö-te"/.test(isaretle('Goethe{gö-te}')));
ok('vurgusuz kelimeye vurgu verilmiyor', !/class="w em"/.test(isaretle('normal')));

/* ---------- DURAKLAMA SÜRELERİ TELEFONLA AYNI ---------- */
ok('/ = 350 ms', /data-ms="350"/.test(isaretle('/')));
ok('// = 800 ms', /data-ms="800"/.test(isaretle('//')));
ok('(2) = 2000 ms', /data-ms="2000"/.test(isaretle('(2)')));
ok('(1,5s) = 1500 ms', /data-ms="1500"/.test(isaretle('(1,5s)')));
ok('aşırı uzun bekleme sınırlanıyor', /data-ms="10000"/.test(isaretle('(60)')));

/* ---------- DURAKLAMA GERÇEKTEN BEKLETİYOR MU ----------
   İşareti ekranda göstermek yetmez: akış orada durmalı, yoksa özellik ölü. */
const tick=cikar(mac,/function tick\(ts\)\{[\s\S]*?\n  \}/,'Mac tick');
/* 2026-08-20: duruş artık SERT değil, zarfla (cekirdek/akis.js). Tek karede
   tam hızdan sıfıra düşen akış "duraklama" değil TAKILMA diye okunuyordu.
   İddia aynı kaldı — akış duraklamada gerçekten bekliyor mu — ama ölçüm
   davranışa taşındı: zarfın kendisi tests/200de sayıyla ölçülüyor. */
ok('akış duraklama süresince bekliyor (zarf çarpanıyla)',
   /const zarf = duraklamaCarpani\(ts-holdT0, holdSure\);/.test(tick) &&
   /curPPS\*brake\*zarf\*dt/.test(tick));
ok('duraklama noktası geçilince süre kuruluyor', /durakla\(ts,h\.ms\)/.test(tick));
ok('her işaret yalnız BİR KEZ kullanılıyor', /!h\.used && pos<y && next>=y/.test(tick) && /h\.used=true/.test(tick));
ok('konum, duraklama kontrolünden SONRA ilerliyor',
   tick.indexOf('durakla(ts,h.ms)') > 0 &&
   tick.indexOf('durakla(ts,h.ms)') < tick.indexOf('pos = next;'));

const measure=cikar(mac,/function measure\(\)\{[\s\S]*?\n  \}/,'Mac measure');
ok('duraklama noktaları ölçümde toplanıyor', /querySelectorAll\('\.hold'\)/.test(measure));
ok('ölçüm her işaretin süresini okuyor', /\+h\.dataset\.ms\|\|300/.test(measure));

/* Geri sarınca ilerideki işaretler yeniden kurulmalı — yoksa aynı yeri ikinci
   kez okurken hiç duraklamıyor. Telefonda bu koruma vardı. */
const setPos=cikar(mac,/function setPos\(p\)\{[\s\S]*?\n  \}/,'Mac setPos');
ok('geri sarınca ilerideki duraklamalar yeniden kuruluyor',
   /holdPoints\.forEach\(h=>\{ if\(h\.y>y0\) h\.used=false; \}\)/.test(setPos));
ok('geri sarınca bekleme de iptal ediliyor', /holdT0=-1e9; holdSure=0;/.test(setPos));

/* ---------- BAĞLI MI ---------- */
ok('buildWords işaretleme motorunu kullanıyor',
   /\.replace\(\/\\S\+\/g,isaretle\)/.test(cikar(mac,/function buildWords\(\)\{[\s\S]*?\n  \}/,'buildWords')));
/* İDDİA: her belirteç işaretleme motorundan geçiyor. Eskiden desen
   birleştirmenin BİÇİMİNİ kilitliyordu (`'<span class="w">'+biyonik(m)+…`);
   Mace bir sınıf ya da öznitelik eklemek testi boşuna kırardı. */
ok('eski "her belirteci olduğu gibi bas" yolu kalmadı',
   !/replace\(\/\\S\+\/g,\s*m\s*=>[^\n]*biyonik\(m\)/.test(mac));
ok('vurgu için stil tanımlı', /#scroller \.w\.em\{/.test(mac));
ok('duraklama için stil tanımlı', /#scroller \.hold\{/.test(mac));

/* ---------- ARAÇ ARTIK SUFLEYİ BOZMUYOR ----------
   "Nefes işareti" metne / ekliyor; motor onu artık duraklama olarak çözüyor. */
const bm=cikar(mac,/function breathMarks\(t\)\{[\s\S]*?\n  \}/,'breathMarks');
ok('nefes aracı hâlâ / ekliyor', /\$1 \/ /.test(bm));
ok('eklenen / artık duraklamaya dönüşüyor (araç sufleyi bozmuyor)',
   /class="hold"/.test(isaretle('/')));
