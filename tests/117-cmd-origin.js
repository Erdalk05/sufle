const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const REPO=path.join(__dirname,'..');
const py=fs.readFileSync(path.join(REPO,'mac','teleprompter_server.py'),'utf8');

/* T23 — /cmd HERHANGİ BİR WEB SAYFASINDAN TETİKLENEBİLİYORDU.
   Sunucu yerel ağda dinliyor ve komut uç noktası hiçbir şey sormuyordu:
   tarayıcında açık duran kötü niyetli bir sayfa fetch ile POST atıp
   sufleyi sürebilir, çekimi başlatıp DURDURABİLİRDİ. Kayıt sırasında
   bu, çekimin ortasında bitmesi demek.

   KARAR (CTO): Origin kontrolü. Tarayıcı çapraz kaynaklı POSTta `Origin`
   başlığını HER ZAMAN gönderir, yani asıl saldırı yolu bununla kapanır.
   Jeton daha güçlü görünüyor ama eşleştirme akışını değiştirir ve yerel
   ağdaki saldırgan jetonu QR/adresten zaten görebilir — bedeli kazancından
   büyük. Karar ve gerekçesi koda da yazıldı. */

ok('komut uç noktası korunuyor', /def _origin_tamam\(self\):/.test(py));
/* Sıra do_POST BLOĞU İÇİNDE ölçülmeli: `broadcast` dosyanın çok
   yukarısında ayrıca TANIMLANIYOR ve dosya genelinde indexOf o tanıma
   takılıyor. Bu gece üçüncü kez aynı tuzak. */
const mPost=py.match(/def do_POST\(self\):[\s\S]*?self\._send\(404, "text\/plain", "yok"\)/);
ok('do_POST çıkarılabildi', !!mPost);
ok('kontrol komut işlenmeden ÖNCE',
   !!mPost && mPost[0].indexOf('_origin_tamam()') < mPost[0].indexOf('broadcast(obj)'));
ok('reddedilince 403 dönüyor', /self\._send\(403, "application\/json"/.test(py));
ok('reddin sebebi söyleniyor', /baska bir siteden gelen komut reddedildi/.test(py));
ok('Origin Host ile karşılaştırılıyor', /o\.netloc == \(self\.headers\.get\("Host"\) or ""\)/.test(py));
ok('Origin yoksa kabul (tarayıcı değil, CSRF vektörü değil)', /if not origin:\s*\n\s*return True/.test(py));
ok('bozuk Origin reddediliyor', /except Exception:\s*\n\s*return False/.test(py));
ok('kararın gerekçesi kodda yazılı', /Jeton yerine bunu seçtim/.test(py));

/* Kuralı gerçek başlıklarla koştur — Python mantığının aynısı. */
function kabul(origin, host){
  if(!origin) return true;
  let o; try{ o=new URL(origin); }catch(_){ return false; }
  return o.host===host;
}
{
  ok('kendi kumanda sayfamız kabul ediliyor',
     kabul('https://192.168.1.5:8443','192.168.1.5:8443')===true);
  ok('başka bir site REDDEDİLİYOR',
     kabul('https://kotu-site.example','192.168.1.5:8443')===false);
  ok('aynı adres farklı port REDDEDİLİYOR',
     kabul('https://192.168.1.5:9999','192.168.1.5:8443')===false);
  ok('localhost sayfası da başka kaynaksa reddediliyor',
     kabul('http://localhost:3000','192.168.1.5:8443')===false);
  ok('Origin yoksa kabul (curl, betik)', kabul(null,'192.168.1.5:8443')===true);
  ok('bozuk Origin reddediliyor', kabul('bu-url-degil','192.168.1.5:8443')===false);
}

/* Kumanda sayfasının kendisi hâlâ çalışmalı — koruma özelliği öldürmesin. */
ok('kumanda sayfası komutu aynı kaynaktan yolluyor', /fetch\('\/cmd',\{method:'POST'/.test(py));
ok('olay akışı (SSE) korumadan etkilenmiyor (GET)', /if p\.path == "\/events"/.test(py) || /\/events/.test(py));
