const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
const bozmaPy=path.join(REPO,'bozma.py');
const KAYIT=path.join(REPO,'tests','bozmalar.json');

/* M8 — BOZMA TURU OTOMATİKLEŞSİN: her test için en az 1 KANITLI bozma.
   Kural zaten vardı ve işliyordu — ama BİR KEREYE MAHSUS: bozmalar geçici
   betiklerdi, kanıt yalnız commit mesajlarında kaldı. Yarın biri o testi
   gevşetirse kimse fark etmezdi.

   Artık `tests/bozmalar.json` her kaydı taşıyor ve `bozma.py` turu
   koşturuyor: bozuk kopyayı geçici dosyaya yazıp testi ona karşı çalıştırıyor.
   Test GEÇERSE kırmızı — bozma ayırt edilmiyor demektir.

   İlk tur: 21 bozma, 19 test dosyası, hepsi kanıtlandı.

   Bu testin işi turun KENDİSİNİ ölçmek. Bu gece beş kez "hiçbir şey
   ölçmeyen kapı" çıktı; bu kapı da ölçülmeden kabul edilmiyor. */

/* ---------- KAYIT SAĞLIKLI MI ---------- */
ok('bozma betiği depoda', fs.existsSync(bozmaPy));
ok('bozma kaydı depoda', fs.existsSync(KAYIT));
const kayit=JSON.parse(fs.readFileSync(KAYIT,'utf8'));
ok('kayıt boş değil ('+kayit.length+' bozma)', kayit.length>=15);
{
  const testler=new Set(kayit.map(k=>k.test));
  console.log('   '+kayit.length+' bozma · '+testler.size+' test dosyası');
  ok('en az 15 test dosyası kanıtlı ('+testler.size+')', testler.size>=15);
  ok('her kaydın dört alanı tam',
     kayit.every(k=>k.ad && k.test && k.kaynak && typeof k.bul==='string' && typeof k.koy==='string'));
  ok('her kayıt gerçek bir test dosyasına bakıyor',
     kayit.every(k=>fs.existsSync(path.join(REPO,'tests',k.test))));
  /* Kaynak kümesi bozma.py'deki KAYNAK eşlemesiyle AYNI olmalı. Uydurma bir
     ad yazmak bozmayı sessizce hiç koşturmaz — A.1'de tam bunu yaptım,
     'cekirdek' diye olmayan bir kaynak uydurdum ve kapı yakaladı. */
  /* Liste ELLE KOPYALANMIYOR, bozma.py'den ÇIKARILIYOR. Kopya olduğu sürece
     yeni bir kaynak eklendiğinde (bugün 'vitrin') bu test kaynak doğru
     tanımlanmış olmasına rağmen kırmızı veriyordu — yani kusuru değil,
     kendi bayatlığını bildiriyordu. */
  const bozmaPy = fs.readFileSync(path.join(REPO,'bozma.py'),'utf8');
  const govde = (bozmaPy.match(/KAYNAK\s*=\s*\{([\s\S]*?)\n\}/)||['',''])[1];
  /* Alt çizgili anahtar da geçerli (`magaza_teknik`): `[a-z]+` onu görmüyordu
     ve kaynak DOĞRU tanımlıyken 'uydurma' diye kırmızı verdi. */
  const KAYNAKLAR = [...govde.matchAll(/^\s*'([a-z_]+)':/gm)].map(m=>m[1]);
  ok('bozma.py KAYNAK eşlemesi okunabildi (ölçmeyen kapı değil) — '+KAYNAKLAR.length,
     KAYNAKLAR.length >= 6 && KAYNAKLAR.includes('telefon') && KAYNAKLAR.includes('mac'));
  const uydurma = [...new Set(kayit.map(k=>k.kaynak))].filter(k=>!KAYNAKLAR.includes(k));
  ok('kaynak adı bozma.py KAYNAK eşlemesinde tanımlı — uydurma: '+uydurma.join(','),
     uydurma.length === 0);
  ok('hiçbir bozma boş değil (bul ile koy aynı olamaz)',
     kayit.every(k=>k.bul!==k.koy && k.bul.length>0));
  /* İki platform da temsil edilmeli — yoksa Mac tarafı hiç sınanmaz. */
  ok('Mac tarafında da bozma var', kayit.some(k=>k.kaynak==='mac'));
  ok('telefon tarafında da bozma var', kayit.some(k=>k.kaynak==='telefon'));
}

/* ---------- BETİĞİ KOŞTUR ---------- */
function kos(args, kayitIcerik){
  const eski=fs.readFileSync(KAYIT,'utf8');
  if(kayitIcerik!==undefined) fs.writeFileSync(KAYIT, kayitIcerik);
  let cikti='', kod=0;
  try{ cikti=execFileSync('python3',[bozmaPy,...args],{cwd:REPO,encoding:'utf8'}); }
  catch(e){ cikti=(e.stdout||'')+(e.stderr||''); kod=e.status||1; }
  fs.writeFileSync(KAYIT, eski);
  return {cikti, kod};
}
{
  /* Tek bir kaydı koştur: gerçekten kırıyor mu. */
  const r=kos(['66']);
  ok('gerçek bozma testi KIRIYOR', r.kod===0 && /kırıldı/.test(r.cikti));
  ok('hangi test kırıldığı yazılıyor', /66-uzun-kelime-tasmasi\.js kırıldı/.test(r.cikti));
}
{
  /* AYIRT ETMEYEN BOZMA YAKALANMALI: hiçbir şeyi değiştirmeyen bir
     değişiklik testi kırmaz, tur bunu kırmızı vermeli. */
  const sahte=[{ad:'etkisiz', test:'66-uzun-kelime-tasmasi.js', kaynak:'telefon',
    bul:'<title>', koy:'<title >'}];
  const r=kos([], JSON.stringify(sahte));
  ok('ayırt etmeyen bozma KIRMIZI veriyor', r.kod===1);
  ok('sebebi söyleniyor', /bozma YAKALANMADI/.test(r.cikti));
}
{
  /* BOZMA İNMEZSE SESSİZ KALMAMALI — bu gece iki kez yanlış bloğa
     bozma uygulayıp yanılmıştım. */
  const sahte=[{ad:'hedef yok', test:'66-uzun-kelime-tasmasi.js', kaynak:'telefon',
    bul:'BOYLE_BIR_METIN_YOK_12345', koy:'x'}];
  const r=kos([], JSON.stringify(sahte));
  ok('hedef bulunamazsa KIRMIZI', r.kod===1);
  ok('kaç kez bulunduğu söyleniyor', /hedef metin 0 kez bulundu/.test(r.cikti));
}
{
  /* Hedef BİRDEN ÇOK kez geçiyorsa da durmalı: replace(...,1) ilkini
     seçer ve yanlış yeri bozar. */
  const sahte=[{ad:'çok eşleşme', test:'66-uzun-kelime-tasmasi.js', kaynak:'telefon',
    bul:'const ', koy:'let '}];
  const r=kos([], JSON.stringify(sahte));
  ok('hedef birden çok kez geçiyorsa KIRMIZI', r.kod===1);
}
{
  const r=kos([], '[]');
  ok('kayıt boşsa KIRMIZI (sessizce yeşil demiyor)', r.kod===1);
  ok('boş kaydın sebebi yazılıyor', /hiçbir şey ölçülmedi/.test(r.cikti));
}

/* ---------- KAPIYA BAĞLI MI ---------- */
{
  const sh=fs.readFileSync(path.join(REPO,'kapi.sh'),'utf8');
  ok('kapıda bozma adımı var', /say "\d+\/\d+ Kasıtlı bozma turu"/.test(sh));
  ok('bozma betiği çağrılıyor', /python3 bozma\.py \|\| KOD=1/.test(sh));
  const etiketler=[...sh.matchAll(/say "(\d+)\/(\d+) /g)];
  const toplamlar=[...new Set(etiketler.map(m=>m[2]))];
  ok('adım etiketleri tutarlı ('+etiketler.length+' adım)',
     toplamlar.length===1 && +toplamlar[0]===etiketler.length);
}

/* ---------- BOZMA TURU O TESTE ULAŞABİLİYOR MU ---------- */
{
  /* ÖLÇÜLDÜ (2026-08-16): kapının 8. adımı dosyayı geçici kopyada bozup
     testin ayırt ettiğini kanıtlıyor — ama test dosyayı DOĞRUDAN depodan
     okuyorsa bozmayı hiç görmez. `tests/28` tam bunu yapıyordu: `sw.js`
     bozulmuş, test sağlam dosyayı okumuş ve "bozma yakalanmadı" demişti.
     Yani en kritik kaynaklarımız (service worker, sözlük, gizlilik belgesi,
     jetonlar) için bozma turu SESSİZCE etkisizdi — kapının kendi kör noktası.
     Ölçülen: 19 (test, kaynak) çifti korumasızdı; hepsi env destekli okumaya
     taşındı ve bu iddia sıfırda kilitliyor. */
  const bozmaPy_metni=fs.readFileSync(bozmaPy,'utf8');
  const kaynakGovde=(bozmaPy_metni.match(/KAYNAK = \{([\s\S]*?)\n\}/)||['',''])[1];
  const KAYNAKLAR2=[...kaynakGovde.matchAll(/'([a-z_]+)':\s*\(os\.path\.join\(REPO,\s*([^)]*)\),\s*'([A-Z_]+)'\)/g)]
    .map(m=>({ad:m[1], dosya:m[2].replace(/['\s]/g,'').split(',').pop(), env:m[3]}));
  ok('KAYNAK tablosu ayrıştırıldı ('+KAYNAKLAR2.length+')', KAYNAKLAR2.length>=15);

  /* ÖLÇÜLDÜ (2026-08-16): `cekirdek/mesajlar.js`, `mac-mesajlar.js` ve
     `ikonlar.html` KAYNAK tablosunda HİÇ yoktu. Yani kullanıcıya gösterilen
     bütün uyarı metinleri bozma turunun DIŞINDAYDI: bir testin o metinleri
     gerçekten ölçüp ölçmediği kanıtlanamıyordu ve "kaynak adı uydurma" hatası
     bunu ancak biri o kaynağı yazmaya kalkışınca söylüyordu.
     Çekirdek TAMAMEN bozulabilir olmalı — orası iki kabuğun ortak beyni. */
  const cekDizin=path.join(REPO,'cekirdek');
  const tabloDosyalari=new Set(KAYNAKLAR2.map(k=>k.dosya));
  const eksikler=(dosyalar, tablo)=>dosyalar.filter(f=>!tablo.has(f));
  /* Denetimin kendisi de sınanıyor: bu iddiayı kasıtlı bozmayla kanıtlamak
     mümkün değil (tests/115 KAYNAK tablosunda yok, yani kendi kendini
     bozduramaz), o yüzden sentetik örnekle ölçülüyor. */
  ok('eksik dosya denetimi çalışıyor',
     eksikler(['var.js','yok.js'], new Set(['var.js'])).join()==='yok.js');
  ok('tam tabloda eksik bildirmiyor',
     eksikler(['var.js'], new Set(['var.js'])).length===0);
  const eksik=eksikler(fs.readdirSync(cekDizin), tabloDosyalari);
  ok('çekirdeğin her dosyası bozulabilir'+(eksik.length?' — eksik: '+eksik.join(', '):''),
     eksik.length===0);
  const testDizin=path.join(REPO,'tests');
  const tara=(dosyalar)=>{
    const bulunan=[];
    for(const [f,metin] of dosyalar) for(const k of KAYNAKLAR2){
      /* Telefon ve Mac normalde `kaynak.js` (telefonYolu/macYolu) üzerinden
         env destekli okunuyor. AMA doğrudan `path.join(REPO,'index.html')`
         yazan bir test yine bozmayı görmez — 2026-08-16 sabahı `tests/116`
         tam bunu yapıyordu. O yüzden telefon/mac için de DOĞRUDAN okuma
         aranıyor; `kaynak.js` üzerinden okuyanlar zaten bu desene uymuyor. */
      if((k.ad==='telefon'||k.ad==='mac') &&
         !new RegExp("readFileSync\\(path\\.join\\(REPO,\\s*'"+k.dosya.replace('.','\\.')+"'").test(metin))
        continue;
      /* Dosyayı GERÇEKTEN okuyan bir çağrı olmalı: yalnız adı geçmesi
         (dışlama listesi, yorum) kusur değil — ilk sürüm böyle iki sahte
         ihlal üretmişti ve sahte ihlal, gerçek olanı gizler. */
      const okuyor=new RegExp("(readFileSync|oku|repoOku|cekirdekOku)\\([^\\n]*'"+
        k.dosya.replace('.','\\.')+"'").test(metin);
      if(okuyor && !metin.includes(k.env))
        bulunan.push(f+' → '+k.dosya+' ('+k.env+')');
    }
    return bulunan;
  };

  /* TARAYICININ KENDİSİ ÖLÇÜLÜYOR. Bu iddiayı kasıtlı bozmayla kanıtlamak
     mümkün değil (bozma turu yalnız KAYNAK tablosundaki dosyaları bozabiliyor,
     testleri değil), o yüzden tarayıcı sentetik örneklerle sınanıyor:
     görmezse kapı sessizce yeşil kalırdı. */
  ok('tarayıcı korumasız okumayı görüyor',
     tara([['sahte-kotu.js', "const s=fs.readFileSync(path.join(REPO,'sw"+".js'),'utf8');"]]).length===1);
  ok('tarayıcı env destekli okumayı görmezden geliyor',
     tara([['sahte-iyi.js', "const s=repoOku('sw"+".js','SUFLE_SW');"]]).length===0);
  ok('tarayıcı yalnız ADI geçen dosyayı ihlal saymıyor',
     tara([['sahte-anma.js', "/* sw"+".js hakkinda bir yorum */ const x=1;"]]).length===0);
  /* Telefon/Mac için de: kaynak.js üzerinden okuyan temiz, doğrudan yoldan
     okuyan ihlal. İkisi de sınanıyor çünkü ayrım tam burada yaşıyor. */
  ok('tarayıcı telefonu doğrudan okuyan testi yakalıyor',
     tara([['sahte-tel.js', "const v=fs.readFileSync(path.join(REPO,'index"+".html'),'utf8');"]]).length===1);
  ok('tarayıcı kaynak.js üzerinden okumayı ihlal saymıyor',
     tara([['sahte-tel2.js', "const v=oku(telefonYolu());"]]).length===0);

  /* SENTETİK ÖRNEKLER PARÇALI YAZILDI (`'sw'+'.js'`): tam hâliyle yazılınca
     tarayıcı KENDİ dosyasını ihlal sayıyordu — ölçüm aracının kendi metnini
     ölçmesi bu depoda üçüncü kez çıkan tuzak. */
  const dosyalar=fs.readdirSync(testDizin).filter(a=>/^\d+.*\.js$/.test(a))
    .map(f=>[f, fs.readFileSync(path.join(testDizin,f),'utf8')]);
  const korumasiz=tara(dosyalar);
  ok('bozulabilir kaynağı env desteksiz okuyan test yok'+
     (korumasiz.length?' — '+korumasiz.slice(0,4).join(' · '):''), korumasiz.length===0);
}

/* ---------- ÇEKİM AKIŞI ÖLÇÜMÜ SİLAHLI MI ---------- */
{
  /* Kapının 10. adımı kullanıcının gerçek zincirini koşturuyor: kamera →
     kayıt → sonuç → altyazı → arşiv. Bu ölçüm gevşetilirse zincir sessizce
     ölçülmez olur ve diğer dokuz adım yeşil kalmaya devam eder — `kontrast.py`
     ile aynı sınıf, o da bu yüzden bozulabilir kaynaklara alınmıştı. */
  const kyol=process.env.SUFLE_KAYIT_OLCUM || path.join(REPO,'kayit.py');
  if(process.env.SUFLE_KAYIT_OLCUM && !fs.existsSync(process.env.SUFLE_KAYIT_OLCUM))
    throw new Error('Verilen yol yok: '+process.env.SUFLE_KAYIT_OLCUM);
  const ky=fs.readFileSync(kyol,'utf8');
  ok('çekim akışı ölçümü depoda', ky.length>800);
  const kapiMetni=fs.readFileSync(path.join(REPO,'kapi.sh'),'utf8');
  ok('kapı bu adımı çağırıyor', /python3 kayit\.py/.test(kapiMetni));
  ok('Chrome yoksa atlandığı SÖYLENİYOR', /ATLANDI: Chrome yok — çekim akışı/.test(kapiMetni));
  /* BEŞ HALKANIN BEŞİ DE ÖLÇÜLMELİ: biri düşerse o halka sessizce korumasız
     kalır ve "uçtan uca ölçtük" cümlesi yalan olur. */
  const HALKA=[['kamera', /kamera açılmadı/], ['kayıt', /kayıt başlamadı/],
               ['sonuç ekranı', /sonuç ekranı gelmedi/], ['altyazı', /altyazı üretilmedi/],
               ['arşiv', /çekim arşive yazılmadı/], ['hata günlüğü', /hata günlüğü boş değil/],
               /* FAZ G'nin amiral özelliği: altyazının videoya GERÇEKTEN
                  gömüldüğü, çıktı tuvalinden ölçülüyor (A/B). */
               ['altyazı gömme', /altyazı videoya GÖMÜLMEDİ/],
               ['gömme kapalıyken ölü tampon', /çıktı tuvali kompozit boyutuna ayrılmış/],
               /* G.4 marka kiti: alt bandın gerçekten çizildiği de ölçülüyor. */
               ['marka alt bandı', /alt bant videoya ÇİZİLMEDİ/],
               ['marka kapalıyken tampon', /marka kapalıyken çıktı tuvali ayrılmış/],
               /* Yeşil ekran: perdenin gerçekten silindiği ve kapalıyken
                  görüntünün olduğu gibi geçtiği ölçülüyor (A/B). */
               ['yeşil perde silme', /yeşil perde SİLİNMEDİ/],
               ['chroma kapalıyken geçiş', /chroma kapalıyken görüntü yine de değişmiş/]];
  for(const [ad,re] of HALKA) ok('çekim ölçümü '+ad+' halkasını kontrol ediyor', re.test(ky));
  /* Kırık halkada kırmızı vermeli: yalnız yazdırıp geçmek en sessiz kusur. */
  ok('kırık halkada sıfırdan farklı çıkış', /return 1 if kirik else 0/.test(ky));
  ok('her kırık halka sayacı artırıyor', (ky.match(/kirik \+= 1/g)||[]).length>=11);
  /* Kompozit ölçümü A/B koşuyor: yalnız açık hâli ölçmek, kapalıyken de
     çizen bir kusuru göremezdi. */
  ok('gömme ölçümü A/B koşuyor', /for gomme in \(True, False\)/.test(ky));
  ok('gömme ölçümü alt şeridi de kontrol ediyor', /altta/.test(ky));
  /* Ölçümün kendi dersi de saklanıyor: durum enjekte etmek yerine arayüzü
     kullanmak — kapanış kaydı yazdığımızın üstüne yazıyordu. */
  ok('marka ölçümü arayüzü kullanıyor', /#markaAd/.test(ky) && /#markaBantSw/.test(ky));
  ok('hata günlüğü doluysa İÇERİĞİ yazdırılıyor', /hata içeriği/.test(ky));
  /* Yeşil ekran ölçümü GERÇEK yeşil bir görüntüyle koşmalı: sahte kamera
     deseniyle 'perde silindi' demek ölçmeden iddia etmek olurdu. */
  ok('yeşil ekran ölçümü düz yeşil kaynak üretiyor', /YUV4MPEG2/.test(ky));
  ok('yeşil ekran ölçümü o kaynağı tarayıcıya veriyor', /Tarayici\(cekim=y4m\)/.test(ky));
  /* ALTYAZI ANLIK: tek kare örneklemek kararsızdı (aynı kod bir koşuda 819
     piksel, diğerinde 0 verdi). Ölçüm birkaç saniye örnekliyor; bu bir
     gevşetme değil, iddianın doğru ifadesi: 'çekim boyunca gömülüyor mu'. */
  ok('gömme ölçümü tek kareye takılmıyor (örnekleme var)',
     /for _ in range\(12\)/.test(ky) && /beyaz', 0\) >= 100/.test(ky));
  ok('yeşil ekran ölçümü 2B tuvalden okuyor (WebGL tamponu boş döner)',
     /compOut/.test(ky));
}

/* ---------- KANITLI TEST SAYISI DÜŞMESİN ---------- */
{
  const tb=path.join(REPO,'tests','bozma-taban.json');
  ok('bozma tabanı yazılmış', fs.existsSync(tb));
  if(fs.existsSync(tb)){
    const t=JSON.parse(fs.readFileSync(tb,'utf8'));
    ok('taban gerçek bir sayı', Number.isInteger(t.kanitli) && t.kanitli>=15);
    const testler=new Set(kayit.map(k=>k.test));
    ok('şu anki kanıtlı sayı tabanın altında değil', testler.size>=t.kanitli);
  }
  const py=fs.readFileSync(bozmaPy,'utf8');
  ok('düşüş kontrolü var', /if kapsanan < eski:/.test(py));
  ok('taban yalnız yukarı gidiyor', /max\(eski, kapsanan\)/.test(py));
  ok('kırıkken taban yazılmıyor', /elif not kirik:/.test(py));
  ok('süzgeçle koşarken taban güncellenmiyor (yarım tur tabanı bozmasın)',
     /if suzgec is None:/.test(py));
}
