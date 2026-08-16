const ok2=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes}=require('./kaynak');
const tel=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
const mac=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* B1 — ÇOK KELİMELİ VURGU HİÇ ÇALIŞMIYORDU.
   İşaretleme belirteç bazlı çalışıyor. `*çok önemli*` boşluktan iki belirtece
   bölünüyor (`*çok` ve `önemli*`) ve hiçbiri `*…*` kalıbına uymuyor. ÖLÇÜLEN
   eski çıktı:
       suflede : {*cok} {onemli*} {bir} {konu}      ← vurgu YOK, yıldızlar VAR
       pakette : "cok onemli bir konu"              ← yıldızlar silinmiş
   Yani kişinin okuduğu metinle yayımladığı metin ayrışıyordu (B3 ile aynı
   sınıf) ve en doğal kullanım — iki kelimeyi vurgulamak — hiç işlemiyordu.
   Yıldızlar gömülü altyazıya da giriyordu.

   ÇÖZÜM: işaretlemeden önce çok kelimeli vurgu kelime başına dağıtılıyor
   (`*çok önemli*` → `*çok* *önemli*`). Kural iki platformda AYNI.

   KASITLI SINIRLAR (ölçüldü, kilitlendi):
     · yıldızın yanında boşluk varsa vurgu sayılmaz → `3 * 4 * 5` çarpma kalır
     · iç içe `*a *b* c*` belirsiz; eski davranış korunuyor
     · eşleşmeyen tek yıldız ekranda duruyor — yazım hatasını gizlemektense
       göstermek yeğ. Bu tek durumda ekran ile paket hâlâ ayrışıyor. */

/* ÇIKARIM GİRİNTİYE KİLİTLİYDİ: Mac desenleri kapanışı `\n  }` diye
   arıyordu, yani fonksiyonun iç boşluğunu iddia ediyorlardı. `vurguYay`
   çekirdeğe taşınıp girintisi değişince desen KOMŞU fonksiyonu da yuttu ve
   test davranış hiç bozulmadan çöktü (bu deponun ölçülmüş 'biçime kilitlenmiş
   desen' sınıfı). Artık süslü parantez sayan `blokKes` kullanılıyor: iddia
   fonksiyonun kendisine bağlı, yazıldığı yere değil. */
function kur(src, adlar){
  const parcalar=[];
  for(const [ad,imza] of adlar){
    const g=blokKes(src, imza);
    ok2('çıkarılabildi: '+ad, !!g);
    if(!g) return null;
    parcalar.push(g);
  }
  return parcalar.join('\n');
}

const telSrc=kur(tel,[
  ['telefon esc',      'function esc('],
  ['telefon bionic',   'function bionic('],
  ['telefon vurguYay', 'function vurguYay('],
  ['telefon markup',   'function markup('],
  ['telefon duzMetin', 'function duzMetin('],
]);
const macSrc=kur(mac,[
  ['Mac escapeHtml',  'function escapeHtml('],
  ['Mac biyonik',     'function biyonik('],
  ['Mac vurguYay',    'function vurguYay('],
  ['Mac isaretle',    'function isaretle('],
]);
if(!telSrc || !macSrc) return;

const T=new Function(telSrc+'; const st={bionic:false}; return {markup,duzMetin,vurguYay};')();
const M=new Function(macSrc+'; const state={biyonik:false}; return {\n'+
  '  isaretle:(satir)=>vurguYay(satir).replace(/\\S+/g,isaretle), vurguYay };')();

/* Görselleştirme: [vurgulu} · {düz} · okunan metin */
const goz = h => h.replace(/<span class="w em"[^>]*>/g,'[').replace(/<span class="w"[^>]*>/g,'{')
                  .replace(/<\/span>/g,'}').replace(/\s+/g,' ').trim();
const okunan = h => h.replace(/<span class="hold"[\s\S]*?<\/span>/g,'')
                     .replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ')
                     .replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'")
                     .replace(/\s+/g,' ').trim();

/* ---------- ASIL BULGU: ÇOK KELİMELİ VURGU ---------- */
{
  const h=T.markup('*cok onemli* bir konu');
  ok2('iki kelimenin İKİSİ de vurgulanıyor', goz(h)==='[cok} [onemli} {bir} {konu}');
  ok2('yıldızlar ekranda kalmıyor', !okunan(h).includes('*'));
  ok2('vurgu dışındaki kelimeler düz kalıyor', goz(h).includes('{bir} {konu}'));
}
{
  const h=T.markup('*bir iki uc*');
  ok2('üç kelimelik vurgu da çalışıyor', goz(h)==='[bir} [iki} [uc}');
}
{
  const h=T.markup('**cok guclu** soz');
  ok2('çift yıldızlı çok kelimeli vurgu da çalışıyor', goz(h)==='[cok} [guclu} {soz}');
}

/* ---------- EKRAN İLE PAKET AYNI ŞEYİ SÖYLÜYOR MU ----------
   B3'te düzeltilen ayrışmanın çok kelimeli hâli. İyi biçimli her girdide
   suflede okunan metin, yayın paketindeki metinle BİREBİR aynı olmalı. */
const IYI_BICIMLI=[
  '*cok onemli* bir konu',
  '*bir iki uc*',
  '**cok guclu** soz',
  '*tek*',
  '*harika*!',
  '(*vurgu*)',
  'once *sonra iki kelime* daha sonra',
  '*Goethe{go-te} bey* geldi',
  'hic vurgu yok burada',
];
for(const t of IYI_BICIMLI){
  ok2('ekran = paket: '+JSON.stringify(t), okunan(T.markup(t))===T.duzMetin(t));
}

/* ---------- İKİ PLATFORM AYNI ÇIKTIYI VERİYOR MU ---------- */
for(const t of IYI_BICIMLI.concat(['*a *b* c*','3 * 4 * 5','yildiz * tek basina'])){
  ok2('telefon = Mac: '+JSON.stringify(t), goz(T.markup(t))===goz(M.isaretle(t)));
}

/* ---------- KASITLI SINIRLAR ---------- */
{
  const h=T.markup('3 * 4 * 5');
  ok2('çarpma işareti vurguya dönüşmüyor', goz(h)==='{3} {*} {4} {*} {5}');
  ok2('çarpmada rakamlar vurgulanmıyor', !/\[/.test(goz(h)));
}
{
  const h=T.markup('yildiz * tek basina');
  ok2('eşleşmeyen tek yıldız olduğu gibi duruyor', okunan(h).includes('*'));
}
{
  /* İç içe: belirsiz girdi, eski davranış korunuyor — sessizce değişmesin. */
  const h=T.markup('*a *b* c*');
  ok2('iç içe vurguda eski davranış korunuyor', goz(h)==='{*a} [b} {c*}');
}
{
  /* DENGESİZ YILDIZ: ilk desenim bunları vurguya çeviriyordu — davranış
     değişikliğini tests/06 ve tests/17 yakaladı. Eski davranış korunuyor. */
  for(const t of ['***x***','***x**','**x***']){
    ok2('dengesiz yıldız vurgu sayılmıyor: '+t, !/class="w em"/.test(T.markup(t)));
    ok2('dengesiz yıldız telefon = Mac: '+t, goz(T.markup(t))===goz(M.isaretle(t)));
  }
}
{
  ok2('boş satır çökertmiyor', T.vurguYay('')==='' && M.vurguYay('')==='');
  ok2('yalnız yıldızlardan oluşan satır çökertmiyor', typeof T.vurguYay('***')==='string');
  ok2('yıldızsız satır aynen dönüyor', T.vurguYay('merhaba dunya')==='merhaba dunya');
}
{
  /* Boşluk korunmalı: dağıtırken kelimeler birbirine yapışırsa iki kelime
     tek belirtece iner ve sesle takip o kelimeyi hiç bulamaz. */
  const y=T.vurguYay('*a b* c');
  ok2('dağıtım kelimeleri birbirine yapıştırmıyor', /\*a\*\s\*b\*\sc/.test(y));
  ok2('belirteç sayısı korunuyor',
     T.markup('*a b* c').match(/class="w/g).length===3);
}

/* ---------- DURAKLAMA VE İPUCU HÂLÂ ÇALIŞIYOR ---------- */
{
  const h=T.markup('bir / iki // uc (2) dort');
  ok2('duraklama işaretleri bozulmadı', (h.match(/class="hold"/g)||[]).length===3);
}
{
  const h=T.markup('*Goethe{go-te} bey*');
  ok2('vurgu içindeki telaffuz ipucu korunuyor', /data-ph="go-te"/.test(h));
  ok2('ipucu süslü parantezleri ekranda kalmıyor', !okunan(h).includes('{'));
}

/* ---------- KAYNAK DÜZEYİ: KURAL İKİ PLATFORMDA AYNI ---------- */
const telRe=(tel.match(/function vurguYay\(satir\)\{[\s\S]*?\n\}/)||[''])[0];
const macRe=(mac.match(/function vurguYay\(satir\)\{[\s\S]*?\n  \}/)||[''])[0];
const desen=/\(\?<!\\\*\)\\\*\{1,2\}\(\?!\\\*\)\(\[\^\\s\*\]/;
ok2('telefon deseni beklenen sınırı taşıyor', desen.test(telRe));
ok2('Mac deseni telefonunkiyle aynı', desen.test(macRe));
ok2('telefon işaretlemesi dağıtımdan geçiyor', /vurguYay\(raw\)\.split/.test(tel));
ok2('Mac işaretlemesi dağıtımdan geçiyor', /vurguYay\(r\)\.replace\(\/\\S\+\/g,isaretle\)/.test(mac));
