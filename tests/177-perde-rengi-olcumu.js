const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,macMetni,cekirdekOku}=require('./kaynak');

/* PERDE RENGİNİ KAMERADAN ÖLÇME — İKİ SORU

   1) MASAÜSTÜNDE HİÇ YOKTU. Yeşil ekran orada ÇALIŞIYOR (cropCv + WebGL)
      ama anahtar rengi üç hazır seçenekten seçiliyordu. Kullanıcının gerçek
      perdesi o üçünden biri değilse silme kenarları kirli kalıyor ve sebebi
      hiçbir yerde yazmıyor — "ölçemediğin şeyi ayarlayamazsın" sınıfı.

   2) TELEFONDA VARDI AMA SESSİZCE YANLIŞ SONUÇ ÜRETEBİLİYORDU. Eski hâli
      ne ölçerse onu anahtar yapıyordu: kamera perdeye dönük değilse ya da
      örnek köşesine duvar/omuz giriyorsa ortalama, perdenin rengi DEĞİL
      karışık bir renk çıkıyor. Yeşil ekran bundan sonra hiç tutmuyor ve
      kullanıcı özelliği bozuk sanıyor (deponun 6 numaralı sınıfının
      kardeşi). Artık örneğin TEK RENK olup olmadığı ölçülüyor.

   Eşiğin ayırt ettiği aşağıda sentetik karelerle kanıtlanıyor: kırışık
   perde GEÇMELİ, iki farklı yüzey GEÇMEMELİ. Ayırt etmeyen bir eşik
   değersiz olurdu — ya her şeyi reddederdi ya hiçbir şeyi. */

const tel=oku(telefonYolu());
const mac=oku(macYolu());
const cek=cekirdekOku('kroma.js','SUFLE_KROMA');

/* ---------- HESAP: EŞİK AYIRT EDİYOR MU ---------- */
const calis=new Function('d', cek.replace(/\/\*[\s\S]*?\*\//g,'') +
  '\nconst o=kromaOrnekle(d); return {o, tek:kromaTekRenkMi(o)};');

/* `boya(x,y)->[r,g,b]` ile 32×32 sentetik kare. */
function kare(boya){
  const N=32, d=new Uint8ClampedArray(N*N*4);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const [r,g,b]=boya(x,y), i=(y*N+x)*4;
    d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=255;
  }
  return d;
}
const YESIL=[0,177,64];

{
  const r=calis(kare(()=>YESIL));
  ok('düz yeşil perde: sapma sıfır', r.o.sapma<0.001);
  ok('düz yeşil perde kabul ediliyor', r.tek===true);
  ok('ölçülen renk gerçekten perdenin rengi', r.o.hex==='#00b140');
}
{
  /* GERÇEK PERDE HİÇ DÜZ DEĞİLDİR: kırışık ve eşit aydınlatılmamış bir
     yüzeyde kanal değerleri birkaç ton oynar. Eşik bunu geçirmezse özellik
     pratikte hiç çalışmaz — asıl risk budur, çok sıkı eşik. */
  const r=calis(kare((x,y)=>YESIL.map(v=>Math.max(0,Math.min(255,v+((x*5+y*3)%19)-9)))));
  ok('kırışık/gölgeli gerçek perde kabul ediliyor (sapma '+r.o.sapma.toFixed(1)+')', r.tek===true);
  ok('kırışık perdede ölçülen renk yine yeşil ailesinde',
     r.o.g>r.o.r+40 && r.o.g>r.o.b+40);
}
{
  /* Örneğin yarısı perde, yarısı duvar: iki farklı yüzey. */
  const r=calis(kare(x=> x<16 ? YESIL : [200,195,185]));
  ok('perde + duvar karışımı REDDEDİLİYOR (sapma '+r.o.sapma.toFixed(1)+')', r.tek===false);
}
{
  /* Omuz/yüz karesi: perde hiç yok. */
  const r=calis(kare((x,y)=> (x+y)%2 ? [210,170,150] : [40,35,30]));
  ok('perde olmayan kare REDDEDİLİYOR', r.tek===false);
}
{
  /* AYIRT ETME KANITI: eşik iki tarafı da ayırmıyorsa test değersizdir.
     Aynı tezgâhta biri geçen biri geçmeyen kare olduğu yukarıda gösterildi;
     burada eşiğin KENDİSİ ölçülüyor ki sessizce büyütülmesin. */
  const m=cek.match(/KROMA_SAPMA_ESIK\s*=\s*(\d+)/);
  ok('sapma eşiği kaynakta sabit', !!m);
  ok('sapma eşiği makul aralıkta (kırışık perdeyi geçirir, iki yüzeyi geçirmez)',
     !!m && +m[1]>=10 && +m[1]<=30);
}

/* ---------- İKİ KABUK DA ÇEKİRDEĞİ KULLANIYOR ---------- */
for(const [ad,src] of [['telefon',tel],['masaüstü',mac]]){
  ok(ad+' kroma çekirdeğini gömüyor', src.includes('==CEKIRDEK:kroma.js=='));
  ok(ad+' ölçümü çekirdekten çağırıyor', /kromaOrnekle\(/.test(src));
  /* ASIL İDDİA: örnek tek renk değilse ANAHTAR YAZILMIYOR. Bunu yalnız
     "fonksiyon çağrılıyor" diye ölçmek yetmez — çağrılıp sonucu atılabilir. */
  ok(ad+' örnek tek renk değilse anahtarı YAZMIYOR',
     /if\(!kromaTekRenkMi\(o\)\)\{ toast\(m\('keyPickBad'\)\); return; \}/.test(src));
}
ok('masaüstünde ölçme düğmesi var', /id=["']pickKey["']/.test(mac));
/* Kabuk kendi ızgarasını uydurmasın: ölçü çekirdekte tanımlı. */
for(const [ad,src] of [['telefon',tel],['masaüstü',mac]])
  ok(ad+' örnek ızgarasını çekirdekten alıyor',
     /c\.width=KROMA_IZGARA; c\.height=KROMA_IZGARA;/.test(src));

/* ---------- KULLANICI NE OKUYOR ---------- */
{
  /* Mesaj SEBEBİ söylemeli. "Renk ölçülemedi" demek, kullanıcıyı aynı
     yanlış kadrajla tekrar denemeye gönderirdi — bu deponun jargon/
     görünmezlik dersinin ikizi. */
  const macT=macMetni();
  ok('masaüstü mesajı sebebi söylüyor (tek renk değil)',
     /tek renk değil/.test(macT));
  ok('masaüstü mesajı ne yapılacağını söylüyor (kadraj)',
     /kadrajı düzelt/.test(macT));
  const sozluk=cekirdekOku('mesajlar.js','SUFLE_MESAJ');
  ok('telefon mesajı sebebi söylüyor', /tek renk değil/.test(sozluk));
  ok('telefon mesajı ne yapılacağını söylüyor', /kadrajı düzelt/.test(sozluk));
  /* İKİ SÖZLÜK DE İKİ DİLLİ OLMALI. İngilizce karşılığı unutulursa arayüz
     İngilizceyken kullanıcı Türkçe bir cümle okur; bu depoda ölçülmüş bir
     kusur (Mac'in mesajları aylarca yalnız Türkçeydi). */
  const macKaynak=cekirdekOku('mac-mesajlar.js','SUFLE_MACMESAJ');
  ok('telefon mesajının İngilizcesi var', /not a single colour/.test(sozluk));
  ok('masaüstü mesajının İngilizcesi var', /not a single colour/.test(macKaynak));
}
