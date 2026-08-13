const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* AYAR DEĞİŞTİ AMA UYGULANMADI
   v9.5'te openCam'e "kayıt sürerken kamera yeniden açılamaz" kapısı kondu
   (tests/39). Ama kamerayı yeniden açan AYARLAR durumu ÖNCE değiştirip SONRA
   openCam çağırıyordu. Kapı openCam'de olduğu için:
     · st.quality '4k' oluyor, akış 1080p kalıyor
     · uygulama "4K" gösteriyor, kayıt 1080p sürüyor
     · hazırlık paneli resNote() ile "cihaz bu kadarını verdi" yazıyor —
       YANLIŞ AÇIKLAMA, cihaza hiç sorulmadı
   Yani kullanıcı 4K çektiğini sanıyor ve uygulama bunu doğruluyor.

   DAHA KÖTÜSÜ — "🔧 Sesi düzelt" düğmesi:
     stopMeter(); ...; stream.getTracks().forEach(t=>t.stop());
   İzleri KENDİ durduruyor, openCam'in kapısına hiç varmadan. Yani çekimin sesi
   VE görüntüsü ölüyor, sonra openCam yeniden açmayı reddediyor: kayıt sürüyor
   ama elde hiçbir şey yok. H6'nın boğaz noktası bu yolu kapsamıyordu —
   "bir yön kontrol edildi, tersi edilmedi" deseninin bir örneği daha.

   Çözüm: kapı durumu değiştirmeden ÖNCE sorulacak; openCam'deki kapı yedek. */

/* ---------- ORTAK KAPI ---------- */
const kd=cikar(kod,/function kameraDegisebilir\(\)\{[\s\S]*?\n\}/,'kameraDegisebilir');
function kapi(kayitta){
  const iz=[];
  const f=new Function('__iz','__k',`
    const rec = __k ? {state:'recording'} : null;
    const toast=k=>__iz.push('toast:'+k);
    const m=k=>k;
    ${kd}
    return kameraDegisebilir();
  `);
  return {sonuc:f(iz,kayitta), iz};
}
{
  const r=kapi(true);
  ok('kayıt sürerken kapı KAPALI', r.sonuc === false);
  ok('kayıt sürerken sebebi söyleniyor', r.iz.some(x=>/camBusyRec/.test(x)));
}
{
  const r=kapi(false);
  ok('kayıt yokken kapı açık', r.sonuc === true);
  ok('kayıt yokken gereksiz uyarı yok', r.iz.length === 0);
}

/* ---------- DÖRT YOLUN HEPSİ DURUMU DEĞİŞTİRMEDEN ÖNCE SORUYOR ----------
   Sıra kritik: kapı state mutasyonundan SONRA gelirse ayar yine değişir ve
   sapma geri döner. */
function siraDogru(parca, mutasyon){
  const i=parca.indexOf('kameraDegisebilir()');
  const j=parca.indexOf(mutasyon);
  return i>=0 && j>=0 && i<j;
}
{
  /* '#qSeg' iki yerde geçiyor: apply() içindeki işaretleme ve asıl tıklama
     işleyicisi. Genel desen İLKİNİ alıp "kapı yok" diyordu — yanlış blok.
     Doğrudan onclick işleyicisini hedefle. */
  const q=cikar(kod,/\$\$\('#qSeg button'\)\.forEach\(b=>b\.onclick=[\s\S]*?\}\);/,'çözünürlük düğmeleri');
  ok('çözünürlük: kapı var', /kameraDegisebilir\(\)/.test(q));
  ok('çözünürlük: kapı st.quality DEĞİŞMEDEN önce', siraDogru(q,'st.quality=b.dataset.q'));
}
{
  const sw=cikar(kod,/\$\$\('\.sw'\)\.forEach\(s=>s\.onclick=async\(\)=>\{[\s\S]*?\n\}\);/,'anahtarlar');
  ok('anahtarlar: kamera anahtarları için kapı var',
     /\(k==='backCam'\|\|k==='rawAudio'\|\|k==='safeAudio'\) && !kameraDegisebilir\(\)/.test(sw));
  ok('anahtarlar: kapı st[k] DEĞİŞMEDEN önce', siraDogru(sw,'st[k]=!st[k]'));
  /* Kamerayla ilgisi olmayan anahtarlar (tema, biyonik, nefes) kayıt sırasında
     serbest kalmalı — gereksiz engel koymuyoruz. */
  ok('kamerayla ilgisiz anahtarlar engellenmiyor',
     !/k==='bionic'[^\n]*kameraDegisebilir/.test(sw));
}
{
  const mic=cikar(kod,/b\.onclick=async\(\)=>\{ if\(!kameraDegisebilir\(\)\) return;[\s\S]*?\};/,'mikrofon seçici');
  ok('mikrofon seçici: kapı var', /kameraDegisebilir\(\)/.test(mic));
  ok('mikrofon seçici: kapı st.micId DEĞİŞMEDEN önce', siraDogru(mic,'st.micId=d.deviceId'));
}
{
  const fx=cikar(kod,/\$\('#fixAudio'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/,'sesi düzelt');
  ok('sesi düzelt: kapı var', /kameraDegisebilir\(\)/.test(fx));
  /* EN KRİTİK SIRA: bu düğme izleri kendi durduruyor. Kapı ondan önce olmalı,
     yoksa çekimin sesi ve görüntüsü ölür ve geri açılamaz. */
  ok('sesi düzelt: kapı izler DURDURULMADAN önce',
     siraDogru(fx,'stream.getTracks().forEach(t=>t.stop())'));
  ok('sesi düzelt: kapı ölçüm durdurmadan da önce', siraDogru(fx,'stopMeter()'));
}

/* ---------- openCam KAPISI YEDEK OLARAK DURUYOR ----------
   Yeni bir çağrı yolu eklenirse yine yakalansın. */
const openCam=cikar(kod,/async function openCam\(\)\{[\s\S]*?\n\}/,'openCam');
ok('openCam kapısı hâlâ yerinde', /rec\.state==='recording'[\s\S]{0,60}?return false;/.test(openCam));
ok('openCam kapısı izleri durdurmadan önce',
   openCam.indexOf("rec.state==='recording'") < openCam.indexOf('getTracks().forEach(x=>x.stop())'));

/* ---------- SAPMANIN SONUCU: resNote YANLIŞ AÇIKLAMA YAZIYORDU ----------
   Gerçek fonksiyonla ölç: istenen ile alınan ayrışırsa "cihaz bu kadarını
   verdi" çıkıyor. Ayar uygulanmadığı hâlde değişmişse bu cümle yalan olurdu. */
const rn=new Function('st','vTrack','L',
  cikar(kod,/function resNote\(\)\{[\s\S]*?\n\}/,'resNote')+'; return resNote;');
const not=(kalite,w,h)=>rn({quality:kalite},{getSettings:()=>({width:w,height:h})},'tr')();
ok('4K istenip 1080 alınınca açıklama çıkıyor', /cihaz bu kadarını verdi/.test(not('4k',1920,1080)));
ok('1080 istenip 1080 alınınca açıklama YOK', not('1080',1920,1080) === '');
ok('720 istenip 720 alınınca açıklama YOK', not('720',1280,720) === '');
ok('dikey çekimde de doğru ölçülüyor', not('1080',1080,1920) === '');
ok('ölçüm yoksa açıklama uydurulmuyor', not('4k',0,0) === '');

const rr=new Function('vTrack',cikar(kod,/function realRes\(\)\{[\s\S]*?\n\}/,'realRes')+'; return realRes;');
ok('gösterilen çözünürlük GERÇEK izden okunuyor',
   rr({getSettings:()=>({width:1920,height:1080})})() === '1920×1080');
ok('iz yoksa çözünürlük uydurulmuyor', rr(null)() === '');

/* ---------- MESAJ ---------- */
ok('kapı mesajı iki dilde tanımlı', (tel.match(/camBusyRec:'/g)||[]).length >= 2);
