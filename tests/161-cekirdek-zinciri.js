const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,macYolu,oku,blokKes,dizeSil,REPO}=require('./kaynak');

/* ÇEKİRDEK ZİNCİRİ DENETİMİ — derleme sırası · ölü kod · tekrar · tezgâh.

   Gecede altı yeni çekirdek modülü eklendi (yon · altyazi · tempo · marka ·
   klip · muzik) ve hiçbiri "bu modüller birbirine nasıl bağlı" sorusuna
   yanıt vermiyordu. Bu dosya o soruyu ÖLÇÜYE bağlıyor.

   TURUN ÜÇ ÖLÇÜLMÜŞ BULGUSU:

   ① `blokKes` tezgâhı süslü parantezleri körü körüne sayıyordu. `duzMetin`
      içindeki `\{[^}]{1,24}\}` deseni yüzünden fonksiyon yarısından
      kesiliyordu — yani test ya çöküyor ya YARIM KODU ölçüp yanlış sonuç
      veriyordu. Tarayıcı yazıldı; bu dosya onu her fonksiyonla sınıyor.
   ② `kkParcala` (398 krkt) ve `vurguYay` iki kabukta BİREBİR AYNI
      kopyalardı. Çekirdeğe taşındı. Kalan tekrar TABANA yazıldı ki sessizce
      büyümesin — `metin.js`teki `cleanText` vakası tam olarak böyle doğmuştu
      (bir tarafta düzeltildi, diğerinde unutuldu).
   ③ Derleme sırası bugün doğru ama HİÇBİR ŞEY onu korumuyordu. Fonksiyon
      bildirimleri yukarı taşındığı için sıra bugün zararsız; bir modüle
      yükleme anında koşan tek satır girdiği gün sıra ÖLÜMCÜL olur (TDZ).
      İkisi de burada ölçülüyor. */

/* Bozulabilir kaynaklar ortam değişkeniyle veriliyor: kapının 8. adımı bu
   dosyaları geçici kopyada bozup testin gerçekten ayırt ettiğini kanıtlıyor.
   Yol verilmiş ama yoksa SESSİZCE gerçek dosyaya düşmek yasak — bozma hiç
   uygulanmadan "geçti" demek, bu depoda bir kez yaşanmış en sinsi kusur. */
const yolVer=(env, varsayilan)=>{
  const v=process.env[env];
  if(v && !fs.existsSync(v)) throw new Error('Verilen yol yok: '+v);
  return v || varsayilan;
};
const CEK=path.join(REPO,'cekirdek');
const derle=fs.readFileSync(yolVer('SUFLE_DERLE', path.join(REPO,'derle.py')),'utf8');
const PLAN=[...derle.matchAll(/\(\s*'([\w.-]+\.js)'\s*,\s*\[/g)].map(m=>m[1]);
ok('derle.py sırası okunabildi ('+PLAN.length+' modül)', PLAN.length>=10);

const yorumsuz=s=>dizeSil(s).replace(/\s+$/gm,'');
const modul={};
/* Çekirdek dosyaları da ORTAM DEĞİŞKENİNDEN okunuyor (bozma.py bunları
   geçici kopyada bozuyor); gerçek dosyayı okumak, bozmayı hiç görmemek
   demekti — kapı kendini kandırırdı. */
const ENVAD={'mesajlar.js':'SUFLE_MESAJ','mac-mesajlar.js':'SUFLE_MACMESAJ'};
const cekYolu=(ad)=>yolVer(ENVAD[ad]||('SUFLE_'+ad.replace('.js','').replace('-','').toUpperCase()),
                           path.join(CEK,ad));
for(const ad of PLAN){
  const ham=fs.readFileSync(cekYolu(ad),'utf8');
  const kod=yorumsuz(ham);
  /* Derinlik takibi: yalnız SIFIR derinlikteki satırlar "üst düzey"dir.
     Derinliğe bakmadan sütun 0a bakmak, çok satırlı bir sözlük sabitinin
     sarılmış satırlarını yükleme anında koşan kod sanıyordu (ölçüldü). */
  const bildirim=[], ustDuzeyKod=[];
  let d=0;
  for(const ln of kod.split('\n')){
    const bas=d;
    for(const ch of ln){ if('{(['.includes(ch)) d++; else if('})]'.includes(ch)) d--; }
    const t=ln.trim();
    if(bas!==0 || !t) continue;
    let m;
    if((m=t.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)/))) bildirim.push({ad:m[2],tur:m[1]});
    else if((m=t.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/))) bildirim.push({ad:m[1],tur:'function'});
    else if(/^[})\];]/.test(t)) continue;
    else ustDuzeyKod.push(t.slice(0,70));
  }
  modul[ad]={kod, bildirim, ustDuzeyKod};
}

/* ---------- 1) YÜKLEME ANINDA KOŞAN KOD YOK ---------- */
{
  /* Çekirdek modülleri kabuğun içine ART ARDA gömülüyor. Hepsi yalnız
     BİLDİRİMDEN ibaret olduğu sürece sıra zararsızdır (fonksiyon bildirimleri
     yukarı taşınır). Bir modül yükleme anında başka modülün sabitini
     okumaya başladığı gün, sıra sessiz bir ReferenceError'a döner. */
  for(const ad of PLAN){
    const k=modul[ad].ustDuzeyKod;
    ok('çekirdek '+ad+': yükleme anında koşan kod yok'+(k.length?' — '+JSON.stringify(k[0]):''),
       k.length===0);
  }
}

/* ---------- 2) DERLEME SIRASI BAĞIMLILIĞA UYUYOR ---------- */
{
  const sahip={};
  for(const ad of PLAN) for(const b of modul[ad].bildirim) sahip[b.ad]=ad;
  const bagli=[];
  for(const ad of PLAN){
    for(const [isim,kaynak] of Object.entries(sahip)){
      if(kaynak===ad) continue;
      if(new RegExp('\\b'+isim.replace(/\$/g,'\\$')+'\\b').test(modul[ad].kod))
        bagli.push([ad, kaynak, isim]);
    }
  }
  /* Bağımlılığın VARLIĞI da iddia: sıfır bağımlılık çıkarsa tarama bozulmuş
     demektir, çünkü klip.js yön kuralını çekirdekten alıyor (G.12 kararı). */
  ok('çekirdekte modüller arası bağımlılık ölçülebiliyor ('+bagli.length+')', bagli.length>0);
  ok('klip.js yön kuralını yon.jsten alıyor',
     bagli.some(([a,b,i])=>a==='klip.js'&&b==='yon.js'&&i==='cumleSonuMu'));
  for(const [ad,kaynak,isim] of bagli)
    ok('sıra doğru: '+kaynak+' ('+isim+') '+ad+'ten önce gömülüyor',
       PLAN.indexOf(kaynak) < PLAN.indexOf(ad));
}

/* ---------- 3) ÖLÜ ÇEKİRDEK KODU YOK ---------- */
{
  const tel=yorumsuz(oku(telefonYolu())), mac=yorumsuz(oku(macYolu()));
  for(const ad of PLAN){
    const k=modul[ad].kod;
    for(const b of modul[ad].bildirim){
      const re=new RegExp('\\b'+b.ad.replace(/\$/g,'\\$')+'\\b','g');
      const ic=(k.match(re)||[]).length;              // modül içi (bildirim dahil)
      const dis=Math.max((tel.match(re)||[]).length-ic, (mac.match(re)||[]).length-ic);
      /* İki geçerli durum var: ya kabuk çağırıyor ya modül kendi içinde
         kullanıyor. İkisi de yoksa kod ölüdür — kapı bunu bir kez daha
         yakaladı (`rtlHarfVar`, yon.js). */
      ok('ölü değil: '+ad+' → '+b.ad, dis>0 || ic>1);
    }
  }
}

/* ---------- 4) TEZGÂH GERÇEKTEN TAM BLOK ÇIKARIYOR ---------- */
{
  /* blokKes yarım blok döndürdüğünde test ÇÖKMEZ, YANLIŞ ÖLÇER. O yüzden
     tezgâhın kendisi ölçülüyor: iki kabuktaki her üst düzey fonksiyon
     çıkarılıp ayrıştırılıyor. */
  /* TEZGÂH KAYNAKTAN ÇIKARILIYOR, içe aktarılmıyor: kapı bozma turunda
     `kaynak.js`in kopyasını bozuyor ve içe aktarılan sürüm o bozmayı hiç
     görmezdi — yani tezgâhın kapısı kapısız kalırdı. */
  const tez=fs.readFileSync(yolVer('SUFLE_TEZGAH', path.join(__dirname,'kaynak.js')),'utf8');
  const kesKaynak=(tez.match(/\nfunction blokKes\([\s\S]*?\n\}/)||[])[0];
  ok('tezgâh kaynaktan çıkarılabildi', !!kesKaynak);
  const kes=kesKaynak ? new Function('kod','imza','bas', kesKaynak+'\nreturn blokKes(kod,imza,bas);')
                      : (()=>null);
  let toplam=0, kirik=[];
  for(const [ad,yol] of [['telefon',telefonYolu()],['masaüstü',macYolu()]]){
    const ham=oku(yol).replace(/\/\*[\s\S]*?\*\//g,'');
    /* `async` ÖNEKİ İMZAYA DAHİL: onsuz çıkarılan gövde `await` içerdiği
       için ayrıştırılamıyor ve tezgâh suçsuzken kırık görünüyordu. */
    const bulunan=new Map();
    for(const m of ham.matchAll(/(?:^|\n)\s*(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g))
      if(!bulunan.has(m[2])) bulunan.set(m[2], (m[1]?'async function ':'function ')+m[2]+'(');
    const adlar=[...bulunan.entries()];
    ok(ad+': fonksiyon listesi çıkarıldı ('+adlar.length+')', adlar.length>50);
    for(const [f,imza] of adlar){
      const g=kes(ham,imza);
      toplam++;
      if(!g){ kirik.push(ad+'/'+f+' (çıkarılamadı)'); continue; }
      try{ new Function(g); }catch(e){ kirik.push(ad+'/'+f+' ('+e.message.slice(0,40)+')'); }
    }
  }
  ok('çıkarılan '+toplam+' fonksiyonun hepsi ayrıştırılabiliyor'+
     (kirik.length?' — kırık: '+kirik.slice(0,3).join(' · '):''), kirik.length===0);

  /* Somut vaka: desen içeren fonksiyon TAM çıkmalı. Eski tezgâh burada
     `\{[^}]{1,24}\}` desenindeki süslü parantezi sayıp yarıda kesiyordu. */
  const dz=kes(yorumsuz(oku(telefonYolu())),'function duzMetin(')||'';
  ok('desen içeren fonksiyon tam çıkıyor (duzMetin)', /\n\}$/.test(dz.trim()) && dz.length>300);
  ok('duzMetin son satırına kadar çıkıyor', /trim\(\)/.test(dz));
}

/* ---------- 5) KABUKLAR ARASI TEKRAR BÜYÜMÜYOR ---------- */
{
  const TABAN=yolVer('SUFLE_TEKRAR', path.join(__dirname,'tekrar-taban.json'));
  const govdeler=(kaynak)=>{
    const kod=kaynak.replace(/\/\*[\s\S]*?\*\//g,''), out={};
    for(const m of kod.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)){
      const g=blokKes(kod,'function '+m[1]+'(');
      if(g) out[m[1]]=g.slice(g.indexOf('{')+1);
    }
    return out;
  };
  const tel=govdeler(oku(telefonYolu())), mac=govdeler(oku(macYolu()));
  const cekAd=new Set();
  for(const ad of PLAN) for(const b of modul[ad].bildirim) if(b.tur==='function') cekAd.add(b.ad);
  /* Kabuk adlandırması farklı (`st.` / `state.`); bu fark tekrar sayılmaz,
     çünkü taşınırken zaten normalleşir. */
  const norm=s=>s.replace(/\s+/g,'').replace(/\bstate\./g,'ST.').replace(/\bst\./g,'ST.');
  const tekrar=[];
  for(const f in tel){
    if(!(f in mac) || cekAd.has(f)) continue;
    const a=norm(tel[f]), b=norm(mac[f]);
    if(a.length<80) continue;
    if(a===b) tekrar.push(f);
  }
  tekrar.sort();
  ok('taban dosyası var', fs.existsSync(TABAN));
  const taban=fs.existsSync(TABAN)?JSON.parse(fs.readFileSync(TABAN,'utf8')):{birebir:[]};
  const yeni=tekrar.filter(f=>!taban.birebir.includes(f));
  ok('yeni birebir kopya eklenmedi'+(yeni.length?' — '+yeni.join(', '):''), yeni.length===0);
  /* Taşınanlar geri gelmemeli: çekirdeğe alınan bir hesabın kabuğa geri
     kopyalanması, bu turun tamamını geri alır. */
  for(const f of ['kkParcala','vurguYay']){
    ok(f+' artık kabukta ayrı yazılmıyor (çekirdekte)', cekAd.has(f) && !tekrar.includes(f));
  }
  /* TABAN SADECE KÜÇÜLEBİLİR ve YALAN SÖYLEYEMEZ: artık kopya olmayan bir
     adı listede bırakmak, tabanı sessizce şişirip yeni bir kopyaya yer
     açardı (kapsam tabanının bir kez zehirlendiği sınıfın aynısı). */
  const hayalet=taban.birebir.filter(f=>!tekrar.includes(f));
  ok('tabanda artık kopya olmayan ad yok'+(hayalet.length?' — '+hayalet.join(', '):''),
     hayalet.length===0);
  ok('taban güncel (ölçülen '+tekrar.length+' · taban '+taban.birebir.length+')',
     tekrar.length===taban.birebir.length);
}

/* ---------- 6) DIŞ MODEL BAĞIMLILIĞI YOK (G.15 kararının kilidi) ---------- */
{
  /* G.15 ÖLÇÜLDÜ (2026-08-16, Chrome 151, güvenli bağlamda gerçek tarayıcı):
     platformun kendi arka plan bulanıklaştırması `backgroundBlur` kısıtı
     olarak W3C taslağında VAR ama bu makinede YOK — 36 kısıtın hiçbiri
     bulanıklıkla ilgili değil ve kamera izinin yetenek listesi de
     (aspectRatio · deviceId · exposureMode · exposureTime · facingMode ·
     focusDistance · focusMode · frameRate · groupId · height · resizeMode ·
     width) bulanıklık taşımıyor. Yani yeşil ekransız bulanıklık için
     SEGMENTASYON MODELİ gerekirdi ve o da "sıfır bağımlılık" sözünü kırar —
     ffmpeg.wasm, mammoth.js ve OpenDyslexic ile aynı karar.
     Bu blok o kararı kilitliyor: bir gün model eklenirse kapı önce kırılır. */
  const tel=oku(telefonYolu()), mac=oku(macYolu());
  const MODEL=/mediapipe|selfie_segmentation|tensorflow|tfjs|\.tflite|\.onnx|onnxruntime|bodypix/i;
  for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
    ok(ad+': segmentasyon modeli yüklenmiyor', !MODEL.test(kod));
    /* Model olmadan bulanıklık YEŞİL EKRANLA yapılıyor; o yol duruyor mu. */
    ok(ad+': yeşil ekran yolu duruyor', /chroma|yesil|greenScreen|gl\b/i.test(kod));
  }
}
