const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {execFileSync, spawn} = require('child_process');
const net = require('net');
const fs = require('fs'), os = require('os'), path = require('path');
const {REPO} = require('./kaynak');

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

const SUNUCU = path.join(REPO, 'mac', 'teleprompter_server.py');

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
    /* ---------- 8080'İ MEŞGUL ET: YEDEK PORT YOLUNU ZORLA ---------- */
    try { tikaci = await portTut(8080); }
    catch(_) { console.log('✓ (atlandı: 8080 zaten başka bir şeyce tutulu)'); temizle(); return; }

    proc = spawn(python, ['-u', 'teleprompter_server.py'], {cwd: dizin, stdio:['ignore','pipe','pipe']});
    let banner = '';
    proc.stdout.on('data', d => banner += d);
    proc.stderr.on('data', d => banner += d);

    const ayakta = await sunucuBekle(8081);
    ok('8080 meşgulken sunucu yedek porta (8081) düşüyor', ayakta);
    if (!ayakta) { console.log('   (sunucu açılmadı, kalan testler atlandı)\n' + banner); temizle(); return; }

    /* ---------- ASIL HATA: BİLDİRİLEN PORT GERÇEK PORT MU ---------- */
    const bilgi = await (await iste(8081, '/info')).json();
    ok('/info GERÇEK portu bildiriyor (8080 derse QR telefonu boş porta yollar)',
       bilgi.port === 8081);
    ok('/info bir IP bildiriyor', typeof bilgi.ip === 'string' && bilgi.ip.length > 0);
    ok('açılış yazısı da gerçek portu gösteriyor', /8081/.test(banner) && !/localhost:8080/.test(banner));
    ok('port değişikliği kullanıcıya söyleniyor', /8080 doluydu/.test(banner));

    /* ---------- KUMANDA SAYFASI ---------- */
    const rem = await iste(8081, '/remote');
    const remHtml = await rem.text();
    ok('/remote kumanda sayfasını veriyor', rem.ok && /Kumanda/.test(remHtml));
    for (const k of ['toggle','reset','rec','cam','slower','faster'])
      ok('kumandada "'+k+'" komutu var', remHtml.includes('"type":"'+k+'"'));

    /* ---------- KOMUT GERÇEKTEN YAYINLANIYOR MU (SSE) ----------
       Kumanda düğmesine basmak POST /cmd yapar; Mac gösterimi /events'ten
       dinler. Zincir kopuksa düğme çalışıyor görünür ama hiçbir şey olmaz. */
    const c = new AbortController();
    const es = await fetch('http://127.0.0.1:8081/events', {signal:c.signal});
    const okuyucu = es.body.getReader();
    await okuyucu.read();                       // ": baglandi" karşılama satırı
    await iste(8081, '/cmd', {method:'POST', body: JSON.stringify({type:'toggle', value:7})});
    const parca = await Promise.race([
      okuyucu.read().then(r => new TextDecoder().decode(r.value)),
      uyu(3000).then(() => '')
    ]);
    c.abort();
    ok('POST /cmd komutu /events akışına yayınlıyor', /"type":\s*"toggle"/.test(parca));
    ok('komutun verisi bozulmadan geçiyor', /"value":\s*7/.test(parca));

    /* ---------- SINIRLAR ---------- */
    const yok = await iste(8081, '/boyle-bir-yol-yok');
    ok('bilinmeyen yol 404 veriyor', yok.status === 404);
    const bozuk = await iste(8081, '/cmd', {method:'POST', body:'{bozuk json'});
    ok('bozuk JSON sunucuyu düşürmüyor', bozuk.ok);
    ok('bozuk istekten sonra sunucu hâlâ ayakta', (await iste(8081, '/info')).ok);

  } finally {
    temizle();
  }
})();
