const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* SUFLEDE OKUNAN METİN İLE YAYIN PAKETİNDEKİ METİN AYRIŞIYORDU
   İki ayrı yol aynı işaretleri çözüyor:
     markup()   — kişinin ekranda okuduğu metin; ALTYAZI DOSYASI da buradan
                  üretiliyor (kelimelerin metni doğrudan .srt'ye giriyor).
     duzMetin() — yayın paketine giren düz senaryo metni.
   İkisi ayrışırsa kişi ekranda bir şey okuyup pakette başka bir şey yayımlıyor.

   ÖLÇÜLEN İKİ SAPMA:
   1) Noktalama işarete yapışınca vurgu çalışmıyordu. markup() belirtecin
      TAMAMININ *…* kalıbına uymasını istiyordu:
        "*harika*!"  → ekranda ve ALTYAZIDA "*harika*!"   (paket: "harika!")
        "(*vurgu*)"  → ekranda ve ALTYAZIDA "(*vurgu*)"   (paket: "(vurgu)")
      Yani yıldızlar kameradaki kişinin okuduğu metinde ve yayımlanan altyazı
      dosyasında görünüyordu.
   2) Telaffuz ipucu {…} markup()'ta yalnız belirtecin SONUNDA aranıyordu;
      duzMetin() her yerdekini siliyordu. "Goethe{gö-te}nin" ekranda süslü
      parantezlerle duruyor, pakette temiz çıkıyordu. Uzunluk sınırı da
      farklıydı (markup 24 karakter, duzMetin sınırsız).

   Bu fonksiyondaki yorum aynı hata sınıfının bir kez daha yaşandığını
   söylüyor ("ipucu suflede ve ALTYAZIDA görünüyordu") — tetikleyici farklı,
   sınıf aynı. */

const src=['markup','duzMetin']
  .map(f=>cikar(kod,new RegExp('function '+f+'\\([\\s\\S]*?\\n\\}'),f)).join('\n');
const M=new Function('esc','bionic',src+'; return {markup,duzMetin};')(s=>s,s=>s);

/* Kişinin OKUDUĞU kelimeler = .w span'ları. Duraklama simgeleri (⏸ | ‖) ayrı
   .hold span'ı: ekranda görünür ama okunmaz, altyazıya da girmez — paketten
   çıkarılmaları DOĞRU davranış, sapma değil. Karşılaştırma bu yüzden yalnız
   okunan kelimeler üzerinden yapılıyor. */
const okunan=h=>[...h.matchAll(/<span class="w[^"]*"[^>]*>([\s\S]*?)<\/span>/g)]
  .map(x=>x[1]).join(' ').replace(/\s+/g,' ').trim();

const VAKALAR=[
  'bu *çok* önemli',
  'bu *çok* önemli,',
  '*harika*!',
  '(*vurgu*)',
  '"*vurgu*"',
  '*son*.',
  '*soru*?',
  '«*şu*»',
  '**kalın**',
  'Goethe{gö-te}',
  'Goethe{gö-te}nin',
  'düz metin.',
  'şu / dur',
  'şu // dur',
  '(2) bekle',
  '(1,5s) bekle',
];
for(const t of VAKALAR)
  ok('sufle ile paket aynı — '+JSON.stringify(t), okunan(M.markup(t)) === M.duzMetin(t));

/* ---------- VURGU GERÇEKTEN İŞARETLENİYOR MU ----------
   Yıldızları temizlemek yetmez: kelime VURGULU görünmeli, yoksa özellik ölür. */
const vurgulu=h=>/<span class="w em"/.test(h);
for(const t of ['*çok*','*harika*!','(*vurgu*)','"*vurgu*"','**kalın**','*son*.'])
  ok('vurgu işaretleniyor — '+JSON.stringify(t), vurgulu(M.markup(t)));
for(const t of ['normal','yıldızsız,','2*3'])
  ok('vurgusuz kelime vurgulanmıyor — '+JSON.stringify(t), !vurgulu(M.markup(t)));

/* ---------- NOKTALAMA KAYBOLMUYOR ----------
   Vurguyu düzeltirken noktalamayı yutmak, altyazıyı bozar. */
ok('sondaki ünlem duruyor', okunan(M.markup('*harika*!')) === 'harika!');
ok('parantezler duruyor', okunan(M.markup('(*vurgu*)')) === '(vurgu)');
ok('tırnaklar duruyor', okunan(M.markup('"*vurgu*"')) === '"vurgu"');
ok('cümle sonu noktası duruyor (altyazı bölmesi buna bakıyor)',
   okunan(M.markup('*son*.')) === 'son.');

/* ---------- TELAFFUZ İPUCU ---------- */
const ipucu=h=>{ const m=h.match(/data-ph="([^"]*)"/); return m?m[1]:null; };
ok('sondaki ipucu okunuyor', ipucu(M.markup('Goethe{gö-te}')) === 'gö-te');
ok('ortadaki ipucu da okunuyor', ipucu(M.markup('Goethe{gö-te}nin')) === 'gö-te');
ok('ipucu ekrandaki metinden çıkarılıyor', okunan(M.markup('Goethe{gö-te}nin')) === 'Goethenin');
ok('vurgu ile ipucu birlikte çalışıyor',
   ipucu(M.markup('*Goethe{gö-te}*')) === 'gö-te' && vurgulu(M.markup('*Goethe{gö-te}*')));

/* 24 karakteri aşan süslü parantez İKİ TARAFTA DA duruyor: sessizce metin
   silmektense ekranda görünsün ve kullanıcı düzeltsin. Asıl olan İKİSİNİN
   AYNI davranması. */
const UZUN='Goethe{çok uzun bir telaffuz ipucu buraya}';
ok('24 karakteri aşan ipucu iki tarafta da aynı davranıyor',
   okunan(M.markup(UZUN)) === M.duzMetin(UZUN));
ok('aşırı uzun ipucu sessizce silinmiyor', M.duzMetin(UZUN).includes('{'));

/* ---------- DURAKLAMA İŞARETLERİ ---------- */
ok('(2) duraklama simgesine dönüşüyor, kelime olmuyor',
   /class="hold" data-ms="2000"/.test(M.markup('(2)')) && okunan(M.markup('(2)')) === '');
ok('/ duraklama simgesi', /class="hold" data-ms="350"/.test(M.markup('/')));
ok('// daha uzun duraklama', /class="hold" data-ms="800"/.test(M.markup('//')));
ok('duraklama paketten çıkarılıyor (okunmuyor)', M.duzMetin('(2) bekle') === 'bekle');

/* ---------- İKİ TARAF AYNI İPUCU SINIRINI KULLANIYOR ----------
   Sınırlar ayrışırsa sapma sessizce geri gelir. */
ok('ipucu sınırı iki tarafta da 1–24 karakter',
   /\{\[\^\}\]\{1,24\}\}/.test(cikar(kod,/function duzMetin\(t\)\{[\s\S]*?\n\}/,'duzMetin').replace(/\\/g,'\\')) ||
   cikar(kod,/function duzMetin\(t\)\{[\s\S]*?\n\}/,'duzMetin').includes('{1,24}'));
ok('markup da aynı sınırı kullanıyor',
   cikar(kod,/function markup\(raw\)\{[\s\S]*?\n\}/,'markup').includes('{1,24}'));

/* ---------- BÜTÜN CÜMLE ---------- */
{
  const ham='Bu *çok* önemli! Goethe{gö-te}nin dediği gibi / devam ediyoruz.';
  ok('tam cümlede sufle ile paket birebir aynı',
     okunan(M.markup(ham)) === M.duzMetin(ham));
  ok('tam cümlede yıldız/süslü parantez ekranda kalmıyor',
     !/[*{}]/.test(okunan(M.markup(ham))));
}
