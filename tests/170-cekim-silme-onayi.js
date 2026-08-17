const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* ÇEKİM SİLME İKİ ADIMLI OLMALI (2026-08-17, arşivi kullanırken bulundu).

   Depoda üç silme yolu vardı ve en tehlikelisi en korumasızdı:

     senaryo silme      → çöp kutusu + "↺ Silineni geri getir"
     TOPLU çekim silme  → iki adımlı onay ("Emin misin? (n)")
     TEK çekim silme    → dokun, gitti                    <- video, geri gelmez

   Çekim satırında altı simge düğmesi yan yana: ⭐ ▶︎ 💬 📝 ⬇︎ 🗑. Paylaş ile
   sil KOMŞU. Yanlış simgeye dokunmak çekimi kalıcı yok ediyordu; videonun
   kopyası başka hiçbir yerde yok (uygulama sunucusuz, cihazda tutuyor).

   Bu deponun 1 numaralı hata sınıfı burada da geçerli: koruma EKLENMİŞ ama
   yalnız bir yola — kardeş yol açıkta kalmış (aynı desen mig-322'de EduGo'da,
   burada da toplu/tek silme ayrımında).

   İddia: (1) ilk dokunuş SİLMEZ, sorar; (2) ikinci dokunuş siler;
   (3) 4 sn sonra kendiliğinden vazgeçer; (4) sayfa kapanınca vazgeçer —
   toplu silmede tam bu kusur yaşandı: kapatıp geri açınca tek dokunuş
   yıldızsız çekimlerin HEPSİNİ siliyordu. */

const src = oku(telefonYolu());

/* --- kaynak düzeyi: çıkarım çökse de adı olan iddia bassın --- */
const blok = (src.match(/const sb=d\.querySelector\('\[data-a="del"\]'\);[\s\S]{0,900}?\n    \};/)||[])[0];
ok('silme düğmesinin işleyicisi kaynakta bulundu', !!blok);
ok('onay durumu çekim kimliğinde tutuluyor (yeniden çizim kaybetmesin)',
   /let takeSilArm=null, takeSilT=null;/.test(src));
/* Bu iddia KOŞARAK ölçülüyor: kaynakta `takeSilArm=null` satırını görmek
   yetmez — satır `if(false){…}` içinde de durabilir ve testi kandırır
   (kasıtlı bozma turunda tam bunu yaptım, desen bozmayı yakalayamadı).
   Fonksiyonu çıkarıp gerçekten çağırıyoruz: onay düşmüş mü? */
{
  const ipt = (src.match(/function silmeyiIptal\(\)\{[\s\S]*?\n\}/)||[])[0];
  ok('kapatma işleyicisi kaynakta bulundu', !!ipt);
  if (ipt) {
    const kos = new Function('sahne', `
      const {clearTimeout, $, t, m, renderTakes} = sahne;
      let wipeArm=1, wipeT=1, arsivSilArm=1, arsivSilT=1;
      let takeSilArm='cekim-1', takeSilT=1;
      ${ipt}
      silmeyiIptal();
      return takeSilArm;
    `);
    const sonuc = kos({ clearTimeout:()=>{}, $:()=>null, t:k=>k, m:k=>k, renderTakes:()=>{} });
    ok('sayfa kapanınca onay GERÇEKTEN düşüyor', sonuc===null);
  }
}
ok('onay düğmesi görsel olarak da uyarıyor', /\.iconbtn\.arm\{background:var\(--dan/.test(src));
ok('onay metni sözlükte (tr)', /takeDelSure:'Silmeyi onayla/.test(src));
ok('onay metni sözlükte (en)', /takeDelSure:'Confirm delete/.test(src));

/* --- davranış: işleyiciyi gerçekten koştur --- */
if (blok) {
  let silinen=[], cizim=0, zamanlayici=null;
  const sahne = {
    dbDel: async id => { silinen.push(id); },
    renderTakes: () => { cizim++; },
    toast: () => {},
    m: k => k,
    clearTimeout: () => { zamanlayici=null; },
    setTimeout: (fn) => { zamanlayici=fn; return 1; },
  };
  const sb = { textContent:'🗑', classList:{ add(){}, remove(){} }, setAttribute(){} };
  const it = { id: 'cekim-1' };
  let takeSilArm=null, takeSilT=null;
  /* Blok kendi `sb` değişkenini tanımlıyor; simülasyonda düğmeyi ona
     `d.querySelector` üzerinden veriyoruz, dışarıdan aynı adla geçirmiyoruz. */
  const kur = new Function('dugme','it','sahne', `
    const {dbDel, renderTakes, toast, m, clearTimeout, setTimeout} = sahne;
    const d = { querySelector: () => dugme };
    let takeSilArm = null, takeSilT = null;
    ${blok}
    return { tikla: dugme.onclick };
  `);
  /* takeSilArm modül kapsamında; simülasyonda da öyle davransın diye
     kapanışı tek seferde kuruyoruz ve aynı işleyiciyi iki kez çağırıyoruz. */
  const h = kur(sb, it, sahne);

  (async () => {
    await h.tikla();
    ok('ilk dokunuş SİLMİYOR', silinen.length===0);
    ok('ilk dokunuş onay soruyor', sb.textContent==='✓?');
    await h.tikla();
    ok('ikinci dokunuş siliyor', silinen.length===1 && silinen[0]==='cekim-1');
    ok('silince liste yenileniyor', cizim===1);
    /* zaman aşımı: onay silinmeden kendiliğinden düşmeli */
    silinen=[];
    const h2 = kur(sb, it, sahne);
    await h2.tikla();
    ok('zaman aşımı işleyicisi kuruldu', typeof zamanlayici==='function');
    zamanlayici();
    ok('zaman aşımından sonra düğme eski hâline dönüyor', sb.textContent==='🗑');
    await h2.tikla();
    ok('zaman aşımından sonra tek dokunuş SİLMİYOR (yeniden soruyor)', silinen.length===0);
  })();
}


/* ---------- SONUÇ EKRANINDAKİ "SİL" (aynı tur, aynı sınıf) ----------
   Çekim biter bitmez açılan sonuç ekranında kırmızı "Sil" düğmesi
   "Dosyalar'a Kaydet"in KOMŞUSU. Silinen şey henüz hiçbir yere
   kaydedilmemiş, az önce çekilmiş videodur — arşivdekinden bile riskli.
   Aynı iki adımlı desen burada da koşarak sınanıyor. */
{
  const blok2 = (src.match(/\$\('#redoBtn'\)\.onclick=async\(\)=>\{[\s\S]*?closeResult\(\); \};/)||[])[0];
  ok('sonuç ekranı silme işleyicisi bulundu', !!blok2);
  ok('onay metni sözlükte (tr)', /deleteSure:'Emin misin\? Bu çekim geri gelmez'/.test(src));
  ok('onay metni sözlükte (en)', /deleteSure:'Are you sure\? This take is gone for good'/.test(src));
  /* AD ALANI KUSURU (2026-08-17, uygulamayı kullanırken bulundu): metin
     doğru sözlükte durabilir ama YANLIŞ okuyucuyla çağrılırsa düğmede
     çevirinin yerine anahtarın kendisi (`deleteSure`) yazar. Testler sahte
     bir m() ile bunu göremedi. Etiketler t(), mesajlar m() ile okunur —
     `deleteSure` ve `deleteRedo` etiket sözlüğünde, o hâlde t() olmalı. */
  ok('onay metni ETİKET sözlüğünden okunuyor (t, m değil)',
     /b\.textContent=t\('deleteSure'\)/.test(src) && !/textContent=m\('deleteSure'\)/.test(src));
  ok('eski etiket de aynı sözlükten geri geliyor',
     /b\.textContent=t\('deleteRedo'\)/.test(src));
  /* Ekran kapanınca vazgeçmeli — KOŞARAK ölçülüyor, desen görmekle değil. */
  const ipt2 = (src.match(/function redoIptal\(\)\{[\s\S]*?\n\}/)||[])[0];
  ok('sonuç ekranı iptal işleyicisi bulundu', !!ipt2);
  if (ipt2) {
    const kos2 = new Function('sahne', `
      const {clearTimeout, $, m, t} = sahne;
      let redoArm=1, redoT=1;
      ${ipt2}
      redoIptal();
      return redoArm;
    `);
    ok('kapatınca sonuç ekranı onayı GERÇEKTEN düşüyor',
       kos2({ clearTimeout:()=>{}, $:()=>null, m:k=>k, t:k=>k })===0);
  }
  ok('closeResult iptali çağırıyor',
     /function closeResult\(\)\{[\s\S]{0,700}?redoIptal\(\)/.test(src));
  if (blok2) {
    let silinen=[], kapandi=0;
    const dugme={ textContent:'Sil' };
    const kur2 = new Function('dugme','sahne', `
      const {dbDel, toast, m, t, closeResult, clearTimeout, setTimeout} = sahne;
      const $ = () => dugme;
      let curTakeId='cekim-9', lastBlob={}, redoArm=0, redoT=null;
      function redoIptal(){ redoArm=0; dugme.textContent=t('deleteRedo'); }
      ${blok2}
      return { tikla: dugme.onclick, kalan: () => curTakeId };
    `);
    /* Sahte sözlükler AYRI: yanlış ad alanından okuyan kod, doğru metni
       değil "MESAJ:anahtar" verir ve iddia bunu görür. */
    const h=kur2(dugme,{ dbDel:async id=>{silinen.push(id);}, toast:()=>{},
                         m:k=>'MESAJ:'+k, t:k=>({deleteRedo:'Sil',deleteSure:'Emin misin? Bu çekim geri gelmez'}[k]||'?'),
                         closeResult:()=>{kapandi++;}, clearTimeout:()=>{}, setTimeout:()=>1 });
    (async()=>{
      await h.tikla();
      ok('sonuç ekranı: ilk dokunuş SİLMİYOR', silinen.length===0 && kapandi===0);
      ok('sonuç ekranı: ilk dokunuş GERÇEK metinle soruyor (anahtar değil)',
         dugme.textContent==='Emin misin? Bu çekim geri gelmez');
      await h.tikla();
      ok('sonuç ekranı: ikinci dokunuş siliyor', silinen.length===1 && kapandi===1);
    })();
  }
}

/* ---------- MASAÜSTÜNDE DE AYNI KORUMA (deponun 5. kuralı) ----------
   "İki platformu karşılaştır" bu turda yine işe yaradı: telefondaki iki
   silme yolunu onarınca masaüstünde ÜÇÜNCÜSÜ çıktı. Orada arşiv bir metin
   kutusu ve silme YAZARAK tetikleniyor ("3 sil") — yanlış satır numarası ya
   da kazara düşen bir kelime, geri getirilemez kayıp demekti.

   ÇÖZÜM İKİNCİ DİYALOG DEĞİL: bu dosyada engelleyici çağrı sayısı bilerek
   BİRDE tutuluyor (açık diyalog sufleyi, kamerayı ve sesle takibi durduruyor
   — tests/119). İlk yazımda ikinci bir prompt eklemiştim ve kapı beni haklı
   olarak kırmızıya düşürdü. Artık telefondaki desenin aynısı: ilk komut
   sormak, tekrarı silmek. */
{
  const {macYolu} = require('./kaynak.js');
  const msrc = oku(macYolu());
  const mblok = (msrc.match(/if\(sil\)\{[\s\S]*?return;\n    \}/)||[])[0];
  ok('masaüstü silme yolu bulundu', !!mblok);
  ok('ilk komut silmiyor, onay durumu kuruluyor',
     !!mblok && /silArm=\{id:it\.id, an:simdi\}/.test(mblok));
  ok('hangi çekim silineceği söyleniyor',
     !!mblok && /it\.created\)\.toLocaleString\(\)/.test(mblok) && /toast\(m\('takeDelAsk'\)/.test(mblok));
  ok('onay süreli (sonsuza kadar silmeye hazır beklemiyor)',
     !!mblok && /simdi-silArm\.an>30000/.test(mblok));
  ok('başka çekim seçilince onay düşüyor', !!mblok && /silArm\.id!==it\.id/.test(mblok));
  ok('onay metinleri iki dilde de var',
     /takeDelAsk:'⚠️ Silmek üzeresin:'/.test(msrc) &&
     /takeDelAsk:'⚠️ About to delete:'/.test(msrc));
  /* Sayfayı donduran diyalog SAYISI artmamalı — düzeltme kuralı delmesin. */
  const eng=(msrc.replace(/\/\*[\s\S]*?\*\//g,'').match(/\bprompt\(|\bconfirm\(|\balert\(/g)||[]).length;
  ok('engelleyici diyalog sayısı 1de kaldı ('+eng+')', eng<=1);

  /* Davranış KOŞARAK: iki kez çağır, ilkinde silmemeli. */
  if (mblok) {
    let silinen=[], mesaj=[];
    const kur3 = new Function('sahne', `
      const {mdbDel, toast, m, zaman} = sahne;
      let silArm={id:null, an:0};
      const it={id:'t1', created:1755400000000, title:'Deneme'};
      const sil=true;
      const Date2=Date;
      const Date_now=()=>zaman();
      return async function(){
        const simdi=Date_now();
        ${mblok.replace('const simdi=Date.now();','').replace('if(sil){','').replace(/\n    \}$/,'')}
      };
    `);
    let t=1000000;
    const cagir=kur3({ mdbDel:async id=>{silinen.push(id);}, toast:x=>mesaj.push(x),
                       m:k=>k, zaman:()=>t });
    (async()=>{
      await cagir();
      ok('masaüstü: ilk komut SİLMİYOR', silinen.length===0 && mesaj.length===1);
      await cagir();
      ok('masaüstü: tekrar edilince siliyor', silinen.length===1);
      /* 30 saniye geçerse onay düşer: yeniden sorar. */
      silinen=[]; t+=40000;
      await cagir(); await cagir();
      ok('süre dolunca yeniden soruyor (tek komut silmiyor)', silinen.length===1);
    })();
  }
}
