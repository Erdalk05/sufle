const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* DEPO DOLUNCA SENARYO KAYDEDİLEMİYOR — VE VERİLEN ÖĞÜT YANLIŞTI
   Uyarı şunu diyordu: "Çekimlerim'den eski çekimleri sil."
   Ama ÇEKİMLER IndexedDB'de saklanıyor (transaction('takes')), dolan ise
   localStorage. İki ayrı depo, iki ayrı kota. Yani kullanıcı bütün çekimlerini
   siliyor, senaryosu yine kaydolmuyor. F8'deki (izin reddi) sınıfın aynısı:
   yanlış yol tarifi, hiç tarif olmamasından kötü.

   DAHASI: senaryo silmek de yer açmıyordu. Silinen senaryo geri alınabilsin
   diye çöpe DERİN KOPYA olarak ekleniyor (`trash`), yani localStorage boyutu
   neredeyse aynı kalıyor. Kullanıcı doğru şeyi yapıyor, sonuç değişmiyor.

   BÜTÇE ÖLÇÜLDÜ (800 kelimelik iki sürümlü senaryo = 15,4 KB):
     arka plan görseli tavanı 1,34 MB · 5 MB kotada ~118 senaryo sığıyor
     (görselsiz ~165). Yani sınır gerçekçi kullanımın çok ötesinde — asıl
     sorun sınırın yeri değil, sınıra gelindiğinde SÖYLENEN ŞEYDİ. */

/* ---------- ÖĞÜT ARTIK DOĞRU YERİ GÖSTERİYOR ---------- */
ok('uyarı artık çekimleri işaret etmiyor',
   !/lsFull:'[^']*[ÇC]ekim/.test(tel) && !/lsFull:'[^']*takes/.test(tel));
ok('uyarı arka plan görselini söylüyor', /lsFull:'[^']*[Aa]rka plan görselini/.test(tel));
ok('uyarı senaryo silmeyi söylüyor', /lsFull:'[^']*senaryoları sil/.test(tel));
ok('uyarı iki dilde', (tel.match(/lsFull:'/g)||[]).length >= 2);
ok('İngilizce uyarı da doğru yeri gösteriyor', /lsFull:'[^']*background image/.test(tel));

/* Gerekçe: çekimler gerçekten ayrı depoda. Değişirse öğüt de değişmeli. */
ok('çekimler IndexedDB deposunda', /transaction\('takes'/.test(kod));
ok('senaryolar localStorage deposunda', /localStorage\.setItem\(LS,JSON\.stringify\(st\)\)/.test(kod));

/* ---------- KOTA DOLUNCA ÇÖP BIRAKILIP TEKRAR DENENİYOR ---------- */
const sn=cikar(kod,/function saveNow\(\)\{[\s\S]*?\n\}/,'saveNow');
function kos({ilkYazma, ikinciYazma, cop}){
  const iz=[];
  const f=new Function('__iz','__a','__b','__cop', `
    let lsFullWarned=false, saveT=null;
    const LS='sufle';
    const st={trash:__cop.slice(), scripts:[{id:1}]};
    let deneme=0;
    const localStorage={ setItem(){ deneme++; const ok=(deneme===1?__a:__b);
      if(!ok){ const e=new Error('kota'); e.name='QuotaExceededError'; throw e; }
      __iz.push('YAZILDI:'+deneme); } };
    const clearTimeout=()=>{};
    const autoBackup=()=>__iz.push('yedek');
    const logErr=(w)=>__iz.push('log:'+w);
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x;
    ${sn}
    saveNow();
    __iz.copSonrasi = st.trash.length;
  `);
  f(iz, ilkYazma, ikinciYazma, cop);
  return iz;
}
{
  const iz=kos({ilkYazma:true, ikinciYazma:true, cop:[{id:'a'}]});
  ok('normal durumda tek yazma yetiyor', iz.filter(x=>/^YAZILDI/.test(x)).length===1);
  ok('normal durumda yedek de alınıyor', iz.includes('yedek'));
  ok('normal durumda çöp korunuyor', iz.copSonrasi===1);
  ok('normal durumda uyarı yok', !iz.some(x=>/toast:/.test(x)));
}
{
  const iz=kos({ilkYazma:false, ikinciYazma:true, cop:[{id:'a'},{id:'b'}]});
  ok('kota dolunca ikinci kez deneniyor', iz.includes('YAZILDI:2'));
  ok('ikinci denemede çöp bırakılıyor', iz.copSonrasi===0);
  ok('kullanıcıya ne olduğu söyleniyor', iz.some(x=>/toast:lsFreed/.test(x)));
  ok('kurtarılınca dolu uyarısı VERİLMİYOR', !iz.some(x=>/toast:lsFull/.test(x)));
  ok('kota hatası günlüğe yazılıyor', iz.some(x=>/log:lsFull/.test(x)));
}
{
  const iz=kos({ilkYazma:false, ikinciYazma:false, cop:[{id:'a'}]});
  ok('çöp de yetmezse dolu uyarısı veriliyor', iz.some(x=>/toast:lsFull/.test(x)));
  /* ÇÖP GERİ KONMALI: yazma yine başarısızsa geri alma geçmişini boşuna
     yok etmiş oluruz — kullanıcı hem kaydedemez hem geri alamaz. */
  ok('yer yine yetmezse çöp GERİ KONUYOR', iz.copSonrasi===1);
  ok('yanlışlıkla "temizlendi" denmiyor', !iz.some(x=>/lsFreed/.test(x)));
}
{
  const iz=kos({ilkYazma:false, ikinciYazma:true, cop:[]});
  ok('çöp boşken gereksiz ikinci deneme yapılmıyor', !iz.includes('YAZILDI:2'));
  ok('çöp boşken doğrudan uyarı veriliyor', iz.some(x=>/toast:lsFull/.test(x)));
}

/* ---------- SİLME HÂLÂ GERİ ALINABİLİR ----------
   Çöp bırakma yalnız KOTA DOLUNCA olmalı; normal silme geri alınabilir kalmalı. */
ok('silinen senaryo hâlâ çöpe derin kopyayla gidiyor',
   /st\.trash=\(st\.trash\|\|\[\]\)\.concat\(\[JSON\.parse\(JSON\.stringify\(gone\)\)\]\)\.slice\(-5\)/.test(kod));
ok('geri alma düğmesi hâlâ var', /undoDel/.test(kod));

/* ---------- ARKA PLAN GÖRSELİ ZATEN SINIRLI ----------
   Bütçenin en büyük tek kalemi; sınırı kalkarsa öğüt de anlamsızlaşır. */
ok('görsel 1280 piksele küçültülüyor', /const mx=1280/.test(kod));
ok('görsel JPEG olarak saklanıyor', /toDataURL\('image\/jpeg',0\.82\)/.test(kod));
ok('1,4 MB üstü görsel reddediliyor', /url\.length>1400000/.test(kod));
ok('reddedilince sebebi söyleniyor', /bgTooBig/.test(kod));
