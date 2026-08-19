const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {oku,telefonYolu}=require('./kaynak.js');
const src=oku(telefonYolu());

/* ===== GÜZELLİK (YÜZ YUMUŞATMA) — v9.33 =====
   Erdal: "yüz maskeleme yok, diğer birçok teleprompterda var."
   Ölçüldü: renk düzeltme (parlaklık/kontrast/doygunluk/SICAKLIK/keskinlik)
   vardı, cilt yumuşatma yoktu. */
const fs_=src.slice(src.indexOf('const FS_SRC='), src.indexOf('let comp='));
ok('shader güzellik değişkenini alıyor', /uniform float bty;/.test(fs_));
ok('yumuşatma fonksiyonu var', /vec3 skinSoft\(vec2 t,vec3 c0\)/.test(fs_));
ok('güzellik kapalıyken tek örnek bile fazladan okunmuyor', /if\(bty<=0\.0\) return c0;/.test(fs_));
ok('sekiz komşu örnek alınıyor', (fs_.match(/texture2D\(tex,t[+-]a[1-4]\)/g)||[]).length===8);
/* KENAR KORUMA ŞART: düz bulanıklık gözü, kaşı ve dudak sınırını da siler —
   "güzellik" değil "maske" olur. Ağırlık parlaklık farkıyla düşüyor. */
ok('örnek ağırlığı parlaklık farkına göre düşüyor', /float wsk\(vec3 s,float l0\)[\s\S]{0,200}smoothstep/.test(fs_));
ok('yumuşatma karışım oranı güzellik değeri', /return mix\(c0,bl,bty\);/.test(fs_));
ok('yumuşatma keskinlikten ÖNCE uygulanıyor', /sharpen\(t,skinSoft\(t,texture2D\(tex,t\)\.rgb\)\)/.test(fs_));

const vp=src.slice(src.indexOf('function vidParams(){'), src.indexOf('function hex2rgb'));
ok('güzellik artınca keskinlik geri çekiliyor', /shp:base\.shp\*k\*\(1-0\.75\*b\)/.test(vp));
/* Renk filtresi "Kapalı" iken de güzellik çalışmalı: erken dönüşte düşerse
   ayar sessizce ölür (deponun 1 numaralı hata sınıfı). */
ok('filtre kapalıyken de güzellik taşınıyor', /if\(st\.vidFx==='off'\) return Object\.assign\(\{\},base,\{bty:/.test(vp));
ok('güzellik GPU\'ya gönderiliyor', /uniform1f\(gl\.getUniformLocation\(comp\.pr,'bty'\)/.test(src));
/* ÖN KOŞULU KENDİ SAĞLAMALI: GL boru hattı yalnız kompozit açıkken koşuyor. */
ok('güzellik kompoziti kendisi açıyor', /if\(\(st\.vidFx==='off' && !\(st\.bty>0\)\) \|\| comp\.on\) return true;/.test(src));
ok('güzellik sürgüsü arayüzde var', /id="btyAmt"[^>]*min="0" max="100"/.test(src));
ok('sürgünün erişilebilir adı var', /btyAmt:'Güzellik miktarı'/.test(src) && /btyAmt:'Beauty amount'/.test(src));
ok('güzellik etiketi iki dilde', /btyL:'Güzellik \(yüz yumuşatma\)'/.test(src) && /btyL:'Beauty \(skin smoothing\)'/.test(src));
ok('kompozit bağımlılık kutusunun İÇİNDE', src.indexOf('id="btyAmt"')>src.indexOf('id="vfxDeps"') &&
   src.indexOf('id="btyAmt"')<src.indexOf('data-i18n="vfxHint"'));

/* ===== HIZLI ERİŞİM ===== */
const hz=src.slice(src.indexOf('function hizliKapat()'), src.indexOf('/* ===== SESLİ TAKİPTE'));
ok('hızlı erişim düğmesi sahnenin sağ üstünde', /#hizliBtn\{position:absolute;top:calc\(10px \+ env\(safe-area-inset-top\)\);right:10px/.test(src));
ok('düğme saydam cam yüzey', /#hizliBtn\{[^}]*background:rgba\(18,21,28,\.52\)/.test(src));
ok('iOS öneki panelde ve düğmede var',
   /#hizliBtn\{[^}]*-webkit-backdrop-filter/.test(src) && /#hizliPanel\{[^}]*-webkit-backdrop-filter/.test(src));
/* MANTIK KOPYALANMAMALI: karo, Ayarlar'daki gerçek satırı tıklıyor. Kopya
   olsaydı kamera değiştirme yasakları ve fener yeniden uygulaması ayrışırdı. */
ok('anahtar karoları Ayarlar\'daki gerçek satırı tıklıyor', /row\.click\(\);\s*\/\/ TEK yol/.test(hz));
ok('karo kendi st\[\] ataması yapmıyor', !/st\['\+|st\[k\]=/.test(hz));
ok('yazı boyutu gerçek sürgüden değişiyor', /f\.dispatchEvent\(new Event\('input'/.test(hz));
ok('yazı sınıra dayanınca sebep söyleniyor', /en büyük boyutta|en küçük boyutta/.test(hz));
ok('güzellik üç kademeli', /const BTY_KADEME=\[0,35,60\]/.test(hz));
ok('güzellik karosu ön koşulu kendi sağlıyor', /if\(st\.bty>0 && !ensureCompVfx\(\)\) return;/.test(hz));
/* Desteklemeyen cihazda dokunulup hiçbir şey olmayan karo = ölü ayar. */
ok('fener karosu cihaz desteklemiyorsa gizleniyor', /tk\.style\.display = \(tr && tr\.style\.display==='none'\) \? 'none' : ''/.test(hz));
ok('panel sahneye dokununca kapanıyor', /hizliKapat\(\);\s*\n\},true\);/.test(hz));
ok('düğme durumu ekran okuyucuya bildiriliyor', /setAttribute\('aria-expanded'/.test(hz));
/* Kapalı değerin vurgu renginde yazması "açık" gibi okunuyordu (çizilmiş
   ekranda görüldü). Renk yalnız açık karoda vurgu. */
ok('kapalı karo değeri sönük, açık karo vurgulu',
   /\.hkaro b\{[^}]*color:var\(--muted\)/.test(src) && /\.hkaro\.on b\{color:var\(--accent\)\}/.test(src));
/* Her yeni fonksiyon ADIYLA ölçülüyor: kapsam kapısı "kodda var ama hiçbir
   test anmıyor" durumunu sayıyor ve o kod sessizce çürüyen koddur. */
ok('hizliSatir tek yolu kullanıyor', /function hizliSatir\(k\)\{[\s\S]*?row\.click\(\)/.test(hz));
ok('hizliSatir satır bulunamazsa sessiz kalmıyor', /function hizliSatir[\s\S]*?logErr\('hizli'/.test(hz));
ok('hizliYazi sınırları sürgüden okuyor', /function hizliYazi\(d\)\{[\s\S]*?\+f\.min[\s\S]*?\+f\.max/.test(hz));
ok('hizliGuzellik kademeyi döngüsel ilerletiyor', /function hizliGuzellik\(\)\{[\s\S]*?%BTY_KADEME\.length/.test(hz));
ok('hizliCiz her karonun durumunu yazıyor',
   /function hizliCiz\(\)\{[\s\S]*?hzKameraV[\s\S]*?hzIsikV[\s\S]*?hzGuzellikV[\s\S]*?hzOdakV/.test(hz));
ok('hizliKapat hem sınıfı hem aria durumunu düşürüyor',
   /function hizliKapat\(\)\{[\s\S]*?remove\('hizliAcik'\)[\s\S]*?aria-expanded','false'/.test(hz));
/* Ayarlar'dan değişen değer panelde eski kalmasın. */
ok('ayar çizimi hızlı karoları da tazeliyor', /function renderVfx\(\)\{\s*\n\s*if\(typeof hizliCiz==='function'\) hizliCiz\(\);/.test(src));
ok('odak kipinde hızlı erişim de çekiliyor', /body\.hideUI #hizliBtn,body\.hideUI #hizliPanel\{opacity:0/.test(src));
ok('karoların etiketleri iki dilde', /hzGuzellik:'Güzellik'/.test(src) && /hzGuzellik:'Beauty'/.test(src));
/* DURUMLAR girdisine bakılıyor: 'telefon-hizli' adı SONRA ve BEKLE
   sözlüklerinde de geçiyor, sadece adı aramak durum listesinden silinmesini
   kaçırıyordu (bozma inmedi ama test geçti). */
ok('çizilmiş arayüz kapısı paneli ölçüyor', /\('telefon-hizli',\s+TELEFON/.test(require('fs').readFileSync(
   process.env.SUFLE_KONTRAST||require('path').join(__dirname,'..','kontrast.py'),'utf8')));
