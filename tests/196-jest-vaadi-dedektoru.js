const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), os=require('os'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
const denetimPy=(()=>{
  const acik=process.env.SUFLE_DENETIM;
  if(acik && !fs.existsSync(acik)) throw new Error('Verilen denetim.py yolu yok: '+acik);
  return acik || path.join(REPO,'denetim.py');
})();

/* JEST VAADİ DEDEKTÖRÜ (2026-08-19).

   Deponun v9.31'de ADI KONAN ama yazılmayan dedektörü. Sınıf: **arayüz metni
   bir HAREKET vaat ediyor, kodda karşılığı yok** — "ölü ayar"ın metin tarafı.
   Üç vakası kayıtlı: sesli takip rozeti "okuduğun yeri parmakla göster"
   diyordu ama tek dokunuş yolu hiç yazılmamıştı (telefon ve Mac) · ve bugün
   masaüstünde beyaz ayarı ipucu "otomatiğe dönmek için sürgüye çift dokun"
   diyordu, `dblclick` işleyicisi yoktu.

   ⚠️ BU TEST DEDEKTÖRÜ KOŞTURUYOR, ŞEKLİNİ OKUMUYOR. Kaynağı grep'lemek
   dedektörün ÇALIŞTIĞINI değil YAZILDIĞINI kanıtlar; tests/190 ile aynı karar.

   Dedektörün kendi yanlış alarm kaynakları da burada kilitli — bir dedektör,
   yanlış alarm verdiği gün kapatılır ve o günden sonra hiçbir şey ölçmez. */

const kos=(html)=>{
  const f=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'sufle-jest-')),'index.html');
  fs.writeFileSync(f,html);
  try{ execFileSync('python3',[denetimPy,f],{cwd:REPO,encoding:'utf8'}); return ''; }
  catch(e){ return String(e.stdout||'')+String(e.stderr||''); }
};

/* En küçük sentetik kabuk: bir sözlük, bir kullanım, istenirse bir işleyici.
   Gerçek dosyayı kopyalamıyoruz — o zaman test ürünün BAŞKA kusurlarına da
   kırılırdı ve neyi ölçtüğü belirsizleşirdi. */
const kabuk=({ipucu, isleyici='', kullan=true})=>`<!doctype html><body>
<div id="a" ${kullan?'data-i18n="ipucu"':''} ${kullan?'':'data-i18n="baska"'}></div>
<script>
const I18N={tr:{ipucu:'${ipucu}',baska:'Bir şey'},en:{ipucu:'x',baska:'Something'}};
function t(k){ return I18N.tr[k]; }
document.querySelector('#a').textContent=t('${kullan?'ipucu':'baska'}');
${isleyici}
</script></body>`;

const VAAT=/karşılığı olmayan bir hareket vaat ediyor/;

/* ---------- 1) ÇİFT DOKUNUŞ: BUGÜNÜN GERÇEK VAKASI ---------- */
{
  const yok=kos(kabuk({ipucu:'Otomatiğe dönmek için sürgüye çift dokun'}));
  ok('çift dokunuş vaadi karşılıksızsa yakalanıyor', VAAT.test(yok));
  ok('hangi anahtarın vaat ettiği yazılıyor', /ipucu/.test(yok));
  const var_=kos(kabuk({ipucu:'Otomatiğe dönmek için sürgüye çift dokun',
    isleyici:"document.querySelector('#a').ondblclick=()=>{};"}));
  ok('karşılığı varsa temiz geçiyor', !VAAT.test(var_));
  ok('İngilizce vaat de yakalanıyor', VAAT.test(kos(kabuk({ipucu:'Double-tap the slider'}))));
}

/* ---------- 2) DİĞER NADİR HAREKETLER ---------- */
{
  ok('sürükleme vaadi karşılıksızsa yakalanıyor',
     VAAT.test(kos(kabuk({ipucu:'Konumu değiştirmek için parmakla sürükle'}))));
  ok('sürükleme karşılığı varsa temiz',
     !VAAT.test(kos(kabuk({ipucu:'Konumu değiştirmek için parmakla sürükle',
       isleyici:"addEventListener('touchmove',()=>{});"}))));
  ok('basılı tutma vaadi yakalanıyor',
     VAAT.test(kos(kabuk({ipucu:'Sıfırlamak için düğmeyi basılı tut'}))));
  ok('iki parmak vaadi yakalanıyor',
     VAAT.test(kos(kabuk({ipucu:'Yakınlaştırmak için iki parmakla aç'}))));
  ok('sallama vaadi yakalanıyor',
     VAAT.test(kos(kabuk({ipucu:'Geri almak için telefonu salla'}))));
}

/* ---------- 3) DEDEKTÖRÜN YANLIŞ ALARM KAYNAKLARI ----------
   Bir dedektör yanlış alarm verdiği gün kapatılır; o günden sonra hiçbir şey
   ölçmez. Üç kaynağın üçü de burada kilitli. */
{
  /* ① KELİME PARÇASI: "threshold" içinde "hold" geçiyor. İlk denememde
     dedektör tam da bunu yakaladı ve `keySim` etiketini suçladı. */
  ok('kelime parçası yanlış alarm vermiyor (threshold ≠ hold)',
     !VAAT.test(kos(kabuk({ipucu:'Threshold (how much is removed)'}))));
  /* ② İŞLETİM SİSTEMİ HAREKETİ: dosyaya çift tıklamak bizim arayüzümüzün
     vaadi değil, Finder'ın davranışı. */
  ok('dosyaya çift tıklama tarifi yanlış alarm vermiyor',
     !VAAT.test(kos(kabuk({ipucu:'HTML dosyasına çift tıklayarak açtıysan kumanda çalışmaz'}))));
  /* ③ KULLANILMAYAN ANAHTAR hiçbir şey vaat etmez: ortak sözlükte diğer
     kabuğa ait anahtarlar duruyor ve onları suçlamak, iki kabuğu ayrı
     sözlüklere bölmeye zorlardı. */
  ok('kabukta kullanılmayan anahtar suçlanmıyor',
     !VAAT.test(kos(kabuk({ipucu:'Ekranın sol yarısına çift dokun', kullan:false}))));
}

/* ---------- 4) ÖLÇÜTÜN KENDİSİ: SIK HAREKET AYIRT ETMEZ ----------
   "dokun/tap" her ekranda var; onu ölçmek her kabukta hep yeşil verirdi —
   ölçmeyen bir kapı. Dedektör bilerek yalnız NADİR hareketlere bakıyor ve
   bu karar burada yazılı duruyor. */
{
  ok('tek dokunuş vaadi kapıyı kırmızıya çevirmiyor (kasıtlı sınır)',
     !VAAT.test(kos(kabuk({ipucu:'Başlatmak için ekrana dokun'}))));
}

/* ---------- 5) ÜRÜNÜN KENDİSİ TEMİZ Mİ ----------
   Dedektör sentetikte çalışıyor; asıl soru iki kabuğun bugün temiz olması. */
{
  const gercek=(()=>{
    const tel=process.env.SUFLE_TELEFON||path.join(REPO,'index.html');
    const mac=process.env.SUFLE_MAC||path.join(REPO,'mac','Teleprompter Pro.html');
    try{ execFileSync('python3',[denetimPy,tel,mac],{cwd:REPO,encoding:'utf8'}); return ''; }
    catch(e){ return String(e.stdout||'')+String(e.stderr||''); }
  })();
  ok('iki kabukta da karşılıksız hareket vaadi yok', !VAAT.test(gercek));
}
