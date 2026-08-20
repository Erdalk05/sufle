const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cekirdekOku}=require('./kaynak');

/* TİPOGRAFİK RİTİM — ÖLÇÜT (2026-08-20).

   `EKSIKLER` listesinde "UI tipografik ritim" maddesi **ölçütü tanımlı değil**
   diye duruyordu — altın kaydırma ile aynı sınıf. Önce ölçüt yazıldı:

     ÇİZİLEN HER METNİN BOYU, TİPOGRAFİ ÖLÇEĞİNDEKİ BİR ADIM OLMALI.

   Neden bu ölçüt: 11 ile 12 px arasındaki fark tek başına görünmez, ama
   yan yana duran iki yüzey farklı adımlar kullandığında arayüz "aynı elden
   çıkmamış" gibi okunur. Ölçek zaten `cekirdek/jetonlar.css`te yazılıydı ve
   dosyanın kendi yorumu *"Bugün 11/12/13/14/15px karışık kullanılıyor"*
   diyordu — yani sorun biliniyordu ama kimse ÖLÇMÜYORDU.

   ÖLÇÜLDÜ (gerçek tarayıcı, çizilmiş arayüz):
     telefon giriş   → 11/13/15/19/30   ölçek içinde
     telefon ayarlar → 10 px bir öge ölçek DIŞI
     masaüstü ana    → 11/12/13/14/16 · **41 öge 12 pxte, 10 öge 14 pxte**
   Yani ölçek telefonda uygulanmış, masaüstünde hiç uygulanmamıştı.

   BİR ADIM ÖLÇEREK EKLENDİ, KAÇAMAK OLARAK DEĞİL: alt çubuğun düğme
   altı adları 360 px genişlikte 11 px ile ÇAKIŞIYOR ("Senaryo" ile
   "Hazır mıyım"), 10 px ile çakışmıyor. O yüzden `--tx-2xs` ölçeğin
   parçası oldu — ölçüm yorumda yazılı.

   BU DOSYA KAYNAĞI ölçüyor (ölçek dışı sabit kalmasın); ÇİZİLMİŞ ekranı
   `kontrast.py` ölçüyor (bir yerde `style` ile geri gelmesin). İkisi
   birlikte ölçüt: biri kaynağı, diğeri sonucu tutuyor. */

const JETON=cekirdekOku('jetonlar.css','SUFLE_JETON');
const tel=oku(telefonYolu()), mac=oku(macYolu());

/* ---------- 1) ÖLÇEĞİN KENDİSİ ---------- */
const adimlar=[...JETON.matchAll(/--tx-([a-z0-9]+)\s*:\s*(\d+)px/g)]
  .map(m=>({ad:m[1], px:+m[2]}));
ok('tipografi ölçeği okunabildi ('+adimlar.length+' adım)', adimlar.length>=5);
ok('ölçek 8 adımı geçmiyor (adım enflasyonu = ölçek yok demektir)', adimlar.length<=8);
{
  const px=adimlar.map(a=>a.px);
  ok('adımlar birbirinden farklı ('+px.join('/')+')', new Set(px).size===px.length);
  ok('en küçük adım 10 pxin altına inmiyor', Math.min(...px)>=10);
  /* Mikro etiket adımı ÖLÇÜMÜNÜ yanında taşımalı: gerekçesiz bir adım,
     bir sonraki turda "zaten ölçek dışıydı" diye çoğalır. */
  ok('mikro etiket adımı var (--tx-2xs)', px.includes(10));
  /* ADIN KENDİSİ DE SÖZLEŞMEDİR. Bir adımı yeniden adlandırmak, ona
     `var()` ile bağlanan her yeri SESSİZCE tarayıcı varsayılanına düşürür:
     CSS tanımsız değişkende hata vermez, miras alınan boyu kullanır ve
     ekran "biraz farklı" görünür. Bu yüzden kabuklarda kullanılan HER
     adım tanımlı olmalı — kasıtlı bozma turunda tam bu boşluk çıktı. */
  const tanimli=new Set(adimlar.map(a=>'--tx-'+a.ad));
  const kullanilan=[...new Set([...(tel+mac).matchAll(/var\((--tx-[a-z0-9]+)\)/g)].map(m=>m[1]))];
  ok('kabuklar ölçek adımı kullanıyor ('+kullanilan.length+' ayrı adım)', kullanilan.length>=5);
  const tanimsiz=kullanilan.filter(k=>!tanimli.has(k));
  ok('kullanılan her ölçek adımı TANIMLI'+
     (tanimsiz.length?' — tanımsız: '+tanimsiz.join(', '):''), tanimsiz.length===0);
  ok('mikro etiket adımının gerekçesi yazılı (çakışma ölçümü)',
     /11 px ile YAN YANA ÇAKIŞIYOR/.test(JETON));
}

/* ---------- 2) KAYNAKTA SABİT YAZI BOYU ----------
   Ölçüt: `font-size:<sayı>px` yalnız GEREKÇESİ YAZILI muafiyetlerde.
   Görüntü birimi (vw/vh) ölçek sorusu değil — sayaç ekranı kaplıyor. */
const MUAF=[
  { desen:/font-size:16px/, kabuk:'telefon',
    /* iOS, 16 pxin altındaki yazı kutusuna odaklanınca sayfayı ZUMLUYOR.
       Bu bir tasarım tercihi değil, platform kuralı. */
    gerekce:/16 px BİLEREK ölçek dışı: iOS/ },
];
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  /* Gömülü çekirdek bloğu da dahil: ölçek dışı bir sabit oraya yazılırsa
     iki kabuğu birden vurur. */
  const bulunan=[...src.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m=>m[0]);
  const muafOlmayan=bulunan.filter(x=>!MUAF.some(u=>u.kabuk===ad && u.desen.test(x)));
  ok(ad+': ölçek dışı sabit yazı boyu yok'+
     (muafOlmayan.length?' — '+muafOlmayan.slice(0,6).join(', '):'')+
     ' (toplam sabit '+bulunan.length+')', muafOlmayan.length===0);
  /* Muafiyetin GEREKÇESİ kaynakta duruyor mu: gerekçesiz muafiyet,
     bir sonraki turda kuralın kendisini siler. */
  for(const u of MUAF.filter(u=>u.kabuk===ad))
    ok(ad+': muafiyetin gerekçesi kaynakta yazılı', u.gerekce.test(src));
}
/* Dedektörün kendi ayırt ediciliği: deseni bulamayan bir tarayıcı her zaman
   temiz der ve ölçüt sonsuza kadar yeşil kalır. */
ok('desen gerçek bir sabit boyu yakalıyor',
   /font-size:\s*(\d+(?:\.\d+)?)px/.test('  .x{font-size:12px}'));
ok('jetonla yazılmış boy yanlış alarm vermiyor',
   !/font-size:\s*(\d+(?:\.\d+)?)px/.test('  .x{font-size:var(--tx-sm)}'));

/* ---------- 3) GÖRÜNTÜ BİRİMİ AYRI BİR ŞEY ----------
   Geri sayım sayacı ekranı kaplıyor; onu ölçeğe sokmak sayacı küçültürdü.
   Ölçüt "ölçekte olsun" değil, "SEÇİLMİŞ olsun" — vw/vh seçilmiş bir karar. */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': geri sayım görüntü birimiyle ölçekleniyor',
     /#count\{[^}]*font-size:\d+v[wh]/.test(src.replace(/\s*\n\s*/g,'')));
}

/* ---------- 4) İKİ KABUK AYNI ÖLÇEĞİ KULLANIYOR ----------
   Ölçek `jetonlar.css`te tek kaynak; iki kabuk da onu gömüyor. Biri kendi
   kopyasını tutsaydı bir adımı değiştirmek yalnız bir platformu değiştirir
   ve iki ekran zamanla ayrışırdı — deponun 1 numaralı hata sınıfı. */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': tipografi ölçeği kabuğa gömülü',
     /==CEKIRDEK:jetonlar\.css==[\s\S]*--tx-2xs/.test(src));
  const kullanim=(src.match(/var\(--tx-[a-z0-9]+\)/g)||[]).length;
  ok(ad+': ölçek gerçekten kullanılıyor ('+kullanim+' yer)', kullanim>=25);
}

/* ---------- 5) ÇİZİLMİŞ TARAFI ÖLÇEN NÖBETÇİ DURUYOR MU ----------
   Bu dosya yalnız KAYNAĞI tutuyor. Ölçüt tam olsun diye çizilmiş ekranı
   `kontrast.py` ölçüyor; o pas sessizce silinirse kaynak temiz görünürken
   satır içi `style` ya da JS ile ölçek dışı bir boy geri gelebilir ve
   hiçbir kapı bunu söylemez. Nöbetçinin varlığı da bir iddiadır. */
{
  const K=require('./kaynak').repoOku('kontrast.py','SUFLE_KONTRAST');
  ok('çizilmiş ekran ölçek dışı boyu ölçüyor', /ritim\.push\(/.test(K));
  ok('ölçek dışı boy TABANA göre ratchetlanıyor',
     /ölçek dışı yazı boyu ARTTI/.test(K));
  /* Ölçek İKİNCİ BİR KOPYA olarak yazılmamalı: kopya, ölçek değişince
     nöbetçinin eski ölçeği savunması demek (bu depoda ölçülmüş sınıf). */
  ok('çizilmiş ölçüm ölçeği tek kaynaktan okuyor',
     /jetonlar\.css/.test(K) && /--tx-\[a-z0-9\]\+/.test(K));
  ok('ölçek okunamazsa açıkça duruyor', /ölçmeyen denetim/.test(K));
}
