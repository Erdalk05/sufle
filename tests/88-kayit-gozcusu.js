const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* H3 — KAYIT GÖZCÜSÜ YANLIŞ ALARM VERİYOR MU: BİR YOLDA VERİYORDU.

   `MediaRecorder.start()` istisna atmadan da başarısız olabiliyor, o yüzden
   2,5 saniye sonra bakan bir gözcü var. Kurgusu doğruydu ama bir durum
   gözden kaçmış: İLK 2,5 SANİYE İÇİNDE DURAKLATMA.

   ÖLÇÜLEN eski davranış (gerçek gözcü koşturuldu):
     durum      | gövdede rec | sonuç
     recording  |   evet      | (sessiz)      ← doğru
     inactive   |   evet      | recNoStart    ← doğru
     kaydedici yok|  evet     | recNoStart    ← doğru
     recording  |   hayır     | (sessiz)      ← doğru, kullanıcı durdurmuş
     paused     |   evet      | recNoStart    ← YANLIŞ ALARM

   Duraklatma zaten BAŞLAMIŞ olmayı gerektirir; kullanıcı ⏸e bastığı için
   "kayıt hiç başlamadı" uyarısı almamalı. Üstelik ⏸ düğmesi kayıt başlar
   başlamaz görünüyor, yani hazır olmadığını fark edip hemen duraklatmak
   sıradan bir davranış. Gerçek bir sorun yokken korkutucu uyarı vermek,
   uyarının kendisine olan güveni bitirir. */

const m=kod.match(/setTimeout\(\(\)=>\{\s*if\(!body\.classList\.contains\('rec'\)\)[\s\S]*?\},2500\);/);
ok('gözcü çıkarılabildi', !!m);
if(!m) return;
const src=m[0];

/* İKİ BAKIŞLI GÖZCÜ (2026-08-17). Parça kontrolü artık tek seferlik değil:
   2,5 sn'de parça yoksa hemen bağırmıyor, 3,5 sn daha bekleyip TEKRAR bakıyor.
   Tezgâh bu yüzden iki adımı ayrı ayrı koşturabiliyor: `ikinci` verilmezse
   yalnız ilk bakış koşar (kullanıcının 2,5. saniyede gördüğü hâl), verilirse
   ikinci bakış da koşar ve o sırada durum DEĞİŞMİŞ olabilir. */
function kos({durum, kayitta=true, parca=false, wk=false, bayrak=false,
              ikinci=false, sonra={}}){
  const iz=[];
  new Function('__iz','__s','__k','__p','__wk','__b','__2','__son', `
    let S=__s, K=__k, P=__p, B=__b;
    const body={classList:{contains:(c)=>c==='rec'?K:false}};
    let rec=S?{state:S}:null;
    let chunks=P?[1]:[];
    const IS_WK=__wk;
    let recPaused=B;
    const m=k=>k; const toast=x=>__iz.push(x);
    let f=null; const setTimeout=(fn)=>{ f=fn; };
    ${src}
    const ilk=f; f=null; ilk();
    if(__2 && f){
      // İkinci bakıştan ÖNCE dünya değişebilir: parça gelmiş, kullanıcı
      // durdurmuş ya da duraklatmış olabilir.
      if('parca' in __son) chunks=__son.parca?[1]:[];
      if('kayitta' in __son) K=__son.kayitta;
      if('durum' in __son) rec=__son.durum?{state:__son.durum}:null;
      if('bayrak' in __son) recPaused=__son.bayrak;
      f();
    }
  `)(iz,durum,kayitta,parca,wk,bayrak,ikinci,sonra);
  return iz;
}

/* ---------- ASIL BULGU: DURAKLATMA ---------- */
{
  ok('ilk 2,5 sn içinde duraklatınca YANLIŞ ALARM YOK',
     kos({durum:'paused'}).length===0);
  ok('duraklatılmışken parça uyarısı da verilmiyor',
     kos({durum:'paused', parca:false}).length===0);
  /* Bayrak üzerinden de korunuyor: durum makinesi 'paused'a geçmeden önce
     bayrak set ediliyor olabilir. */
  ok('duraklatma bayrağı da yeterli', kos({durum:'recording', bayrak:true}).length===0);
}

/* ---------- GERÇEK SORUNLAR HÂLÂ BİLDİRİLİYOR ---------- */
{
  ok('kaydedici hiç başlamadıysa söyleniyor',
     kos({durum:'inactive'}).includes('recNoStart'));
  ok('kaydedici yoksa söyleniyor',
     kos({durum:null}).includes('recNoStart'));
  /* Bu en sinsi durum: durum "recording" ama tek parça bile gelmiyor —
     kayıt sürüyor görünüp boş dosya üretiyor. Artık İKİ BAKIŞ sonunda
     söyleniyor; tek bakışta bağırmak yanlış alarmdı (aşağıda ölçüsü var). */
  ok('parça hiç gelmiyorsa (iki bakış sonunda) söyleniyor',
     kos({durum:'recording', parca:false, ikinci:true}).includes('recNoData'));
  ok('normal kayıtta sessiz',
     kos({durum:'recording', parca:true, ikinci:true}).length===0);
}

/* ---------- YANLIŞ ALARM: GEÇ GELEN İLK PARÇA ----------
   ÖLÇÜLDÜ (2026-08-17, gerçek Chrome + sahte kamera): `rec.start(1000)`
   verilmiş olmasına rağmen ilk `dataavailable` 4621 ms'de geldi ve çekim
   tümüyle sağlamdı — sonuç ekranı açıldı, arşive yazıldı, beş altyazı satırı
   üretildi. Eski gözcü 2,5 saniyede "veri gelmiyor, durdurup tekrar başlat"
   diyordu; yani İYİ BİR ÇEKİMİ kullanıcıya durdurtuyordu. */
{
  ok('ilk bakışta parça yoksa HEMEN bağırmıyor',
     kos({durum:'recording', parca:false}).length===0);
  ok('geç gelen parça yanlış alarm ÜRETMİYOR',
     kos({durum:'recording', parca:false, ikinci:true, sonra:{parca:true}}).length===0);
  ok('ikinci bakışta kullanıcı durdurmuşsa susuyor',
     kos({durum:'recording', parca:false, ikinci:true, sonra:{kayitta:false}}).length===0);
  ok('ikinci bakışta duraklatılmışsa susuyor',
     kos({durum:'recording', parca:false, ikinci:true, sonra:{durum:'paused'}}).length===0);
  ok('ikinci bakışta duraklatma bayrağı da yeterli',
     kos({durum:'recording', parca:false, ikinci:true, sonra:{bayrak:true}}).length===0);
  /* Uyarı yalnız ERTELENDİ, kaldırılmadı: gerçek arıza hâlâ bildiriliyor. */
  ok('gerçek arıza (6 sn boyunca üretim yok) yine bildiriliyor',
     kos({durum:'recording', parca:false, ikinci:true}).filter(x=>x==='recNoData').length===1);
}
{
  /* iOS tek parça yazdığı için 2,5 saniyede parça beklenmez; orada bu
     kontrol yapılmamalı, yoksa her iOS çekiminde yanlış alarm olurdu. */
  ok('iOS tarafında parça kontrolü YAPILMIYOR',
     kos({durum:'recording', parca:false, wk:true}).length===0);
  ok('iOS tarafında gerçek başlamama yine bildiriliyor',
     kos({durum:'inactive', wk:true}).includes('recNoStart'));
}
{
  /* Kullanıcı 2,5 sn dolmadan durdurduysa gözcü hiç konuşmamalı. */
  ok('kullanıcı durdurduysa gözcü susuyor', kos({durum:'inactive', kayitta:false}).length===0);
  ok('durdurulmuşsa parça kontrolü de yapılmıyor',
     kos({durum:'recording', kayitta:false, parca:false}).length===0);
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('gözcü süresi 2,5 saniye', /\},2500\);/.test(src));
ok('önce kullanıcının durdurup durdurmadığına bakılıyor',
   src.indexOf("contains('rec')") < src.indexOf("recNoStart"));
ok('duraklatma kontrolü uyarılardan ÖNCE',
   src.indexOf("state==='paused'") < src.indexOf("recNoStart"));
ok('iki uyarı da iki dilde tanımlı',
   (tel.match(/recNoStart:'/g)||[]).length===2 && (tel.match(/recNoData:'/g)||[]).length===2);
/* Duraklatma gerçekten mümkün olmalı, yoksa bu kontrol ölü olurdu. */
ok('duraklatma özelliği var', /function togglePauseRec\(\)/.test(kod));
ok('duraklatınca durum gerçekten paused oluyor', /try\{ rec\.pause\(\); \}catch/.test(kod));
ok('duraklatma bayrağı da tutuluyor', /recPaused=true; pauseStart=performance\.now\(\)/.test(kod));
/* Duraklatma düğmesi kayıt başlar başlamaz görünüyor: yani ilk saniyelerde
   duraklatmak sıradan bir davranış, uç durum değil. */
ok('duraklatma düğmesi kayıt başlar başlamaz görünüyor',
   /if\(canPauseRec\(\)\) \$\('#pauseBtn'\)\.classList\.remove\('hidden'\)/.test(kod));
