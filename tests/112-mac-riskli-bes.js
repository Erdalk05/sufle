const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku, macMetni, metinCekirdegi}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=macMetni();
const macHam=mac.replace(/\/\*[\s\S]*?\*\//g,'');          // koşturulacak kod
const macKod=macHam.replace(/\/\/[^\n]*/g,'');             // yalnız kaynak düzeyi desenler

/* L10 — MAC FONKSİYON KAPSAMI %47, EN RİSKLİ 5İNİ TESTLE KİLİTLE.
   ÖLÇÜLDÜ: kapsam gece boyunca yapılan Mac işleriyle **%73e** çıkmış
   (146 fonksiyonun 106sı testlerde anılıyor). Kalan 40 arasından risk
   ölçütü "kullanıcı işini KAYBEDER ya da sessizce YANLIŞ çıktı alır":

     1) cleanText   — metni yeniden yazıyor (sessiz bozulma)
     2) delScript   — senaryo siliyor (veri kaybı)
     3) discardRec  — çekimi atıyor (veri kaybı)
     4) load        — bütün durumu kuruyor (her şeyi kaybettirebilir)
     5) recSource   — neyin kaydedileceğini seçiyor (sessiz yanlış kayıt)

   BULUNAN KUSUR: `cleanText` telefonda B6da kapatılan BEŞ görünmez
   karakter sınıfını hiç ele almıyordu (yumuşak tire, satır/paragraf
   ayracı, yön denetimleri). Word ve PDFten yapıştırılan metin masaüstünde
   sessizce bozuk kalıyordu. Taşındı.

   NOT — kendi ilk teşhisim yanlıştı: `cleanText(` diye arayıp "hiç
   çağrılmıyor, ölü fonksiyon" demiştim. Oysa `applyTool(cleanText,...)`
   ile 🧹 Temizle aracına bağlı; desen `(` istediği için kaçırmıştım.
   Denetim haklıydı, ben değil. */

/* ---------- 1) cleanText: GÖRÜNMEZ KARAKTERLER ---------- */
/* Tur 46: cleanText ortak çekirdeğe taşındı ve iki kabuk da AYNI bloğu
   gömüyor; Mac kopyasının 2 boşluklu girintisi kalmadı. Bu testin asıl
   iddiası (görünmez karakterlerin temizlenmesi) aynen duruyor —
   üstelik artık telefonda da geçerli, çünkü kod tek yerden geliyor. */
const mClean=metinCekirdegi().match(/function cleanText\(t\)\{[\s\S]*?\n\}/);
ok('cleanText çıkarılabildi', !!mClean);
const mStrip=tel.replace(/\/\*[\s\S]*?\*\//g,'').match(/function stripInvisible\(x\)\{[\s\S]*?\n\}/);
ok('telefon temizleyicisi çıkarılabildi', !!mStrip);
if(mClean && mStrip){
  const temizle=new Function('t', mClean[0]+' return cleanText(t);');
  const telTemiz=new Function('x', mStrip[0]+' return stripInvisible(x);');
  ok('araç bir metin döndürüyor', typeof temizle('a')==='string');

  /* B6de ölçülen beş sınıfın hepsi. */
  ok('yumuşak tire siliniyor (Word)', temizle('mer­haba')==='merhaba');
  ok('satır ayracı SATIR SONUNA çevriliyor (silinmiyor)',
     temizle('Birinci Ikinci')==='Birinci\nIkinci');
  ok('paragraf ayracı da öyle', temizle('Birinci Ikinci')==='Birinci\nIkinci');
  ok('sıfır genişlik boşluk siliniyor', temizle('a​b')==='ab');
  ok('yön işaretleri siliniyor', temizle('a‎b‏c')==='abc');
  ok('yön gömme siliniyor', temizle('a‪b‬c')==='abc');
  ok('yön yalıtımı siliniyor', temizle('a⁦b⁩c')==='abc');
  ok('BOM siliniyor', temizle('﻿merhaba')==='merhaba');
  /* Aynı girdide telefonla aynı sonucu vermeli (ayraç/tire kuralları). */
  for(const g of ['mer­haba','Bir Iki','a​b','a‪b‬c'])
    ok('telefonla aynı sonuç: '+JSON.stringify(g), temizle(g)===telTemiz(g).trim());

  /* GÖRÜNEN METNE DOKUNULMAMALI — aracın kendi işi bozulmasın. */
  ok('Türkçe harfler korunuyor', temizle('şğüçöıİĞÜÇÖ')==='şğüçöıİĞÜÇÖ');
  ok('emoji korunuyor', temizle('Merhaba 🎉 dunya')==='Merhaba 🎉 dunya');
  ok('işaretleme korunuyor', temizle('Bu *cok* onemli {telaffuz}')==='Bu *cok* onemli {telaffuz}');
  ok('normal tire korunuyor', temizle('yarı-otomatik')==='yarı-otomatik');
  /* Aracın ESKİ işleri de duruyor. */
  ok('kırılmayan boşluk boşluğa çevriliyor', temizle('a b')==='a b');
  ok('eğik tırnaklar düzleştiriliyor', temizle('“bu” ve ‘su’')==='"bu" ve \'su\'');
  ok('fazla boşluk sadeleşiyor', temizle('a    b')==='a b');
  ok('noktalama öncesi boşluk siliniyor', temizle('merhaba , dunya !')==='merhaba, dunya!');
  ok('üç ve fazlası boş satır ikiye iniyor', temizle('a\n\n\n\n\nb')==='a\n\nb');
  ok('satır başı ve sonu kırpılıyor', temizle('  a  \n  b  ')==='a\nb');
  ok('boş girdi çökertmiyor', temizle('')==='');
}

/* ---------- 2) delScript: SENARYO SİLME ---------- */
const mDel=macHam.match(/function delScript\(id\)\{[\s\S]*?\n  \}/);
ok('delScript çıkarılabildi', !!mDel);
if(mDel){
  function sil(senaryolar, id, bekleyen){
    return new Function('__d', `
      const iz=[];
      const state={ scripts:__d.s.map(x=>({...x})), current:__d.cur, cop:__d.cop||[] };
      let silBekle=__d.bekle, silT=0;
      const clearTimeout=()=>{}; const setTimeout=()=>1;
      const toast=t=>iz.push('mesaj:'+t);
      const curScript=()=>state.scripts.find(x=>x.id===state.current)||state.scripts[0];
      const oge={'#title':{value:''},'#editor':{value:''}};
      const $=k=>oge[k]||{value:''};
      /* Zorlanma haritası SENARYOYA ait (A.4, Tur 48): senaryo silinince/
         değişince yeniden çiziliyor. Bu test silmenin VERİYE etkisini
         sınıyor, çizimi değil — taklit yeter. */
      const renderScripts=()=>{}, buildWords=()=>{}, reset=()=>{}, updateStats=()=>{}, macDiffCiz=()=>{};
      const save=()=>iz.push('kaydedildi');
      ${mDel[0]}
      delScript(__d.id);
      return {iz, state, silBekle};
    `)({s:senaryolar, id, cur:senaryolar[0].id, bekle:bekleyen, cop:[]});
  }
  const IKI=[{id:1,title:'Bir',text:'metin bir'},{id:2,title:'Iki',text:'metin iki'}];
  {
    const r=sil([{id:1,title:'Tek',text:'m'}], 1, null);
    ok('SON senaryo silinmiyor (kullanıcı boşta kalmasın)', r.state.scripts.length===1);
    ok('sebebi söyleniyor', r.iz.some(x=>/En az bir senaryo kalmalı/.test(x)));
  }
  {
    const r=sil(IKI, 2, null);
    ok('ilk basışta SİLMİYOR (iki aşamalı onay)', r.state.scripts.length===2);
    ok('ilk basışta onay isteniyor', r.iz.some(x=>/Emin misin/.test(x)));
    ok('ilk basışta silme sırada bekliyor', r.silBekle===2);
  }
  {
    const r=sil(IKI, 2, 2);
    ok('ikinci basışta siliniyor', r.state.scripts.length===1);
    ok('doğru senaryo silindi', r.state.scripts[0].id===1);
    ok('silinen ÇÖPE alınıyor (geri alınabilsin)', r.state.cop.length===1);
    ok('çöpe DERİN kopya gidiyor', r.state.cop[0].text==='metin iki');
    ok('değişiklik kaydediliyor', r.iz.includes('kaydedildi'));
    ok('onay sıfırlanıyor', r.silBekle===null);
  }
  {
    /* AÇIK senaryo silinirse başka birine geçilmeli — yoksa boş ekran. */
    const r=sil(IKI, 1, 1);
    ok('açık senaryo silinince başkasına geçiliyor', r.state.current===2);
  }
  ok('çöp en fazla 5 kayıt tutuyor (sınırsız büyümesin)', /\.slice\(-5\)/.test(mDel[0]));
}

/* ---------- 3) discardRec: ÇEKİMİ ATMA ---------- */
const mDis=macHam.match(/function discardRec\(\)\{[\s\S]*?\n  \}/);
ok('discardRec çıkarılabildi', !!mDis);
if(mDis){
  const r=new Function(`
    const iz=[];
    let lastUrl='blob:1', lastBlob={size:9};
    const v={ pause:()=>iz.push('durdu'), removeAttribute:a=>iz.push('kaynakSilindi'), load:()=>iz.push('yuklendi') };
    const kutu={ classList:{ remove:c=>iz.push('kapandi:'+c) } };
    const $=k=>k==='#rrVideo'?v:kutu;
    const URL={ revokeObjectURL:()=>iz.push('adresBirakildi') };
    ${mDis[0]}
    discardRec();
    return {iz, lastUrl, lastBlob};
  `)();
  ok('oynatma durduruluyor', r.iz.includes('durdu'));
  ok('video kaynağı sökülüyor', r.iz.includes('kaynakSilindi'));
  ok('adres bırakılıyor (bellek sızmasın)', r.iz.includes('adresBirakildi'));
  ok('adres göstergesi temizleniyor', r.lastUrl===null);
  ok('çekim göstergesi temizleniyor', r.lastBlob===null);
  ok('sonuç ekranı kapatılıyor', r.iz.some(x=>/^kapandi:/.test(x)));
}

/* ---------- 4) load: DURUMU KURMA ---------- */
const mLoad=macHam.match(/function load\(\)\{[\s\S]*?\n  \}/);
ok('load çıkarılabildi', !!mLoad);
if(mLoad){
  function yukle(ham){
    return new Function('__h', `
      const DEFAULT={ scripts:[{id:1,title:'Varsayilan',text:'metin'}], current:1,
                      eyePos:42, speed:12, speedScale:'' };
      let state=null, ilkKurulum=false;
      const LS='x';
      const localStorage={ getItem:()=>__h };
      ${mLoad[0]}
      load();
      return {state, ilkKurulum};
    `)(ham);
  }
  {
    const r=yukle(null);
    ok('kayıt yokken varsayılana düşülüyor', r.state.scripts.length===1);
    ok('ilk kurulum işaretleniyor', r.ilkKurulum===true);
  }
  {
    /* BOZUK KAYIT HER ŞEYİ KAYBETTİRMEMELİ ama uygulama da açılmalı. */
    const r=yukle('{bu json degil');
    ok('bozuk kayıtta çökmüyor', !!r.state);
    ok('bozuk kayıtta varsayılan senaryo var', r.state.scripts.length>=1);
  }
  {
    const r=yukle(JSON.stringify({scripts:[], current:5}));
    ok('senaryo listesi BOŞSA varsayılan geri geliyor (boş ekran olmasın)', r.state.scripts.length===1);
  }
  {
    const r=yukle(JSON.stringify({scripts:[{id:9,title:'Benim',text:'metnim'}], current:9,
                                  eyePos:42, speed:12, speedScale:''}));
    ok('kullanıcının senaryosu korunuyor', r.state.scripts[0].title==='Benim');
    ok('okuma çizgisi bir KEZ taşınıyor', r.state.eyePos===18 && r.state.eyeTasindi===1);
    ok('eski piksel hızı wpme çevriliyor', r.state.speed>=60 && r.state.speedScale==='wpm');
  }
  {
    /* Taşıma İKİNCİ açılışta tekrarlanmamalı — kullanıcı ayarını ezmesin. */
    const r=yukle(JSON.stringify({scripts:[{id:9,title:'B',text:'m'}], current:9,
                                  eyePos:42, eyeTasindi:1, speed:200, speedScale:'wpm'}));
    ok('taşıma bir kez yapılıyor (kullanıcı 42yi seçtiyse kalıyor)', r.state.eyePos===42);
    ok('wpm hızı ikinci kez çevrilmiyor', r.state.speed===200);
  }
  {
    const r=yukle(JSON.stringify({scripts:[{id:1,title:'A',text:'m'}], current:1,
                                  eyePos:30, speed:150, speedScale:'wpm'}));
    ok('zaten wpm olan hız değişmiyor', r.state.speed===150);
    ok('42 olmayan okuma çizgisi taşınmıyor', r.state.eyePos===30);
  }
}

/* ---------- 5) recSource: NE KAYDEDİLİYOR ---------- */
const mSrc=macHam.match(/function recSource\(\)\{[\s\S]*?\n  \}/);
ok('recSource çıkarılabildi', !!mSrc);
if(mSrc){
  function kaynak({kirp=false, kirpKurulur=true, gomulu=false, izVar=true}={}){
    return new Function('__d', `
      const iz=[];
      const stream={ ad:'ham', getAudioTracks:()=>[{ad:'kameraSes'}] };
      const cropOn=()=>__d.kirp, burnOn=()=>__d.gomulu;
      const startCrop=()=>{ iz.push('kirpmaKuruldu'); return __d.kirpKurulur; };
      const yapTuval=ad=>({ ad, captureStream:()=>({ getVideoTracks:()=>__d.izVar?[{ad:ad+'Video'}]:[] }) });
      const cropCv=yapTuval('kirp'), capOut=yapTuval('altyazili');
      let capLocked=false, fxTrack=null, cropStream=null;
      const makeFxTrack=()=>null;
      class MediaStream{ constructor(izler){ this.izler=izler; this.ad='kompozit'; } }
      ${mSrc[0]}
      const r=recSource();
      return { ad:r.ad, izler:(r.izler||[]).map(x=>x.ad), capLocked, iz };
    `)({kirp,kirpKurulur,gomulu,izVar});
  }
  {
    const r=kaynak({kirp:false});
    ok('kırpma kapalıyken HAM akış kaydediliyor', r.ad==='ham');
    ok('kırpma kapalıyken tuval hiç kurulmuyor', !r.iz.includes('kirpmaKuruldu'));
  }
  {
    const r=kaynak({kirp:true, kirpKurulur:false});
    ok('kırpma kurulamazsa sessizce ham akışa dönülüyor', r.ad==='ham');
  }
  {
    const r=kaynak({kirp:true});
    ok('kırpma açıkken tuvalden kaydediliyor', r.ad==='kompozit');
    ok('görüntü kırpma tuvalinden geliyor', r.izler.includes('kirpVideo'));
    ok('ses kameradan geliyor', r.izler.includes('kameraSes'));
    ok('altyazı gömülü değilken çıktı tuvali kilitlenmiyor', r.capLocked===false);
  }
  {
    const r=kaynak({kirp:true, gomulu:true});
    ok('altyazı gömülüyken ÇIKTI tuvalinden kaydediliyor', r.izler.includes('altyaziliVideo'));
    ok('o tuval kayıt boyunca besleniyor (kilit)', r.capLocked===true);
  }
  {
    /* Tuval iz üretemezse ham akışa dönülmeli — boş video kaydetme. */
    const r=kaynak({kirp:true, izVar:false});
    ok('tuval görüntü izi vermezse ham akışa dönülüyor', r.ad==='ham');
  }
}

/* ---------- ARAÇLAR TEK KAYNAKTAN GELİYOR MU (A.3, Tur 46) ----------
   `cleanText` iki kabukta FARKLI iş yapıyordu: Mac görünmez karakterleri
   temizliyordu, telefon temizlemiyordu. Aynı "🧹 Temizle" düğmesi platforma
   göre başka sonuç veriyor ve ASIL ÜRÜN olan telefon eksik taraftı. Kod tek
   yere alındı; biri çekirdekten koparsa metinler yine ayrışır. */
{
  const telHam = oku(telefonYolu());
  ok('telefon metin çekirdeğini gömüyor', /==CEKIRDEK:metin\.js==/.test(telHam));
  /* HAM kaynağa bak: `macHam` blok yorumlarını atıyor ve çekirdek
     işaretleyicisi bir yorum — atılmış metinde aramak hep boş döner. */
  ok('Mac de aynı çekirdeği gömüyor', /==CEKIRDEK:metin\.js==/.test(oku(macYolu())));
  /* Kabuklarda YEREL kopya kalmamalı: kalsaydı hangisinin çalıştığı belirsiz olurdu. */
  for (const [ad, k] of [['telefon', telHam], ['Mac', macHam]]) {
    const kacTane = (k.match(/function cleanText\(t\)\{/g) || []).length;
    ok(ad + ': cleanText tam olarak bir kez tanımlı — ' + kacTane, kacTane === 1);
  }
}
