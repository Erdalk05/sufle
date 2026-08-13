const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* KAYIT SIRASINDA ENGELLEYİCİ PENCERE
   alert / prompt / confirm ana iş parçacığını durdurur. Bu uygulamada iki
   ayrı requestAnimationFrame döngüsü buna bağlı:
     1) sufleyi kaydıran tick()
     2) KAYDI BESLEYEN kırpma/kompozit boru hattı
   İkincisi durunca capOut beslenmez ve kaydedilen görüntü tek karede DONAR;
   MediaRecorder ise yazmaya devam eder. Kodun kendi yorumu bunu söylüyor:
   "capOut beslenmeye devam etmeli, yoksa donar."

   Yani çekimin ortasında "Çekimlerim" ya da "Hazır mıyım"a basmak videoyu
   bozuyordu. Çekim anı bu üründe geri alınamaz an — bu yüzden P0.

   Bu dosya tek tek düğme saymıyor: KAYNAKTAKİ HER engelleyici çağrıyı
   buluyor ve korumasız olanı adıyla raporluyor. Yarın yeni bir pencere
   eklenirse kapı kendiliğinden kırmızıya döner. */

/* Yorumları at: açıklama metinlerindeki "alert(" gerçek çağrı sanılmasın
   (bu depoda daha önce iki kez oldu). */
const kodla = s => s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');

/* Engelleyici çağrıyı içeren fonksiyonu bulur: çağrının satırından geriye
   doğru en yakın fonksiyon başlığı. */
function diyalogSahipleri(src){
  const kod = kodla(src);
  const satirlar = kod.split('\n');
  const bulunan = [];
  let sonFn = '(üst düzey)', sonFnSatir = -1;
  satirlar.forEach((satir, i) => {
    const f = satir.match(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (f) { sonFn = f[1]; sonFnSatir = i; }
    if (/\b(alert|confirm|prompt)\s*\(/.test(satir)) {
      bulunan.push({ ad: sonFn, satir: i + 1, govdeBasi: sonFnSatir, kod });
    }
  });
  return bulunan;
}

/* Fonksiyonun gövdesinde kayıt koruması var mı?
   İki deyim de kabul: Mac'in diyalogKapisi() yardımcısı, telefonun
   doğrudan rec.state kontrolü. */
function korumaliMi(kod, govdeBasi, cagriSatiri){
  const satirlar = kod.split('\n');
  const bas = Math.max(0, govdeBasi);
  const blok = satirlar.slice(bas, cagriSatiri).join('\n');
  return /diyalogKapisi\(\)/.test(blok) ||
         /(rec|recorder)\s*&&\s*\1\.state===['"]recording['"]/.test(blok) ||
         /(rec|recorder)\.state===['"]recording['"]/.test(blok);
}

for (const [ad, src] of [['telefon', tel], ['Mac', mac]]) {
  const hepsi = diyalogSahipleri(src);
  ok(ad+': engelleyici pencere çağrısı bulundu ('+hepsi.length+' adet: '+
     [...new Set(hepsi.map(x=>x.ad))].join(', ')+')', hepsi.length > 0);

  /* Açılışta koşan kod kayıt sırasında olamaz — muaf.
     Muafiyet GEREKÇELİ olmalı, sessiz atlama değil. */
  const MUAF = { fromShortcut:'açılışta bir kez koşar, kayıt henüz başlamamıştır',
                 firstRun:'açılıştan 1,4 sn sonra koşar, kayıt henüz başlamamıştır',
                 logErr:'hata günlüğü tıklaması — kendi içinde korumalı' };
  const denetlenecek = hepsi.filter(x => !MUAF[x.ad]);
  const korumasiz = denetlenecek.filter(x => !korumaliMi(x.kod, x.govdeBasi, x.satir));
  ok(ad+': kayıt sırasında açılabilen her pencere korumalı'+
     (korumasiz.length ? ' — KORUMASIZ: '+korumasiz.map(x=>x.ad+' (satır '+x.satir+')').join(', ') : ''),
     korumasiz.length === 0);
}

/* ---------- MAC: ORTAK KAPI GERÇEKTEN İŞ GÖRÜYOR MU ----------
   diyalogKapisi() true dönüp çağıranı durdurmalı; yalnızca toast gösterip
   akışa devam etseydi pencere yine açılırdı. */
const macKod = kodla(mac);
ok('Mac: ortak kapı tanımlı', /function diyalogKapisi\(\)\{/.test(macKod));

/* Kapıyı GERÇEKTEN KOŞTURUYORUZ.
   Önce yalnız desen varlığına bakıyordum ve kasıtlı bozma turunda kaçırdım:
   fonksiyonun başına bir `return false;` eklendiğinde kapı tümüyle etkisiz
   kalıyordu ama aradığım satır hâlâ yerinde durduğu için test geçiyordu.
   Varlık testinin klasik yalanı — 17-kritik-degerler'in dersi. */
const {cikar} = require('./kaynak');
function kapiyiKos(recorder){
  const izler = [];
  const kur = new Function('__rec','__iz', `
    const recorder=__rec;
    const toast=m=>__iz.push(m);
    ${cikar(mac, /function kayitSuruyor\(\)\{[^\n]*\}/, 'kayitSuruyor')}
    ${cikar(mac, /function diyalogKapisi\(\)\{[\s\S]*?\n  \}/, 'diyalogKapisi')}
    return diyalogKapisi();
  `);
  return { engelledi: kur(recorder, izler), izler };
}
const kayitYok = kapiyiKos(null);
ok('Mac: kayıt yokken kapı ENGELLEMİYOR', kayitYok.engelledi === false);
ok('Mac: kayıt yokken uyarı da göstermiyor', kayitYok.izler.length === 0);

const bekliyor = kapiyiKos({state:'inactive'});
ok('Mac: kayıt duraklamış/bitmişken engellemiyor', bekliyor.engelledi === false);

const kayitVar = kapiyiKos({state:'recording'});
ok('Mac: kayıt sürerken kapı ENGELLİYOR', kayitVar.engelledi === true);
ok('Mac: engellerken sebebini söylüyor (sessizce yutmuyor)',
   kayitVar.izler.length === 1 && /Kayıt sürerken/.test(kayitVar.izler[0]));
/* Kapı çağrılıp dönüş değeri kullanılmazsa (if olmadan) hiçbir şey engellenmez.
   `function ` öneki hariç tutuluyor: tanımın kendisi çağrı değil. */
const kapisizCagri = (macKod.match(/(?<!if\()(?<!function )diyalogKapisi\(\)/g) || []).length;
ok('Mac: kapının dönüşü her yerde if ile kullanılıyor'+
   (kapisizCagri ? ' — '+kapisizCagri+' çıplak çağrı' : ''), kapisizCagri === 0);

/* ---------- TELEFON: KULLANICIYA SEBEP SÖYLENİYOR ----------
   Sessizce hiçbir şey yapmayan düğme "bozuk" sanılır. */
ok('telefon: engelleme mesajı iki dilde tanımlı',
   /dlgBusy:'[^']+'/.test(tel) && (tel.match(/dlgBusy:'/g)||[]).length >= 2);
ok('telefon: engelleme mesajı kullanılıyor', /toast\(m\('dlgBusy'\)\)/.test(tel));
ok('Mac: engelleme mesajı kullanıcıya gösteriliyor',
   /toast\('⛔ Kayıt sürerken bu pencere açılamaz/.test(mac));
