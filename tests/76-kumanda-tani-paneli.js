const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* E5 — KUMANDA TANI PANELİ 6 SANİYE SONRA NE DİYOR.
   Panel doğru çalışıyordu ama BİR DURUMDA YANLIŞ TEŞHİS veriyordu.

   Tuş işleyicisi yazı alanlarını erkenden eliyor:
       if(tag==='textarea'||tag==='input') return;
   Bu doğru — kullanıcı metnini yazarken kumanda eylemleri tetiklenmemeli.
   Ama dönüşten önce `gotKey` işaretlenmiyordu ve nöbetçi 6 saniye sonra
   şunu yazıyordu: "Hiç tuş gelmedi... iPhone ve Android bu tuşları tarayıcıya
   hiç vermez. Bu bir uygulama hatası değil, işletim sistemi sınırı."

   ÖLÇÜLEN GERÇEK: tuş GELDİ, uygulamanın kendisi attı. Üstelik bu en doğal
   yoldan oluyor — TETİK KELİMESİ metin kutusu KUMANDA PANELİNİN İÇİNDE.
   Kullanıcı kutuya dokunuyor, sonra kumandaya basıyor ve uygulama ona
   kumandasının suçlu olduğunu söylüyor. F8 (kamera izni) ve tests/67 (depo
   dolu) ile aynı sınıf: YANLIŞ YOL TARİFİ, hiç tarif olmamasından kötü —
   burada kullanıcı çalışan kumandasını atıp yenisini alabilir.

   Bu tur teşhisi ayırıyor: tuş yutulduysa panel gerçek sebebi ve tek adımlık
   çözümü söylüyor; hiç tuş gelmediyse eski işletim sistemi açıklaması duruyor. */

const mWatch=kod.match(/function armRemoteWatch\(\)\{[\s\S]*?\n\}/);
ok('armRemoteWatch çıkarılabildi', !!mWatch);
const mKey=kod.match(/window\.addEventListener\('keydown',e=>\{[\s\S]*?\n\}\);/);
ok('tuş işleyicisi çıkarılabildi', !!mKey);
if(!mWatch || !mKey) return;

/* ---------- KONUM: METİN KUTUSU GERÇEKTEN PANELİN İÇİNDE Mİ ----------
   Bulgunun dayanağı bu. Kutu başka yere taşınırsa teşhis metni de gözden
   geçirilmeli, o yüzden kapıya bağlı. */
{
  const i=tel.indexOf('id="remoteSheet"');
  ok('kumanda paneli bulundu', i>0);
  /* DİLİM SABİT UZUNLUKTA OLMAMALI (2026-08-17). 4000 karakter, panele bir
     ayar daha eklendiği anda kutuyu dilimin DIŞINDA bıraktı ve test ürün
     doğruyken kırmızı verdi. Ölçüt panelin kendi sonu: bir sonraki üst düzey
     panel başlangıcı. */
  const sonraki=tel.indexOf('<div class="sheet"', i+10);
  const panel=tel.slice(i, sonraki>i ? sonraki : i+12000);
  ok('tetik kelimesi kutusu kumanda panelinin İÇİNDE', /id="wakeWord"/.test(panel));
  ok('tanı alanı da aynı panelde', /id="remoteDiag"/.test(panel));
}

/* ---------- TUŞ İŞLEYİCİSİ: YUTULDUĞUNU NOT EDİYOR MU ---------- */
ok('yazı alanına giden tuş hâlâ eleniyor (metin yazarken eylem tetiklenmesin)',
   /tag==='textarea'\|\|tag==='input'/.test(mKey[0]));
ok('elenen tuş NOT EDİLİYOR', /yazidaYutuldu=true/.test(mKey[0]));
ok('normal tuş hâlâ işaretleniyor', /gotKey=true; noteKey\(e\.key\)/.test(mKey[0]));
ok('nöbetçi her açılışta iki bayrağı da sıfırlıyor', /gotKey=false; yazidaYutuldu=false/.test(mWatch[0]));

/* ---------- NÖBETÇİ GERÇEKTEN NE YAZIYOR ---------- */
function nobetKos({tusGeldi, yutuldu}){
  return new Function('__g','__y', `
    let gotKey=false, remoteWatch=0, yazidaYutuldu=false;
    const L='tr';
    const el={textContent:'', innerHTML:''};
    const $=s=>(s==='#remoteDiag'?el:null);
    let zamanlayici=null;
    const clearTimeout=()=>{};
    const setTimeout=(f)=>{ zamanlayici=f; return 1; };
    /* G.14: nöbetçi artık bağlantı yolları listesini de tazeliyor. Tezgâh o
       çağrıyı karşılamak zorunda — yoksa test kodun kusurunu değil KENDİ
       eksiğini bildirir (bu gece dördüncü vakası). */
    const yollariYaz=()=>{};
    ${mWatch[0]}
    armRemoteWatch();
    const ilk=el.textContent;
    gotKey=__g; yazidaYutuldu=__y;
    zamanlayici();
    return {ilk, son:el.innerHTML, metin:el.textContent};
  `)(tusGeldi, yutuldu);
}
{
  const r=nobetKos({tusGeldi:false, yutuldu:false});
  ok('panel önce tuşa basmayı istiyor', /Kumandandaki bir tuşa bas/.test(r.ilk));
  ok('hiç tuş gelmeyince işletim sistemi açıklaması veriliyor',
     /Hiç tuş gelmedi/.test(r.son));
  ok('açıklama çalışan kumanda türlerini sayıyor', /sunum kumandaları/.test(r.son));
  ok('kumandası olmayana sesli komut öneriliyor', /sesli komut/.test(r.son));
}
{
  const r=nobetKos({tusGeldi:false, yutuldu:true});
  ok('tuş yazı kutusuna düştüyse GERÇEK sebep söyleniyor',
     /yazı kutusuna gidiyor/.test(r.son));
  ok('yanlış teşhis (işletim sistemi sınırı) ARTIK verilmiyor',
     !/işletim sistemi sınırı/.test(r.son) && !/Hiç tuş gelmedi/.test(r.son));
  ok('tek adımlık çözüm söyleniyor', /dışına bir kez dokun/.test(r.son));
  ok('sebep panelin kendi kutusuna bağlanıyor', /tetik kelimesi/.test(r.son));
}
{
  const r=nobetKos({tusGeldi:true, yutuldu:false});
  ok('tuş ulaştıysa nöbetçi hiçbir şey yazmıyor', r.son==='');
  const r2=nobetKos({tusGeldi:true, yutuldu:true});
  ok('tuş ulaştıysa yutulma notu da devreye girmiyor', r2.son==='');
}

/* ---------- SÜRE VE TEMİZLİK ---------- */
ok('nöbet süresi 6 saniye', /\},6000\)/.test(mWatch[0]));
ok('yeni açılışta eski nöbet iptal ediliyor', /clearTimeout\(remoteWatch\)/.test(mWatch[0]));
/* Panel kapanınca nöbetçi kalmamalı: kapalı panele yazmak sessiz iş yapmaktır
   ve kullanıcı sonraki açılışta bayat metin görebilir. */
ok('panel kapanınca nöbetçi iptal ediliyor',
   /function closeSheets\(\)\{[^\n]*clearTimeout\(remoteWatch\)/.test(kod));
ok('panel açılınca nöbetçi kuruluyor',
   /openSheet\('#remoteSheet'\); armRemoteWatch\(\)/.test(kod));

/* ---------- OLUMLU YOL: TUŞ GELİNCE NE OLUYOR ---------- */
const mNote=kod.match(/function noteKey\(k\)\{[\s\S]*?\n\}/);
ok('noteKey çıkarılabildi', !!mNote);
if(mNote){
  ok('gelen tuş ekranda gösteriliyor', /el\.textContent=keyLabel\(k\)/.test(mNote[0]));
  ok('bağlandı mesajı veriliyor', /Kumanda bağlı/.test(mNote[0]));
  ok('sonraki adım söyleniyor (tuş öğret)', /Tuş öğret/.test(mNote[0]));
  ok('mesaj iki dilde', /Remote connected/.test(mNote[0]));
}
ok('yutulma mesajı iki dilde', /Keys are going into a text box/.test(kod));
