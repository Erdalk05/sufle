const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const mac=oku(macYolu());
const js=src.match(/<script>([\s\S]*)<\/script>/)[1];

// ---------- NEFESLE AKIŞ: karar mantığı ----------
eval(cikar(js,/function vadKarar\(rms, esik, suAn\)\{[\s\S]*?\n\}/,'vadKarar'));
const E=0.02;
ok('net konuşma sesli', vadKarar(0.05,E,false).sesli===true);
ok('tam sessizlik sessiz', vadKarar(0.001,E,true).sesli===false);
ok('HİSTEREZİS: sınırda durum korunuyor (konuşuyorken)', vadKarar(0.022,E,true).sesli===true);
ok('HİSTEREZİS: sınırda durum korunuyor (sessizken)', vadKarar(0.022,E,false).sesli===false);
ok('sessizlik bekleme sayacını artırıyor', vadKarar(0.001,E,true).bekle===1);
ok('konuşma bekleme sayacını sıfırlıyor', vadKarar(0.05,E,false).bekle===0);
ok('sınırda sayaç artmıyor (yarım karar)', vadKarar(0.022,E,true).bekle===0);

// Titreme testi: histerezis olmasa eşik civarında kaç kez durum değişirdi?
const sinyal=[0.019,0.021,0.019,0.021,0.019,0.021,0.019,0.021];
let suAn=false, degisim=0;
sinyal.forEach(r=>{ const y=vadKarar(r,E,suAn).sesli; if(y!==suAn) degisim++; suAn=y; });
ok('sınırda TİTREMİYOR (histerezis iş görüyor)', degisim===0);
let naif=false, naifDegisim=0;
sinyal.forEach(r=>{ const y=r>=E; if(y!==naif) naifDegisim++; naif=y; });
ok('histerezissiz olsa titrerdi (kanıt)', naifDegisim>=7);

// Cümle içi kısa durak sufleyi kesmemeli: 500 ms eşiği
function akis(sinyal){
  let sesli=false, bosluk=0, akiyor=false, olaylar=[];
  sinyal.forEach(r=>{
    const k=vadKarar(r,E,sesli);
    if(k.bekle) bosluk++; else bosluk=0;
    sesli=k.sesli;
    if(sesli && !akiyor){ akiyor=true; olaylar.push('BASLA'); }
    else if(!sesli && bosluk>=5 && akiyor){ akiyor=false; olaylar.push('DUR'); }
  });
  return olaylar;
}
const konus=Array(10).fill(0.05), kisaDurak=Array(3).fill(0.001), uzunDurak=Array(8).fill(0.001);
ok('cümle içi kısa durak (300 ms) sufleyi KESMİYOR',
   akis([...konus,...kisaDurak,...konus]).join()==='BASLA');
ok('uzun durak (800 ms) sufleyi durduruyor',
   akis([...konus,...uzunDurak]).join()==='BASLA,DUR');
ok('durakdan sonra konuşunca yeniden başlıyor',
   akis([...konus,...uzunDurak,...konus]).join()==='BASLA,DUR,BASLA');
ok('baştan sessizse hiç başlamıyor', akis(uzunDurak).length===0);

// ---------- ÖN KOŞUL ve ÇAKIŞMA KURALLARI ----------
const calisir=cikar(js,/function vadCalisir\(\)\{[\s\S]*?\}/,'vadCalisir');
ok('iOS + kayıt sırasında kapalı', /IS_WK && rec && rec\.state==='recording'/.test(calisir));
const dongu = cikar(js, /vad\.iv=setInterval\(\(\)=>\{[\s\S]*?\},100\);/, 'vad döngüsü');
ok('sesle takip açıkken devreye girmiyor', dongu.includes('!voiceOn'));
ok('geri sayım sırasında başlatmıyor', dongu.includes('!counting'));
ok('iOS kayıt başlarken kapanıyor ve söylüyor', /vadDurdur\(\); toast\(m\('vadOffRec'\)\)/.test(js));
ok('kayıt bitince geri geliyor', /if\(st\.vad\) setTimeout\(vadBaslat,400\)/.test(js));
ok('uğultuyu ses sanmıyor (120 Hz altı kesiliyor)', /hp\.frequency\.value=120/.test(js));
ok('kapatınca AudioContext bırakılıyor', /function vadDurdur\(\)\{[\s\S]*?vad\.ctx\.close\(\)/.test(js));
ok('mikrofon yoksa anahtar geri alınıyor', /toast\(m\('noMic'\)\); st\.vad=false/.test(js));

// ---------- YÜZEN SUFLE (Mac) ----------
ok('Document PiP kullanılıyor', /documentPictureInPicture\.requestWindow/.test(mac));
ok('desteklenmiyorsa SESSİZ kalmıyor', /Safari desteklemiyor/.test(mac));
ok('desteklenmeyen tarayıcıda düğme soluk', /\$\('#pipBtn'\)\.style\.opacity='\.45'/.test(mac));
ok('ASIL düğüm taşınıyor (ikinci kopya yok)', /d\.body\.appendChild\(prompt\)/.test(mac));
ok('yerine iz bırakılıyor', /pipYuva=document\.createElement\('div'\)/.test(mac));
ok('pencere kapanınca sufle geri konuyor', /pipWin\.addEventListener\('pagehide', pipGeriAl\)/.test(mac));
ok('geri alma iz üzerinden yapılıyor', /pipYuva\.parentNode\.insertBefore\(prompt, pipYuva\)/.test(mac));
ok('saydamlık kaydırıcısı var', /Saydamlık/.test(mac));
ok('pencerede klavye çalışıyor', /d\.addEventListener\('keydown'/.test(mac));
ok('yeni genişlikte satırlar yeniden ölçülüyor', /setTimeout\(\(\)=>\{ measure\(\); setPos\(pos\); \},120\)/.test(mac));
ok('sayfa kapanınca pencere de kapanıyor', /window\.addEventListener\('pagehide',\(\)=>\{ if\(pipWin\) pipKapat\(\); \}\)/.test(mac));
ok('hata durumunda sufle geri konuyor', /catch\(e\)\{ logErr\('pip',e\)[\s\S]{0,80}pipGeriAl\(\)/.test(mac));
