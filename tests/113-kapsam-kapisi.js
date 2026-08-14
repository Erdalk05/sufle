const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
const kapsamPy=path.join(REPO,'kapsam.py');
const kapiSh=path.join(REPO,'kapi.sh');

/* M1 — KAPSAM RAPORU KAPIYA EKLENSİN (fonksiyon kapsamı düşerse uyar).
   L10da ELLE ölçtüğüm şeyi kapı artık kendisi ölçüyor.

   ÖLÇÜT BİLEREK "KAPSANMAYAN SAYISI", yüzde ya da kapsanan sayısı değil:
     · Yüzde yanıltır — kapsanmayan bir fonksiyonu SİLMEK yüzdeyi
       yükseltir, yani kapsam iyileşmemişken iyileşmiş görünür.
     · Kapsanan sayısı da yanıltır — kapsanan bir fonksiyonu silmek sayıyı
       düşürür ve kapı BOŞUNA kırmızıya döner.
     · Kapsanmayan sayısı ikisinde de doğru davranır: yeni ve testsiz bir
       fonksiyon eklemek ARTIRIR (kırmızı), test yazmak ya da testsiz
       fonksiyonu silmek AZALTIR (taban sıkışır).

   İlk taban: index.html 51 kapsanmayan (%80), Mac 33 (%77).

   Bu testin işi kapının KENDİSİNİ ölçmek: sayaç gerçekten düşüşü
   yakalıyor mu, taban kendiliğinden gevşiyor mu, ölçemediğinde susuyor
   mu. Bu gece dört kez "hiçbir şey ölçmeyen kapı" çıktı; bu kapı da
   ölçülmeden kabul edilmiyor. */

/* ---------- KAPIYA BAĞLI MI ---------- */
{
  const sh=fs.readFileSync(kapiSh,'utf8');
  /* Adım NUMARASINA kilitlenme: kapıya yeni bir adım eklemek bu testi
     boşuna kırıyordu (M8de tam bunu yaşadım, bir saat önce yazdığım
     testte). İddia "kapsam adımı var", "altıncı sırada" değil. */
  ok('kapıda kapsam adımı var', /say "\d+\/\d+ Fonksiyon kapsamı"/.test(sh));
  ok('kapsam betiği çağrılıyor', /python3 kapsam\.py index\.html "\$MACF"/.test(sh));
  ok('başarısızlık kapıyı kırmızı yapıyor', /python3 kapsam\.py[^\n]*\|\| KOD=1/.test(sh));
  /* İDDİA: bütün adım etiketleri AYNI toplamı gösteriyor. Toplamın kaç
     olduğu değil, tutarlı olması önemli — yoksa rapor yalan söyler. */
  const etiketler=[...sh.matchAll(/say "(\d+)\/(\d+) /g)];
  const toplamlar=[...new Set(etiketler.map(m=>m[2]))];
  ok('adım etiketleri tutarlı ('+etiketler.length+' adım, toplam '+toplamlar.join(',')+')',
     etiketler.length>=6 && toplamlar.length===1 && +toplamlar[0]===etiketler.length);
  ok('adım numaraları 1den başlayıp artıyor',
     etiketler.every((m,i)=>+m[1]===i+1));
  ok('betiğin kendisi depoda', fs.existsSync(kapsamPy));
  ok('taban dosyası depoda', fs.existsSync(path.join(REPO,'tests','kapsam.json')));
}

/* ---------- TABAN SAĞLIKLI MI ---------- */
{
  const t=JSON.parse(fs.readFileSync(path.join(REPO,'tests','kapsam.json'),'utf8'));
  const adlar=Object.keys(t);
  ok('taban iki platformu da kapsıyor', adlar.length>=2);
  ok('tabanda telefon var', adlar.some(x=>/index\.html/.test(x)));
  ok('tabanda Mac var', adlar.some(x=>/Teleprompter Pro\.html/.test(x)));
  ok('taban değerleri sayı', Object.values(t).every(v=>Number.isInteger(v) && v>=0));
  /* Taban ÇOK BÜYÜK olmamalı: kapsanmayan sayısı fonksiyon sayısına
     yaklaşırsa kapı hiçbir şey korumuyor demektir. */
  ok('telefonda kapsanmayan 100ün altında', t['index.html']<100);
  ok('Macte kapsanmayan 60ın altında', t['Teleprompter Pro.html']<60);
}

/* ---------- BETİĞİ GERÇEKTEN KOŞTUR ---------- */
/* ⚠️ BU FONKSİYON GERÇEK TABAN DOSYASINI GEÇİCİ OLARAK BOZUYOR.
   Kapıyı sınamanın tek dürüst yolu bu — sahte bir kopya üstünde koşturmak
   betiğin gerçekten o dosyaya yazıp yazmadığını ölçemezdi.

   AMA geri koyma ÇÖKMEYE DAYANIKLI OLMALI. 2026-08-14'te dayanıklı değildi ve
   bedeli görüldü: test aradaki bir satırda öldü, taban `{"index.html":0}`
   hâlinde kaldı (JSON.stringify'ın sıkışık biçimi ele verdi) ve kapsam kapısı
   bundan sonraki HER koşuda yanlış tabanla silahlandı — Mac girdisi tümden
   kayboldu, index tabanı 51'den 0'a düştü. Kapı yeşil görünüp yanlış ölçen
   sınıfın ta kendisi.

   Çözüm: yazma ile geri koyma arasındaki HER yol finally'den geçsin. */
function kos(args, tabanIcerik){
  const yedek=path.join(REPO,'tests','kapsam.json');
  const eski=fs.existsSync(yedek)?fs.readFileSync(yedek,'utf8'):null;
  let cikti='', kod=0, sonTaban=null;
  try{
    if(tabanIcerik!==undefined) fs.writeFileSync(yedek, tabanIcerik);
    try{ cikti=execFileSync('python3',[kapsamPy,...args],{cwd:REPO,encoding:'utf8'}); }
    catch(e){ cikti=(e.stdout||'')+(e.stderr||''); kod=e.status||1; }
    sonTaban=fs.existsSync(yedek)?fs.readFileSync(yedek,'utf8'):null;
  } finally {
    /* İstisna da olsa, process.exit de olsa taban ESKİ hâline döner. */
    if(eski!==null) fs.writeFileSync(yedek, eski);
  }
  return {cikti, kod, sonTaban};
}
/* ASIL TETİKLEYİCİ SİNYAL — ölçüldü, tahmin edilmedi.
   `finally` ve `process.on('exit')` SIGTERM'de ÇALIŞMAZ; süreç anında ölür.
   Eski sürüm SIGTERM ile sınandı: taban `{"index.html":999}` hâlinde kaldı,
   yani depoda bulduğumuz `{"index.html":0}` ile aynı sınıf.

   Bu testi ÖLDÜREN şey bilinen bir şey: kos.js test başına 60 sn tavan
   uyguluyor (CLAUDE.md) ve bu test python3'ü birkaç kez çağırdığı için
   yavaş makinede tavanı aşabiliyor. Yani bu kaza tekrar edecekti. */
{
  const yedek=path.join(REPO,'tests','kapsam.json');
  const acilis=fs.existsSync(yedek)?fs.readFileSync(yedek,'utf8'):null;
  const geri=()=>{ try{ if(acilis!==null) fs.writeFileSync(yedek, acilis); }catch(_){} };
  process.on('exit', geri);
  process.on('uncaughtException', e=>{ geri(); console.error(e); process.exit(1); });
  for(const sig of ['SIGTERM','SIGINT','SIGHUP'])
    process.on(sig, ()=>{ geri(); process.exit(143); });
}
{
  const r=kos(['index.html'], JSON.stringify({'index.html':999}));
  ok('taban gevşekken geçiyor', r.kod===0);
  ok('sayılar raporlanıyor', /kapsanıyor/.test(r.cikti));
  /* TABAN KENDİLİĞİNDEN SIKIŞMALI: gevşek taban yerinde kalmamalı. */
  ok('gevşek taban ölçülen değere sıkışıyor',
     JSON.parse(r.sonTaban)['index.html']<999);
  ok('sıkışma raporlanıyor', /taban sıkışıyor/.test(r.cikti));
}
{
  /* ASIL KORUMA: kapsam düşerse KIRMIZI. */
  const r=kos(['index.html'], JSON.stringify({'index.html':0}));
  ok('kapsam düşünce kırmızı veriyor', r.kod===1);
  ok('düşüş açıkça söyleniyor', /KAPSAM DÜŞTÜ/.test(r.cikti));
  ok('hangi fonksiyonlar kapsanmıyor yazılıyor', /yeni kapsanmayanlar:/.test(r.cikti));
  ok('kırmızıyken taban BOZULMUYOR (yoksa kapı kendini gevşetir)',
     JSON.parse(r.sonTaban)['index.html']===0);
}
{
  const r=kos(['index.html'], '{}');
  ok('taban yoksa ilk kez yazılıyor', r.kod===0 && /taban ilk kez yazılıyor/.test(r.cikti));
  ok('ilk yazımda gerçek değer kaydediliyor',
     JSON.parse(r.sonTaban)['index.html']>0);
}
{
  const r=kos(['index.html'], 'bu json degil');
  ok('bozuk taban çökertmiyor', r.kod===0);
  ok('bozuk taban yerine yenisi yazılıyor', JSON.parse(r.sonTaban)['index.html']>0);
}
{
  const r=kos(['yok-boyle-bir-dosya.html'], '{}');
  ok('olmayan dosya atlanıyor', r.kod===0 && /yok, atlandı/.test(r.cikti));
}
{
  /* ÖLÇEMEDİĞİNDE SUSMAMALI. Fonksiyon deseni hiç eşleşmezse kapı
     "kapsam %100" demek yerine kırmızı vermeli. */
  const bos=path.join(REPO,'tests','__kapsam_bos.html');
  fs.writeFileSync(bos,'<html><body>hic fonksiyon yok</body></html>');
  const r=kos(['tests/__kapsam_bos.html'], '{}');
  fs.unlinkSync(bos);
  ok('fonksiyon bulunamazsa KIRMIZI (sessizce %100 demiyor)', r.kod===1);
  ok('sebebi söyleniyor', /hiç fonksiyon bulunamadı/.test(r.cikti));
}

/* ---------- ÖLÇÜT DOĞRU MU (kapsanmayan sayısı) ---------- */
{
  const py=fs.readFileSync(kapsamPy,'utf8');
  ok('düşüş ölçütü kapsanmayan sayısı', /if n > eski:/.test(py));
  ok('taban yalnız aşağı çekiliyor', /min\(eski, n\)/.test(py));
  ok('kırmızıyken taban yazılmıyor', /if not kirmizi:\s*\n\s*try:\s*\n\s*json\.dump/.test(py));
  ok('test dosyası azsa ölçüm reddediliyor', /if dosya_sayisi < 10:/.test(py));
  ok('anılma ölçütü kelime sınırıyla aranıyor', /\(\?<!\[\\\\w\$\]\)/.test(py) || /\(\?<!\[\\w\$\]\)/.test(py));
  ok('üç haneli test dosyaları da okunuyor', /\^\\d\{2,\}-/.test(py));
  ok('blok yorumları ayıklanıyor (yorumdaki fonksiyon sayılmasın)',
     /re\.sub\(r'\/\\\*\.\*\?\\\*\/'/.test(py));
  /* Gerekçe kodda yazılı olmalı: sonradan "yüzde daha iyi" diye
     değiştirilmesin. */
  ok('ölçüt seçiminin gerekçesi yazılı', /Yüzde yanıltır/.test(py));
}
