const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {REPO, sunucuYolu}=require('./kaynak');
const kaynak=fs.readFileSync(require('./kaynak.js').sunucuYolu(),'utf8');

/* KUMANDADA SESSİZCE YUTULAN KOMUT
   Elde tutulan kumanda sayfası komutu şöyle gönderiyordu:
     function send(o){ fetch('/cmd',{...}).catch(()=>{}); }
   Hata TÜMÜYLE yutuluyordu. Bağlantı koptuğunda ya da sunucu hata döndürdüğünde:
     · düğmeye basıyorsun, sufle kıpırdamıyor
     · durum satırı hâlâ "✅ Bağlı" diyor, çünkü nabız 4 SANİYEDE BİR
   Yani çekim sırasında 4 saniye boyunca kumandanın öldüğünü bilmiyorsun ve
   ekranda seni yanıltan bir "Bağlı" yazısı duruyor.

   Hipotezin bir yarısı ÇÜRÜDÜ: nabız zaten vardı, kopmayı eninde sonunda
   söylüyordu. Eksik olan, KOMUTUN KENDİSİNİN sonucuydu.

   (Masaüstü tarafı ayrı: EventSource'u tarayıcı kendi yeniden bağlıyor,
   `es.onerror` yalnız göstergeyi söndürüyor — orada eksik yok.) */

const betik=(kaynak.match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
ok('kumanda sayfasının betiği bulunabiliyor', betik.length>50);

/* ---------- KOMUT SONUCU BİLDİRİLİYOR ---------- */
ok('artık hata sessizce yutulmuyor', !/fetch\('\/cmd'[^\n]*\)\.catch\(\(\)=>\{\}\)/.test(betik));
ok('komut sonrası durum satırı güncelleniyor', /\.then\(r=>\{if\(!r\.ok\)throw 0;/.test(betik));
ok('başarısız komutta uyarı yazılıyor', /Komut gecmedi/.test(betik));
ok('uyarı ne yapılacağını söylüyor', /baglantiyi kontrol et/.test(betik));
ok('başarılı komutta durum tazeleniyor', /durum\('\\u2705 Bagli'\)/.test(betik));

/* Sunucu HTTP hata kodu döndürürse de yakalanmalı — yalnız ağ hatası yetmez. */
ok('HTTP hata kodu da başarısızlık sayılıyor', /if\(!r\.ok\)throw 0/.test(betik));

/* ---------- DURUM YAZIMI TEK KAYNAKTAN ----------
   İki ayrı yerde element aranırsa biri unutulur ve mesajlar ayrışır. */
ok('durum yazımı tek yardımcıda', /function durum\(t\)\{document\.getElementById\('st'\)\.textContent=t;\}/.test(betik));
ok('nabız da aynı yardımcıyı kullanıyor', /\.then\(\(\)=>durum\('✅ Bağlı'\)\)/.test(betik));
ok('nabız kopmayı da aynı yardımcıyla yazıyor', /\.catch\(\(\)=>durum\('⚠️ Bağlantı koptu/.test(betik));
ok('doğrudan textContent ataması kalmadı (tek kaynak)',
   (betik.match(/getElementById\('st'\)\.textContent/g)||[]).length === 1);

/* ---------- NABIZ KORUNDU ---------- */
ok('nabız hâlâ 4 saniyede bir', /\},4000\);/.test(betik));
ok('nabız /info uç noktasını yokluyor', /fetch\('\/info'\)/.test(betik));

/* ---------- KOMUT GÖNDERİMİ BOZULMADI ---------- */
ok('komut hâlâ POST ile /cmd\'e gidiyor', /fetch\('\/cmd',\{method:'POST'/.test(betik));
ok('düğmeler hâlâ send\'e bağlı', /\[data-cmd\][\s\S]{0,80}?send\(JSON\.parse/.test(betik));
ok('hız kaydırıcısı hâlâ komut gönderiyor', /send\(\{type:'speed'/.test(betik));
ok('yazı boyutu kaydırıcısı hâlâ komut gönderiyor', /send\(\{type:'font'/.test(betik));
ok('send bir söz döndürüyor (çağıran bekleyebilsin)', /function send\(o\)\{return fetch/.test(betik));

/* ---------- SUNUCU TARAFI BOZULMADI ---------- */
ok('/cmd uç noktası duruyor', /p\.path == "\/cmd"|path == '\/cmd'/.test(kaynak) || /\/cmd/.test(kaynak));
ok('/info uç noktası duruyor', /"\/info"/.test(kaynak));
ok('/events akışı duruyor', /text\/event-stream/.test(kaynak));

/* ---------- PYTHON HÂLÂ AYRIŞTIRILABİLİR ----------
   Gömülü metni bozmak sunucuyu tümden açılamaz hâle getirirdi. */
const {execFileSync}=require('child_process');
let python=null;
for(const c of ['python3','python']){
  try{ execFileSync(c,['-c','1'],{stdio:'ignore'}); python=c; break; }catch(e){}
}
if(python){
  let hata='';
  try{ execFileSync(python,['-c','import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read())',
       path.join(REPO,'mac','teleprompter_server.py')],{stdio:'pipe'}); }
  catch(e){ hata=String(e.stderr||e); }
  ok('sunucu dosyası hâlâ geçerli Python ('+(hata?hata.slice(0,60):'temiz')+')', !hata);
} else {
  console.log('… Python yok, ayrıştırma kontrolü atlandı');
}
