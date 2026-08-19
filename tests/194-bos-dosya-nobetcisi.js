const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const REPO=path.join(__dirname,'..');

/* BOŞ DOSYA NÖBETÇİSİ — 19 Ağustos 2026 olayından sonra yazıldı.

   NE OLDU: depo `~/Desktop` altındaydı ve macOS, disk %98 dolunca iCloud'a
   yüklediği dosyaların yerel içeriğini attı (`dataless`). Geri indirme
   başarısız oldu. Sonuç: `ls` doğru boyutu gösteriyor, `open().read()`
   **0 bayt** dönüyor ve HİÇBİR ŞEY HATA VERMİYOR.

   NEDEN BU KAPININ EN TEHLİKELİ AÇIĞI: boşalan dosyalardan biri bir TESTTİ.
   Boş test hiçbir iddia koşmaz, hiçbir satır basmaz ve **çıkış kodu 0**
   döner — yani koşturucu onu "geçti" sayar. O gün gerçek kusuru yalnız
   tesadüfen bir kasıtlı bozmanın YAKALANMAMASI ortaya çıkardı. Kapı kendi
   ölçüm aletinin boşaldığını göremiyordu.

   ÖLÇÜT: `stat` boyutu ile GERÇEKTEN okunan bayt sayısı. İkisi ayrışıyorsa
   dosya okunamıyor demektir — sebebi ne olursa olsun (bulut atımı, disk
   hatası, yarım yazılmış dosya) kapı kırmızı olmalı.

   Ayrıca "boyutu 0 ama olmaması gereken" dosyalar da yakalanıyor: bir test
   dosyasının 0 bayt olması her zaman kusurdur. */

const ATLA=new Set(['.git','node_modules','__pycache__','.build']);
const dosyalar=[];
(function tara(dizin){
  for(const g of fs.readdirSync(dizin,{withFileTypes:true})){
    if(ATLA.has(g.name)) continue;
    const y=path.join(dizin,g.name);
    if(g.isDirectory()) tara(y);
    else if(g.isFile()) dosyalar.push(y);
  }
})(REPO);

ok('depoda ölçülecek dosya var', dosyalar.length>100);

/* 1) STAT ↔ OKUMA AYRIŞMASI — olayın imzası. */
const ayrisan=[];
for(const y of dosyalar){
  let boyut=0, okunan=-1;
  try{ boyut=fs.statSync(y).size; okunan=fs.readFileSync(y).length; }
  catch(_){ okunan=-1; }
  if(okunan!==boyut) ayrisan.push(path.relative(REPO,y)+' (stat '+boyut+' · okunan '+okunan+')');
}
ok('her dosyanın stat boyutu ile okunan bayt sayısı aynı'+
   (ayrisan.length?' — AYRIŞAN: '+ayrisan.slice(0,8).join(' · ')+(ayrisan.length>8?' …+'+(ayrisan.length-8):''):''),
   ayrisan.length===0);

/* 2) BOŞ TEST = ÖLÇMEYEN KAPI. Sıfır bayt bir test dosyası, koşturucuya
   "geçti" der. Bu iddia o sınıfı doğrudan kapatıyor. */
const bosTest=dosyalar
  .filter(y=>/[\\/]tests[\\/].+\.js$/.test(y))
  .filter(y=>{ try{ return fs.readFileSync(y).length===0; }catch(_){ return true; } })
  .map(y=>path.relative(REPO,y));
ok('hiçbir test dosyası boş değil'+(bosTest.length?' — boş: '+bosTest.join(', '):''),
   bosTest.length===0);

/* 3) ÇEKİRDEK VE KABUK DOSYALARI: boşalırsa ürün hiç açılmaz, ama derleme
   ve denetim adımları bunu "değişiklik yok" diye geçebilir. */
const KRITIK=['index.html','mac/Teleprompter Pro.html','sw.js','manifest.json',
              'denetim.py','derle.py','bozma.py','kapi.sh','tests/kaynak.js'];
for(const r of KRITIK){
  const y=path.join(REPO,r);
  let n=-1; try{ n=fs.readFileSync(y).length; }catch(_){}
  ok('kritik dosya okunuyor ve dolu: '+r, n>200);
}

/* 4) ÇEKİRDEK MODÜLLERİN HEPSİ: biri boşalırsa derleme o bloğu BOŞ gömer
   ve kabuk sessizce yarım kalır. */
const cek=fs.readdirSync(path.join(REPO,'cekirdek'));
ok('çekirdek modülleri sayılabiliyor', cek.length>=10);
const bosCek=cek.filter(a=>{ try{ return fs.readFileSync(path.join(REPO,'cekirdek',a)).length===0; }
                             catch(_){ return true; } });
ok('hiçbir çekirdek modülü boş değil'+(bosCek.length?' — boş: '+bosCek.join(', '):''),
   bosCek.length===0);

/* 5) DEPONUN KENDİSİ BULUTA SENKRONLANAN BİR DİZİNDE Mİ.
   `~/Desktop` ve `~/Documents` bu makinede iCloud'a senkronlanıyor; olay tam
   olarak oradayken oldu. Kod deposu orada durmamalı. Bu iddia kuralı yazılı
   tutuyor — yolu değiştiren biri sebebini burada okur. */
const kok=fs.realpathSync(REPO);
const ev=process.env.HOME||'';
const riskli=[path.join(ev,'Desktop'), path.join(ev,'Documents')]
  .filter(d=>d!==ev && kok.startsWith(d+path.sep));
ok('depo iCloud senkronlu dizinde DEĞİL'+(riskli.length?' — riskli kök: '+riskli[0]:'')+' ('+kok+')',
   riskli.length===0);
