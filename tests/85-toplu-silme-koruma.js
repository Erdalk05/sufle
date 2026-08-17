const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* J9 — TOPLU SİLME YILDIZLILARI GERÇEKTEN KORUYOR MU: KORUYOR.
   Gerçek işleyici koşturuldu: hiçbir sıralamada yıldızlı çekim silinmiyor,
   ve silinecek liste ONAY ANINDA yeniden okunuyor — yani kullanıcı onaydan
   hemen önce bir çekimi yıldızlarsa o çekim de korunuyor. Bu tasarım doğru
   ve kilitlendi.

   AMA AYNI YERDE GERİ ALINAMAZ BİR TEHLİKE VARDI: SAYFA KAPANINCA ONAY
   AÇIK KALIYORDU. Silme iki aşamalı — ilk dokunuş "Emin misin? (12)" diye
   kuruyor, ikincisi siliyor ve silme geri alınamaz. `closeSheets()` bu kurulu
   durumu SIFIRLAMIYORDU. Yani:
     düğmeye bas → "Emin misin?" → panikle, sayfayı KAPAT → 4 sn içinde
     geri aç → bir kez dokun → yıldızsız çekimlerin TAMAMI gider.
   Sayfayı kapatmak her arayüzde "vazgeç" demektir; burada değildi.
   (Arşiv kutusundaki ikizi her yeniden çizimde sıfırlanıyordu — yani koruma
   fikri zaten vardı, bu yol kapsam dışında kalmış: gecenin en sık deseni.) */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sWipe=parca(/\$\('#takesWipe'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/,'toplu silme işleyicisi');
const sIptal=parca(/function silmeyiIptal\(\)\{[\s\S]*?\n\}/,'silmeyiIptal');
if(!sWipe || !sIptal) return;

function kur(kayitlar){
  const durum={ veri:kayitlar.map(k=>({...k})), iz:[], etiket:'', zamanlayici:null };
  const api=new Function('__d', `
    let wipeArm=0, wipeT=null, arsivSilArm=0, arsivSilT=null;
    /* Tek çekim silmesinin onayı da (2026-08-17) aynı iptal işlevinden
       düşüyor; simülasyonda tanımlı olmazsa test ÜRÜN DOĞRUYKEN çöker. */
    let takeSilArm=null, takeSilT=null;
    const el={ '#takesWipe':{ set textContent(v){ __d.etiket=v; }, get textContent(){ return __d.etiket; } },
               '#archWipe':{ textContent:'' } };
    const $=k=>el[k]||null;
    const m=k=>k, t=k=>k;
    const toast=x=>__d.iz.push('toast:'+x);
    const renderTakes=()=>__d.iz.push('liste yenilendi');
    const clearTimeout=()=>{ __d.zamanlayici=null; };
    const setTimeout=(f)=>{ __d.zamanlayici=f; return 1; };
    const dbListe=async()=>__d.veri.map(x=>({...x}));
    const dbDel=async(id)=>{ __d.iz.push('SIL:'+id);
      const i=__d.veri.findIndex(x=>x.id===id); if(i>=0) __d.veri.splice(i,1); return true; };
    ${sIptal}
    ${sWipe}
    return {
      dokun:()=>el['#takesWipe'].onclick(),
      kapat:()=>silmeyiIptal(),
      sureDoldu:()=>{ if(__d.zamanlayici) __d.zamanlayici(); },
      get kurulu(){ return wipeArm; },
      yildizla:(id)=>{ const k=__d.veri.find(x=>x.id===id); if(k) k.fav=true; },
    };
  `)(durum);
  return {api,durum};
}
const silinenler=d=>d.iz.filter(x=>x.startsWith('SIL:')).map(x=>+x.slice(4));

/* ---------- ANA KORUMA: YILDIZLILAR SİLİNMİYOR ---------- */
{
  const {api,durum}=kur([
    {id:1,fav:false},{id:2,fav:true},{id:3,fav:false},{id:4,fav:true},{id:5,fav:false},
  ]);
  return api.dokun().then(()=>{
    ok('ilk dokunuş SİLMİYOR, onay istiyor', silinenler(durum).length===0);
    ok('onay etiketi silinecek sayıyı söylüyor', /delConfirm \(3\)/.test(durum.etiket));
    ok('onay kuruldu', api.kurulu===1);
    return api.dokun();
  }).then(()=>{
    const s=silinenler(durum);
    ok('ikinci dokunuş siliyor', s.length===3);
    ok('YILDIZLI ÇEKİMLER SİLİNMEDİ (en kritik iddia)', !s.includes(2) && !s.includes(4));
    ok('yıldızsızların hepsi silindi', s.includes(1)&&s.includes(3)&&s.includes(5));
    ok('yıldızlılar arşivde duruyor', durum.veri.length===2 && durum.veri.every(x=>x.fav));
    ok('kullanıcıya kaç tane silindiği söyleniyor', durum.iz.some(x=>/^toast:3 wiped/.test(x)));
    ok('liste yenileniyor', durum.iz.includes('liste yenilendi'));
    ok('onay geri alındı (art arda ikinci silme olmasın)', api.kurulu===0);
    return t2();
  });
}

function t2(){
  /* ---------- ONAY ANINDA LİSTE YENİDEN OKUNUYOR ----------
     Kullanıcı onaydan hemen önce bir çekimi yıldızlarsa o da korunmalı.
     Liste arm anında dondurulsaydı yıldızladığı çekim yine silinirdi. */
  const {api,durum}=kur([{id:1,fav:false},{id:2,fav:false},{id:3,fav:false}]);
  return api.dokun().then(()=>{
    api.yildizla(2);                       // onay beklerken yıldızladı
    return api.dokun();
  }).then(()=>{
    const s=silinenler(durum);
    ok('onay beklerken yıldızlanan çekim KORUNUYOR', !s.includes(2));
    ok('diğerleri yine siliniyor', s.includes(1)&&s.includes(3));
    return t3();
  });
}

function t3(){
  /* ---------- ASIL BULGU: SAYFA KAPANINCA ONAY DÜŞÜYOR ---------- */
  const {api,durum}=kur([{id:1,fav:false},{id:2,fav:false}]);
  return api.dokun().then(()=>{
    ok('onay kurulu', api.kurulu===1);
    api.kapat();                           // kullanıcı sayfayı kapattı
    ok('sayfa kapanınca onay DÜŞÜYOR', api.kurulu===0);
    ok('düğme etiketi de eski hâline dönüyor', /wipeTakes/.test(durum.etiket));
    return api.dokun();                    // geri açıp bir kez dokundu
  }).then(()=>{
    ok('kapatıp geri açınca tek dokunuş SİLMİYOR (yeniden onay istiyor)',
       silinenler(durum).length===0);
    ok('kayıtlar duruyor', durum.veri.length===2);
    return t4();
  });
}

function t4(){
  /* ---------- SÜRE DOLUNCA DA DÜŞÜYOR ---------- */
  const {api,durum}=kur([{id:1,fav:false}]);
  return api.dokun().then(()=>{
    api.sureDoldu();
    ok('süre dolunca onay düşüyor', api.kurulu===0);
    return api.dokun();
  }).then(()=>{
    ok('süre dolduktan sonra tek dokunuş silmiyor', silinenler(durum).length===0);
    return t5();
  });
}

function t5(){
  /* ---------- SİLİNECEK BİR ŞEY YOKSA ---------- */
  const {api,durum}=kur([{id:1,fav:true},{id:2,fav:true}]);
  return api.dokun().then(()=>{
    ok('hepsi yıldızlıysa onay bile kurulmuyor', api.kurulu===0);
    ok('hepsi yıldızlıysa hiçbir şey silinmiyor', silinenler(durum).length===0);
    ok('kullanıcıya silinecek bir şey olmadığı söyleniyor',
       durum.iz.some(x=>/nothingWipe/.test(x)));
    const bos=kur([]);
    return bos.api.dokun().then(()=>{
      ok('boş arşivde de güvenli', silinenler(bos.durum).length===0);
      kaynakDuzeyi();
    });
  });
}

function kaynakDuzeyi(){
  /* ---------- KAYNAK DÜZEYİ ---------- */
  ok('silme yıldızsızlarla sınırlı', /kill=all\.filter\(x=>!x\.fav\)/.test(kod));
  ok('liste her dokunuşta yeniden okunuyor (onay anı dahil)',
     /onclick=async\(\)=>\{\s*const all=await dbListe\(\)/.test(kod));
  ok('kapanış onayı düşürüyor', /stopLight\(\); silmeyiIptal\(\); \}/.test(kod));
  ok('iptal her iki silmeyi de kapsıyor',
     /wipeArm=0/.test(sIptal) && /arsivSilArm=0/.test(sIptal));
  ok('iptal zamanlayıcıları da temizliyor',
     /clearTimeout\(wipeT\)/.test(sIptal) && /clearTimeout\(arsivSilT\)/.test(sIptal));
  ok('iptal düğme etiketlerini geri alıyor',
     /textContent=t\('wipeTakes'\)/.test(sIptal) && /textContent=m\('archWipeBtn'\)/.test(sIptal));
  /* Arşiv kutusundaki ikizi zaten kendini sıfırlıyordu — bozulmasın. */
  /* Desen 2026-08-17'de gevşetildi: araya "depo kapalıysa düğmeyi gizle"
     satırı girdi. Kilitlenen şey BİÇİM değil KURAL — kutu her çizildiğinde
     önceki çekimden kalan onay düşer. */
  ok('arşiv kutusu yeniden çizilince de sıfırlanıyor',
     /b\.disabled=false;[\s\S]{0,120}?\}\s*\n\s*arsivSilArm=0;/.test(kod));
  ok('arşiv silmesi de yıldızlıları koruyor',
     (kod.match(/const all=await dbListe\(\), kill=all\.filter\(x=>!x\.fav\);/g)||[]).length===2);
}
