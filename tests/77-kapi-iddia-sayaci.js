const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), os=require('os');
const {execFileSync}=require('child_process');
const {REPO}=require('./kaynak');
const KOS=path.join(REPO,'tests','kos.js');
const kaynak=fs.readFileSync(KOS,'utf8');

/* M2 — KAPININ KENDİ KÖR NOKTASI: "ÇÖKTÜ" İLE "GEÇTİ" AYIRT EDİLMİYORDU.

   Koşturucu çıkış kodunu zaten alıyordu, o yüzden ÇÖKEN test yakalanıyordu.
   Ama iddia sayısı hiç ölçülmüyordu ve iki delik vardı — ikisi de ÖLÇÜLDÜ:

   1) SIFIR İDDİALI TEST YEŞİL GEÇİYORDU. Koşturucuya 0 iddialı bir dosya
      eklendi: "✓ 99-bos-deneme.js  0 test" yazdı, kapı YEŞİL kaldı ve
      toplam 2355 hiç değişmedi. Yani bir test sessizce boşalırsa (çıkarım
      deseni tutmaz, erken dönüş, koşul hiç sağlanmaz) kimse duymuyordu.
      Bu gece dört test tam da böyle boşaldı; yalnız ÇÖKTÜKLERİ için
      yakalandılar. Çökmeden boşalsalardı kapı yeşil derdi.

   2) İDDİA SAYISININ DÜŞMESİ görünmezdi. 29 iddialı bir test 2 iddiaya
      indirildi: eski koşturucu "✓ 2 test" deyip geçiyordu. Koruma %93
      daralmış olur ve kapı bunu bildirmezdi.

   Çözüm: dosya başına sayım `beklenen.json` içinde tutuluyor; düşerse KIRMIZI,
   artarsa taban yükseliyor. Sıfır iddia her hâlükârda kırmızı. Ortama bağlı
   atlamalar `ATLANDI:` satırıyla karşılaştırmadan muaf.

   Bu test koşturucuyu GEÇİCİ BİR DİZİNDE gerçekten çalıştırır; kendi tabanına
   ya da gerçek testlere dokunmaz. */

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('taban dosyası tanımlı', /beklenen\.json/.test(kaynak));
ok('sıfır iddia kırmızı sayılıyor', /gecen \+ kalan === 0/.test(kaynak));
ok('düşüş karşılaştırması var', /gecen \+ kalan < eski/.test(kaynak));
ok('taban yalnız yukarı taşınıyor', /Math\.max\(eski \|\| 0, gecen \+ kalan\)/.test(kaynak));
ok('taban atomik yazılıyor (yarım dosya kapıyı yanıltmasın)', /renameSync/.test(kaynak));
ok('ortam atlaması tanınıyor', /ATLANDI:/.test(kaynak));
ok('çıkış kodu hâlâ dikkate alınıyor', /catch \(e\) \{[\s\S]{0,80}ok = false/.test(kaynak));
ok('test başına süre tavanı var', /timeout: SURE_TAVANI/.test(kaynak));
ok('asılan test SIGKILL ile öldürülüyor', /killSignal: 'SIGKILL'/.test(kaynak));
ok('süre aşımı kırmızı sayılıyor', /SÜRE AŞIMI/.test(kaynak) && /DÜŞTÜ\|SÜRE AŞIMI/.test(kaynak));
ok('tavan ortam değişkeniyle ayarlanabilir', /SUFLE_TEST_TAVAN/.test(kaynak));

/* ---------- CANLI: GEÇİCİ DİZİNDE KOŞTUR ---------- */
const kur = (dosyalar, taban) => {
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'sufle-kos-'));
  fs.copyFileSync(KOS, path.join(d,'kos.js'));
  for(const [ad,icerik] of Object.entries(dosyalar)) fs.writeFileSync(path.join(d,ad), icerik);
  if(taban) fs.writeFileSync(path.join(d,'beklenen.json'), JSON.stringify(taban));
  return d;
};
const kos = (d, env) => {
  const s={encoding:'utf8', env:{...process.env, ...(env||{})}};
  try { return {kod:0, cikti:execFileSync(process.execPath,[path.join(d,'kos.js')],s)}; }
  catch(e){ return {kod:e.status==null?1:e.status, cikti:(e.stdout||'')+(e.stderr||'')}; }
};
const sil = d => { try{ fs.rmSync(d,{recursive:true,force:true}); }catch(e){} };

const IYI = 'const ok=(n,c)=>{ console.log((c?"\\u2713 ":"\\u2717 HATA ")+n); if(!c) process.exitCode=1; };\n'+
            'ok("bir",true); ok("iki",true); ok("uc",true);\n';
const BOS = 'if(true) return;\n';
const KIRIK = 'const ok=(n,c)=>{ console.log((c?"\\u2713 ":"\\u2717 HATA ")+n); if(!c) process.exitCode=1; };\n'+
              'ok("yanlis",false);\n';
const COKEN = 'yokFonksiyon();\n';
const ATLAYAN = 'console.log("ATLANDI: ortam eksik");\n'+
                'const ok=(n,c)=>{ console.log((c?"\\u2713 ":"\\u2717 HATA ")+n); };\nok("tek",true);\n';

{
  const d=kur({'10-iyi.js':IYI});
  const r=kos(d);
  ok('sağlam test yeşil geçiyor', r.kod===0);
  ok('iddia sayısı bildiriliyor', /10-iyi\.js\s+3 test/.test(r.cikti));
  ok('taban dosyası oluşturuluyor', fs.existsSync(path.join(d,'beklenen.json')));
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('taban doğru sayıyı kaydediyor', t['10-iyi.js']===3);
  sil(d);
}
{
  /* ASIL BULGU: hiç iddia koşmayan test. */
  const d=kur({'10-iyi.js':IYI,'11-bos.js':BOS});
  const r=kos(d);
  ok('SIFIR iddialı test kapıyı KIRMIZI yapıyor', r.kod!==0);
  ok('sebebi yazılıyor', /HİÇ İDDİA KOŞMADI/.test(r.cikti));
  ok('boş test kırık listesine giriyor', /kırık:.*11-bos\.js/.test(r.cikti));
  ok('sağlam test bundan etkilenmiyor', /✓ 10-iyi\.js/.test(r.cikti));
  sil(d);
}
{
  /* İKİNCİ BULGU: koruma daralması. */
  const d=kur({'10-iyi.js':IYI}, {'10-iyi.js':9});
  const r=kos(d);
  ok('iddia sayısı DÜŞÜNCE kapı kırmızı', r.kod!==0);
  ok('düşüş miktarı yazılıyor', /iddia sayısı DÜŞTÜ: 9 → 3/.test(r.cikti));
  /* Taban düşürülmemeli: bir kez kabul edilirse daralma kalıcı olur ve
     ikinci koşuda kapı yeşile döner — kör nokta geri gelir. */
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('taban düşürülmüyor (daralma kalıcılaşmasın)', t['10-iyi.js']===9);
  const r2=kos(d);
  ok('ikinci koşuda da kırmızı kalıyor', r2.kod!==0);
  sil(d);
}
{
  /* Büyüme serbest: yeni iddia eklemek kapıyı kırmamalı, taban yükselmeli. */
  const d=kur({'10-iyi.js':IYI}, {'10-iyi.js':1});
  const r=kos(d);
  ok('iddia sayısı ARTINCA kapı yeşil', r.kod===0);
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('taban yeni sayıya yükseliyor', t['10-iyi.js']===3);
  sil(d);
}
{
  /* Çöken test eskiden de yakalanıyordu; bozulmadığını doğrula. */
  const d=kur({'10-coken.js':COKEN});
  const r=kos(d);
  ok('çöken test hâlâ kırmızı', r.kod!==0);
  ok('çöken test 0 iddia olarak da işaretleniyor', /HİÇ İDDİA KOŞMADI/.test(r.cikti));
  sil(d);
}
{
  const d=kur({'10-kirik.js':KIRIK});
  const r=kos(d);
  ok('başarısız iddia hâlâ kırmızı', r.kod!==0);
  ok('hata sayılıyor', /1 hata/.test(r.cikti));
  sil(d);
}
{
  /* Ortam eksikse (openssl yok gibi) taban karşılaştırması yapılmamalı,
     yoksa o makinede kapı haksız yere kırmızı yanar. */
  const d=kur({'10-atlayan.js':ATLAYAN}, {'10-atlayan.js':40});
  const r=kos(d);
  ok('ortam eksikken düşüş kapıyı kırmıyor', r.kod===0);
  ok('atlandığı bildiriliyor', /taban karşılaştırması atlandı/.test(r.cikti));
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('atlanan testin tabanı korunuyor', t['10-atlayan.js']===40);
  sil(d);
}
{
  /* Silinen test dosyasının tabanı birikmemeli. */
  const d=kur({'10-iyi.js':IYI}, {'10-iyi.js':3,'99-silinmis.js':50});
  kos(d);
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('silinen testin tabanı temizleniyor', !('99-silinmis.js' in t));
  ok('duran testin tabanı korunuyor', t['10-iyi.js']===3);
  sil(d);
}

{
  /* M3 CANLI: asılı test kapıyı asmıyor, kırmızı veriyor ve DİĞER testler
     koşmaya devam ediyor — biri asıldı diye kapsam düşmemeli. */
  const ASILI='setInterval(()=>{},1000);\n';
  const d=kur({'10-asili.js':ASILI,'11-iyi.js':IYI});
  const t0=Date.now();
  const r=kos(d,{SUFLE_TEST_TAVAN:'2000'});
  const gecen=Date.now()-t0;
  ok('asılı test kapıyı ASMIYOR (ölçülen '+(gecen/1000).toFixed(1)+' sn)', gecen<15000);
  ok('asılı test kapıyı KIRMIZI yapıyor', r.kod!==0);
  ok('süre aşımı sebebi yazılıyor', /SÜRE AŞIMI \(2 sn\)/.test(r.cikti));
  ok('asılı test kırık listesinde', /kırık:.*10-asili\.js/.test(r.cikti));
  ok('asılı test listede BİR kez geçiyor', (r.cikti.match(/10-asili\.js/g)||[]).length<=3);
  ok('diğer testler koşmaya devam ediyor', /✓ 11-iyi\.js/.test(r.cikti));
  sil(d);
}
{
  /* Asılı testin yarım çıktısı TABANI DÜŞÜRMEMELİ: düşürürse bir sonraki
     koşuda daralma kalıcılaşır ve kapı yeşile döner.
     NOT: bunu ayrı bir `if (asildi)` dalıyla korumuştum; kasıtlı bozma turu o
     dalın HİÇBİR ŞEYİ değiştirmediğini gösterdi (Math.max zaten düşürmüyor),
     dal kaldırıldı. Bu iddia şimdi Math.max korumasını sınıyor. */
  const ASILI_YARIM='const ok=(n,c)=>{ console.log((c?"\\u2713 ":"\\u2717 ")+n); };\n'+
                    'ok("bir",true);\nsetInterval(()=>{},1000);\n';
  const d=kur({'10-asili.js':ASILI_YARIM}, {'10-asili.js':20});
  kos(d,{SUFLE_TEST_TAVAN:'2000'});
  const t=JSON.parse(fs.readFileSync(path.join(d,'beklenen.json'),'utf8'));
  ok('asılı testin yarım çıktısı tabanı düşürmüyor', t['10-asili.js']===20);
  sil(d);
}

/* ---------- GERÇEK TABAN SAĞLIKLI MI ---------- */
{
  const t=JSON.parse(fs.readFileSync(path.join(REPO,'tests','beklenen.json'),'utf8'));
  const dosyalar=fs.readdirSync(path.join(REPO,'tests')).filter(f=>/^\d\d-.*\.js$/.test(f));
  /* KAPI BOŞUNA KURT BAĞIRMAMALI. Önce "taban her dosyayı kapsıyor" diye
     ölçüyordum; taban koşunun SONUNDA yazıldığı için yeni bir test eklendiği
     tur bu iddia bir kez kırmızı veriyor, sonra kendiliğinden yeşile dönüyor.
     Test silindiğinde de aynısı. Rastgele kırmızı veren bir kapı, kapının
     kendisine olan güveni bitirir — bu yüzden geçici durum bir NOT, sabit
     durum bir İDDİA. Asıl koruma (sayı düşüşü) bunlara zaten bağlı değil. */
  const eksik=dosyalar.filter(f=>t[f]==null);
  const fazla=Object.keys(t).filter(f=>!dosyalar.includes(f));
  if(eksik.length) console.log('  · tabanda henüz yok (bu koşunun sonunda eklenecek): '+eksik.join(', '));
  if(fazla.length) console.log('  · tabanda artık olmayan dosya (bu koşunun sonunda temizlenecek): '+fazla.join(', '));
  ok('geçici fark makul (en çok 2 dosya)', eksik.length+fazla.length<=2);
  ok('hiçbir testin tabanı sıfır değil', Object.values(t).every(v=>v>0));
  ok('taban boş değil', Object.keys(t).length>50);
}
