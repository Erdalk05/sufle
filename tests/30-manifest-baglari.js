const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,oku,cikar,REPO, repoOku}=require('./kaynak');
const tel=oku(telefonYolu());
const sw=repoOku('sw.js','SUFLE_SW');
const manifestHam=repoOku('manifest.json','SUFLE_MANIFEST');

/* MANİFEST BAĞLARI
   manifest.json tek başına hiçbir şey yapmaz; üç ayrı dosyayla SÖZLEŞMESİ var:
     · index.html   — paylaşılan metni ve kısayolları karşılayan kod
     · sw.js        — çevrimdışı için önbelleğe alınacak varlıklar
     · diskteki ikon dosyaları
   Bu bağların hiçbiri kontrol edilmiyordu. Denetlendi ve BUGÜN HEPSİ ÇALIŞIYOR
   (fromShare/fromShortcut gerçekten karşılıyor) — ama bir param adı ya da
   ?go değeri değişirse özellik sessizce ölür: kullanıcı paylaş menüsünden
   Sufle'ye metin gönderir, uygulama boş açılır, hata da çıkmaz. */

let M;
try { M = JSON.parse(manifestHam); ok('manifest.json geçerli JSON', true); }
catch(e){ ok('manifest.json geçerli JSON — '+e.message, false); process.exit(1); }

ok('index.html manifest\'i bağlıyor', /rel="manifest"\s+href="manifest\.json"/.test(tel));

/* ---------- İKONLAR DİSKTE VAR MI ----------
   Eksik ikon = kurulum isteminde bozuk görsel; kimse hata görmez. */
const ikonlar = [...new Set((M.icons||[]).map(i => i.src))];
ok('manifest en az bir ikon bildiriyor', ikonlar.length > 0);
for (const src of ikonlar)
  ok('ikon diskte var: '+src, fs.existsSync(path.join(REPO, src)));
ok('Android için maskable ikon var',
   (M.icons||[]).some(i => (i.purpose||'').split(/\s+/).includes('maskable')));

/* ---------- SERVICE WORKER İKONLARI ÖNBELLEĞE ALIYOR MU ----------
   Alınmazsa çevrimdışı açılışta ikonlar kaybolur. */
const assets = cikar(sw, /const ASSETS = \[[\s\S]*?\];/, 'ASSETS');
for (const src of ikonlar)
  ok('sw.js "'+src+'" dosyasını önbelleğe alıyor', assets.includes(src.replace(/^\.?\/?/, './')));
ok('sw.js manifest\'i önbelleğe alıyor', assets.includes('./manifest.json'));

/* iOS ANA EKRAN İKONU — asıl ürün iPhone PWA'sı, bu ikon manifest'te DEĞİL,
   HTML'de apple-touch-icon olarak duruyor. Manifest'e bakan bir kontrol onu
   göremez; ayrıca kontrol edilmesi gerekiyor. */
const ios = (tel.match(/apple-touch-icon"\s+href="([^"]+)"/) || [])[1];
ok('iOS ana ekran ikonu bildirilmiş', !!ios);
if (ios) {
  ok('iOS ikonu diskte var: '+ios, fs.existsSync(path.join(REPO, ios)));
  ok('sw.js iOS ikonunu da önbelleğe alıyor', assets.includes('./'+ios.replace(/^\.?\/?/, '')));
}

/* ---------- PAYLAŞIM HEDEFİ ----------
   manifest'teki her param adı index.html'de OKUNMALI. Biri değişirse
   paylaşılan metin gelmez ve uygulama sessizce boş açılır. */
const st = M.share_target;
ok('paylaşım hedefi tanımlı', !!st);
if (st) {
  const fromShare = cikar(tel, /function fromShare\(\)\{[\s\S]*?\n\}/, 'fromShare');
  for (const [, param] of Object.entries(st.params || {}))
    ok('paylaşım parametresi "'+param+'" index.html\'de okunuyor',
       new RegExp("p\\.get\\('"+param+"'\\)").test(fromShare));
  ok('paylaşım hedefi uygulama köküne gidiyor', st.action === './');
  ok('paylaşım yöntemi GET (POST olsaydı sunucu gerekirdi)', st.method === 'GET');
  ok('paylaşılan metin senaryo olarak kaydediliyor', /st\.scripts\.unshift/.test(fromShare));
}

/* ---------- KISAYOLLAR ----------
   Her kısayolun ?go= değeri index.html'de karşılanmalı; yoksa ana ekrandaki
   kısayola basmak hiçbir şey yapmaz. */
const fromShortcut = cikar(tel, /function fromShortcut\(\)\{[\s\S]*?\n\}/, 'fromShortcut');
const kisayollar = M.shortcuts || [];
ok('manifest kısayol bildiriyor', kisayollar.length > 0);
for (const k of kisayollar) {
  const g = (k.url.match(/[?&]go=([^&]+)/) || [])[1];
  ok('kısayol "'+k.short_name+'" ?go='+g+' değeri taşıyor', !!g);
  if (g) ok('?go='+g+' index.html\'de karşılanıyor',
            new RegExp("go==='"+g+"'").test(fromShortcut));
}
for (const k of kisayollar)
  ok('kısayol "'+(k.short_name||k.name)+'" adı ana ekrana sığıyor (≤12)',
     (k.short_name || k.name).length <= 12);

/* ---------- SIRA TUZAĞI ----------
   fromShare() sorgu dizesini history.replaceState ile SİLİYOR ve
   fromShortcut() ONDAN SONRA location.search'ü okuyor. Bugün sorun yok
   çünkü fromShare metin yoksa erken dönüyor. O erken dönüş kaldırılırsa
   ?go= kısayolları sessizce ölür. */
const fs2 = cikar(tel, /function fromShare\(\)\{[\s\S]*?\n\}/, 'fromShare');
ok('fromShare paylaşılacak metin yoksa erken dönüyor (kısayolları koruyan şey bu)',
   /if\(!txt\) return;/.test(fs2));
ok('fromShare sorguyu ancak metin varken siliyor',
   fs2.indexOf('if(!txt) return;') < fs2.indexOf('history.replaceState'));
ok('fromShortcut kendi sorgusunu temizliyor', /if\(go\) history\.replaceState/.test(fromShortcut));

/* ---------- KURULUM KİMLİĞİ ---------- */
ok('kısa ad ana ekrana sığıyor (≤12 karakter)', (M.short_name||'').length <= 12);
ok('uygulama adı var', !!M.name);
ok('başlangıç adresi ile kapsam tutarlı', M.start_url === './' && M.scope === './');
ok('tema rengi HTML meta ile aynı',
   new RegExp('name="theme-color" content="'+M.theme_color+'"').test(tel));
ok('bağımsız pencere modu (tarayıcı çubuğu olmadan)', M.display === 'standalone');
