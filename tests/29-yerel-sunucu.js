const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {execFileSync, spawn} = require('child_process');
const net = require('net');
const fs = require('fs'), os = require('os'), path = require('path');
const {REPO, sunucuYolu} = require('./kaynak');

/* MAC UZAKTAN KUMANDA SUNUCUSU — GERÇEKTEN KOŞTURULUYOR
   teleprompter_server.py Mac'in QR kumandasının tamamı (SSE /events +
   POST /cmd) ama bugüne kadar tests/ içinde hiç geçmiyordu.

   Bulunan hata (2026-08-13, gerçek koşuyla ölçüldü): port yedeği çalışıyor
   ama bildirilen port güncellenmiyordu. 8080 meşgulse sunucu 8081'i
   dinliyor, /info ise {"port": 8080} döndürüyordu. Mac arayüzü QR adresini
   tam olarak /info'daki porttan kuruyor (setupRemote), yani telefon boş bir
   porta gönderiliyor ve kumanda SESSİZCE çalışmıyordu — üstelik port yedeği
   tam da bu durum için eklenmişti. Yarım düzeltme.

   Bu dosya sunucuyu gerçekten başlatıp HTTP konuşur. Python yoksa atlar. */

const SUNUCU = require('./kaynak.js').sunucuYolu();

let python = null;
try { execFileSync('python3', ['--version'], {stdio:'ignore'}); python = 'python3'; } catch(_) {}
if (!python || !fs.existsSync(SUNUCU)) {
  console.log('✓ (atlandı: python3 ya da sunucu dosyası yok — bu makinede sınanamaz)');
  process.exit(0);
}

const uyu = ms => new Promise(r => setTimeout(r, ms));

function portTut(port){
  return new Promise((res, rej) => {
    const s = net.createServer(() => {});
    s.on('error', rej);
    s.listen(port, '0.0.0.0', () => res(s));
  });
}

async function iste(port, yol, opt={}){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 4000);
  try { return await fetch('http://127.0.0.1:'+port+yol, {...opt, signal:c.signal}); }
  finally { clearTimeout(t); }
}

/* BOŞ PORT ÇİFTİ BUL (2026-08-17 — M11 kalıcı çözümü).
   Test 8080/8081'i GERÇEKTEN açıyordu ve makinede o portları tutan başka bir
   uygulama olduğunda kendini atlıyordu: o koşuda yedek-port kuralı HİÇ
   ölçülmüyor, kasıtlı bozma da yakalanmıyordu (bu gece gerçekten oldu, 8081'i
   başka bir geliştirme sunucusu tutuyordu). Artık başlangıç portu sunucuya
   `SUFLE_PORT` ile veriliyor ve test kendine BOŞ bir çift seçiyor — kural
   makine durumundan bağımsız ölçülüyor. Kullanıcı tarafında değişen bir şey
   yok: varsayılan hâlâ 8080. */
function bosPortCifti(){
  return new Promise((res, rej) => {
    const dene = (kalan) => {
      if(!kalan) return rej(new Error('boş port çifti bulunamadı'));
      const a = net.createServer();
      a.listen(0, '127.0.0.1', () => {
        const p = a.address().port;
        const b = net.createServer();
        b.on('error', () => { a.close(() => dene(kalan-1)); });
        b.listen(p+1, '127.0.0.1', () => {
          b.close(() => a.close(() => res(p)));
        });
      });
      a.on('error', () => dene(kalan-1));
    };
    dene(25);
  });
}

async function sunucuBekle(port, deneme=40){
  for (let i=0;i<deneme;i++){
    try { const r = await iste(port, '/info'); if (r.ok) return true; } catch(_) {}
    await uyu(150);
  }
  return false;
}

(async () => {
  // Sunucu kendi klasöründeki "Teleprompter Pro.html"i servis ediyor;
  // gerçek dosyayı kopyalamak yerine geçici bir çalışma klasörü kuruyoruz.
  const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'sufle-srv-'));
  fs.copyFileSync(SUNUCU, path.join(dizin, 'teleprompter_server.py'));
  fs.writeFileSync(path.join(dizin, 'Teleprompter Pro.html'), '<html>sahte gosterim</html>');

  let tikaci = null, proc = null;
  const temizle = () => {
    if (proc) { try { proc.kill('SIGKILL'); } catch(_) {} }
    if (tikaci) { try { tikaci.close(); } catch(_) {} }
    try { fs.rmSync(dizin, {recursive:true, force:true}); } catch(_) {}
  };
  process.on('exit', temizle);

  try {
    /* Port dışarıdan mı tutulu: bağlanabiliyorsak birisi dinliyor demektir. */
    const portDolu = (p) => new Promise(r => {
      const s2 = net.connect({host:'127.0.0.1', port:p});
      s2.on('connect', () => { s2.destroy(); r(true); });
      s2.on('error', () => r(false));
      setTimeout(() => { s2.destroy(); r(false); }, 500);
    });

    /* ---------- BAŞLANGIÇ PORTUNU MEŞGUL ET: YEDEK PORT YOLUNU ZORLA ---------- */
    const P = await bosPortCifti(), Y = P + 1;   // P dolu olacak, Y yedek
    try { tikaci = await portTut(P); }
    /* `ATLANDI:` öneki şart: koşturucu bunu görünce taban karşılaştırmasını
       atlıyor. Öneksiz hâlde 1 iddia basıyordu ve sayaç "17 -> 1 düştü"
       diye KIRMIZI veriyordu — makine durumu yüzünden yayın bloke oluyordu.
       M11de 8081 için çözülen sorunun ikizi; 8080 gözden kaçmıştı.
       Gerçekten oldu: Erdalın kendi kumanda sunucusu 8080i tutuyordu. */
    catch(_) { ok('ATLANDI: seçilen port kapılamadı (makine durumu)', true);
               temizle(); return; }

    proc = spawn(python, ['-u', 'teleprompter_server.py'],
                 {cwd: dizin, stdio:['ignore','pipe','pipe'],
                  env: {...process.env, SUFLE_PORT: String(P)}});
    let banner = '';
    proc.stdout.on('data', d => banner += d);
    proc.stderr.on('data', d => banner += d);

    /* YEDEK PORT DA BAŞKASINDA OLABİLİR. Test gerçek port açıyor; makinede
       8081i kullanan başka bir uygulama varsa (ör. bir geliştirme sunucusu)
       sunucumuz oraya çıkamaz ve bu bizim kusurumuz DEĞİLDİR. Eskiden kapı
       bunu KIRMIZI sayıyordu: makine durumu yüzünden yayın bloke oluyordu.
       Gecenin sonunda gerçekten oldu ve bir kez de yanlış süreci kapattım.
       Dışarıdan tutuluysa ATLA — sessizce geçme, atlandığını SÖYLE. */
    const ayakta = await sunucuBekle(Y);
    if(!ayakta && await portDolu(Y)){
      /* Dosyanın kendi geleneği: atlama da bir ✓ satırı bassın. Sıfır iddia
         koşturucuda KIRMIZI demek (M2 kuralı, doğru bir kural) — atlanan
         test o kurala takılmamalı ama sessiz de kalmamalı. */
      ok('ATLANDI: yedek portu başka bir uygulama tutuyor (makine durumu, kod kusuru değil)', true);
      temizle(); return;
    }
    ok('başlangıç portu meşgulken sunucu yedek porta düşüyor', ayakta);
    /* Testin makine durumundan bağımsızlığı bu satıra bağlı: sunucu
       SUFLE_PORT'u yok sayarsa test yine 8080'e döner ve gecenin ortasında
       başka bir uygulama o portu tutunca kural HİÇ ölçülmez. */
    ok('sunucu başlangıç portunu ortamdan okuyor (test makine durumundan bağımsız)',
       /PORT = int\(os\.environ\.get\("SUFLE_PORT"\) or 8080\)/.test(
         fs.readFileSync(SUNUCU, 'utf8')));
    if (!ayakta) { console.log('   (sunucu açılmadı, kalan testler atlandı)\n' + banner); temizle(); return; }

    /* ---------- ASIL HATA: BİLDİRİLEN PORT GERÇEK PORT MU ---------- */
    const bilgi = await (await iste(Y, '/info')).json();
    ok('/info GERÇEK portu bildiriyor (eski portu derse QR telefonu boş porta yollar)',
       bilgi.port === Y);
    ok('/info bir IP bildiriyor', typeof bilgi.ip === 'string' && bilgi.ip.length > 0);
    ok('açılış yazısı da gerçek portu gösteriyor',
       banner.includes(String(Y)) && !banner.includes('localhost:'+P));
    ok('port değişikliği kullanıcıya söyleniyor', banner.includes(P+' doluydu'));

    /* ---------- KUMANDA SAYFASI ---------- */
    const rem = await iste(Y, '/remote');
    const remHtml = await rem.text();
    ok('/remote kumanda sayfasını veriyor', rem.ok && /Kumanda/.test(remHtml));
    for (const k of ['toggle','reset','rec','cam','slower','faster'])
      ok('kumandada "'+k+'" komutu var', remHtml.includes('"type":"'+k+'"'));

    /* ---------- KOMUT GERÇEKTEN YAYINLANIYOR MU (SSE) ----------
       Kumanda düğmesine basmak POST /cmd yapar; Mac gösterimi /events'ten
       dinler. Zincir kopuksa düğme çalışıyor görünür ama hiçbir şey olmaz. */
    const c = new AbortController();
    const es = await fetch('http://127.0.0.1:'+Y+'/events', {signal:c.signal});
    const okuyucu = es.body.getReader();
    await okuyucu.read();                       // ": baglandi" karşılama satırı
    await iste(Y, '/cmd', {method:'POST', body: JSON.stringify({type:'toggle', value:7})});
    const parca = await Promise.race([
      okuyucu.read().then(r => new TextDecoder().decode(r.value)),
      uyu(3000).then(() => '')
    ]);
    c.abort();
    ok('POST /cmd komutu /events akışına yayınlıyor', /"type":\s*"toggle"/.test(parca));
    ok('komutun verisi bozulmadan geçiyor', /"value":\s*7/.test(parca));

    /* ---------- SINIRLAR ---------- */
    const yok = await iste(Y, '/boyle-bir-yol-yok');
    ok('bilinmeyen yol 404 veriyor', yok.status === 404);
    const bozuk = await iste(Y, '/cmd', {method:'POST', body:'{bozuk json'});
    ok('bozuk JSON sunucuyu düşürmüyor', bozuk.ok);
    ok('bozuk istekten sonra sunucu hâlâ ayakta', (await iste(Y, '/info')).ok);

  } finally {
    temizle();
  }
})();
