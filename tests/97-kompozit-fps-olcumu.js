const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* G1 — KOMPOZİT AÇIKKEN FPS DÜŞÜŞÜ ÖLÇÜLÜYOR MU, EŞİK NE:
   ÖLÇÜLÜYOR (eşik 20 fps) — ama ÖLÇÜM YANLIŞ TEŞHİS ÜRETİYORDU.

   requestAnimationFrame sekme gizlenince duruyor. Ölçüm penceresi ise
   açık kalıyordu: dönüşte sayılan kare az, geçen süre kocaman. Gerçek
   akış 60 fps iken ölçülen bildirim:

       5 saniye arka plan   ->  17 fps
      30 saniye arka plan   ->   4 fps
     120 saniye arka plan   ->   1 fps

   Eşik 20 olduğu için üçü de hazırlık kontrolünde ENGEL gibi görünüyor:
   "Kompozit yavaş — çözünürlüğü 720p yap ya da kompoziti kapat". Yani
   hiçbir sorunu olmayan kullanıcıya video kalitesini düşürtebilir ya da
   yeşil ekranı kapattırabilirdi. Telefonda uygulamadan çıkıp geri dönmek
   en sıradan davranış; hazırlık kontrolünü tam da o sırada açıyorsun.

   Depodaki en verimli sınıf: YANLIŞ TEŞHİS (kamera izni, depo dolu,
   kumanda paneli, "sufle hiç akmadı" ile aynı aile).

   ÇÖZÜM: kare arası 1 saniyeyi aşarsa döngü askıya alınmıştır — 10 fpsde
   bile kareler 100 ms arayla gelir. O pencere ölçülmüyor, yeniden
   başlatılıyor; son GEÇERLİ değer korunuyor. */

/* ---------- ÖLÇÜM VAR MI, EŞİK NE ---------- */
ok('fps sayacı var', /const compFps=\{n:0,t0:0,v:0,son:0\};/.test(kod));
ok('kompozit başlarken sayaç sıfırlanıyor',
   /comp\.on=true; compFps\.n=0; compFps\.t0=performance\.now\(\); compFps\.v=0; compFps\.son=0;/.test(kod));
ok('hazırlık kontrolü fpsi okuyor', /if\(comp\.on && compFps\.v\)\{/.test(kod));
ok('eşik 20 fps', /if\(compFps\.v<20\)/.test(kod));
/* v9.34: cümleler sözlüğe taşındı ({f} yer tutucusuyla). İki dilde de
   varlıkları ve sayının GERÇEKTEN yerine oturduğu ölçülüyor. */
ok('yavaşsa ne yapılacağı yazıyor (720p ya da kompoziti kapat)',
   /720p yap ya da kompoziti kapat/.test(tel) && /Drop to 720p or turn composite off/.test(tel));
ok('akıcıysa da sayı gösteriliyor',
   /rcKompAkici:'Kompozit akıcı: \{f\} fps'/.test(tel) &&
   /rcKompAkici:'Composite smooth: \{f\} fps'/.test(tel) &&
   /srY\(t\('rcKompAkici'\),\{f:compFps\.v\}\)/.test(kod));
ok('yavaş satırında da sayı yerine oturuyor',
   /srY\(t\('rcKompYavas'\),\{f:compFps\.v\}\)/.test(kod));
/* Ölçüm penceresi 2 saniye: daha kısa olsa gürültülü, daha uzun olsa geç kalır. */
ok('ölçüm penceresi 2 saniye', /if\(nowF-compFps\.t0>=2000\)\{/.test(kod));

/* ---------- GERÇEK SAYACI KOŞTUR ---------- */
const m=kod.match(/compFps\.n\+\+;[\s\S]*?compFps\.v=Math\.round[^\n]*\}/);
ok('fps bloğu çıkarılabildi', !!m);
if(!m) return;

/* Sentetik kare saati sistemin KENDİ ölçüm kuralına karşı doğrulanıyor:
   sayaç n kareyi geçen süreye bölüyor, yani düz akışta bildirilen değer
   üretilen kare hızına EŞİT olmalı. Aşağıdaki düz akış sınavı bu denkliği
   önce kanıtlıyor; kanıtlanmazsa arka plan sayıları da anlamsız olurdu. */
function kos(kareler){
  return new Function('__k', `
    const compFps={n:0,t0:__k[0],v:0,son:0};
    const iz=[]; let saat=0;
    const performance={ now:()=>saat };
    for(const t of __k){ saat=t; ${m[0]} iz.push({t, v:compFps.v}); }
    return {v:compFps.v, iz};
  `)(kareler);
}
const duz=(fps,sn,bas=0)=>{ const o=[],dt=1000/fps; for(let i=0;i<fps*sn;i++) o.push(bas+i*dt); return o; };

{
  for(const fps of [60,30,24,18,10]){
    const r=kos(duz(fps,6));
    ok('düz '+fps+' fps akışta sayaç '+fps+' diyor (ölçülen '+r.v+')', r.v===fps);
  }
  /* Eşiğin iki yanı: 18 uyarı üretmeli, 24 üretmemeli. */
  ok('18 fps eşiğin ALTINDA (uyarı doğru)', kos(duz(18,6)).v<20);
  ok('24 fps eşiğin ÜSTÜNDE (uyarı yok)', kos(duz(24,6)).v>=20);
}

/* ---------- ASIL BULGU: ARKA PLANDAN DÖNÜŞ ---------- */
{
  /* 4 sn 60 fps -> boşluk -> 4 sn 60 fps. Boşluktan sonra bildirilen ilk
     değer gerçeği yansıtmalı; eskiden 17/4/1 fps çıkıyordu. */
  for(const bosluk of [5000, 30000, 120000]){
    const a=duz(60,4);
    const b=duz(60,4, a[a.length-1]+bosluk);
    const r=kos(a.concat(b));
    const kesim=a[a.length-1];
    const oncekiV=r.iz.find(x=>x.t===kesim).v;
    const ilk=r.iz.find(x=>x.t>kesim && x.v!==oncekiV);
    const bildirilen=ilk?ilk.v:oncekiV;
    ok((bosluk/1000)+' sn arka plandan dönüşte fps YANLIŞ DÜŞÜK bildirilmiyor (ölçülen '+bildirilen+')',
       bildirilen>=20);
    ok((bosluk/1000)+' sn arka plandan dönüşte gerçeğe yakın (60 ± 5, ölçülen '+bildirilen+')',
       Math.abs(bildirilen-60)<=5);
  }
}
{
  /* Boşluk ölçüm penceresini bozmamalı ama SON GEÇERLİ değeri de silmemeli:
     kullanıcı dönüşte bir anlığına "ölçüm yok" görmesin. */
  const a=duz(24,6);
  const r=kos(a.concat(duz(24,1, a[a.length-1]+30000)));
  ok('arka plandan dönerken son geçerli ölçüm korunuyor', r.v===24);
}
{
  /* GERÇEK yavaşlık hâlâ yakalanmalı — koruma, ölçümü körleştirmemeli.
     8 fps düz akış: kareler 125 ms arayla, yani eşiğin (1 sn) çok altında. */
  const r=kos(duz(8,6));
  ok('gerçekten yavaş akış hâlâ düşük bildiriliyor (ölçülen '+r.v+')', r.v===8 && r.v<20);
  const r2=kos(duz(3,6));
  ok('çok yavaş akış da yakalanıyor (ölçülen '+r2.v+')', r2.v===3 && r2.v<20);
}

/* ---------- KAYNAK DÜZEYİ: KORUMANIN KENDİSİ ---------- */
ok('askıya alınma kare arasından anlaşılıyor',
   /if\(compFps\.son && nowF-compFps\.son>1000\)\{ compFps\.n=1; compFps\.t0=nowF; \}/.test(kod));
ok('son kare zamanı her karede güncelleniyor', /compFps\.son=nowF;/.test(kod));
/* Sıfırlarken kare sayısı 1 olmalı, 0 değil: bu kare gerçekten çizildi. */
ok('yeniden başlarken bu kare sayılıyor (n=1)', /compFps\.n=1; compFps\.t0=nowF;/.test(kod));
ok('koruma ÖLÇÜMDEN ÖNCE koşuyor (yoksa bozuk pencere yine hesaplanır)',
   kod.indexOf('nowF-compFps.son>1000') < kod.indexOf('compFps.v=Math.round'));
/* İlk karede `son` sıfır: koruma kompozit başlar başlamaz tetiklenmemeli. */
ok('ilk karede koruma tetiklenmiyor (son sıfırken)', /if\(compFps\.son &&/.test(kod));
