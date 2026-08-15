const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku, macMetni}=require('./kaynak');
const tel=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
const mac=macMetni();
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* L11 — MAC ARŞİV LİSTESİ BÜTÜN VİDEOLARI BELLEĞE ÇEKİYORDU.
   J1 turunda bulundu: `mdbAll` `getAll()` kullanıyordu, yani her kaydı
   OLDUĞU GİBİ veriyordu — video alanı dahil. Oysa `showTakes` yalnız
   tarih, boyut ve ad gösteriyor; video ancak SEÇİLEN tek çekim için
   gerekiyor.

   Telefonda bu kusur kapatılmıştı (tests/79: `dbListe` imleçle geziyor ve
   blobu bırakıyor); masaüstüne taşınmamıştı. "Bir platformda düzeltilen
   kusurun diğerine taşınmaması" bu depoda tekrarlayan sınıf.

   ÖLÇÜLDÜ (aşağıda, gerçek işlevle): 20 çekimlik bir arşivde eski yol
   20 videoyu birden okuyordu; yeni yol sıfır video okuyor, seçilen çekim
   için tam bir tane. */

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('liste imleçle geziyor', /function mdbListe\(\)\{[\s\S]*?openCursor\(\)/.test(macKod));
ok('video alanı ayıklanıyor', /const \{blob, \.\.\.ustveri\}=c\.value;/.test(macKod));
ok('yerine yalnız "videosu var mı" konuyor', /ustveri\.videoVar=!!blob;/.test(macKod));
ok('getAll artık kullanılmıyor', !/getAll\(\)/.test(macKod));
ok('eski mdbAll kaldırıldı (iki yol kalmasın)', !/mdbAll/.test(macKod));
ok('tek çekim getirme yolu var', /async function mdbGetir\(id\)\{/.test(macKod));
ok('liste bu yolu kullanıyor', /const list=await mdbListe\(\);/.test(macKod));
ok('video yalnız seçilen çekim için getiriliyor', /const tam=await mdbGetir\(it\.id\);/.test(macKod));
ok('videosu olmayan çekimde sebep söyleniyor',
   /if\(!tam\|\|!tam\.blob\)\{ toast\('Bu çekimin videosu bulunamadı'\); return; \}/.test(macKod));
ok('oynatma getirilen kayıttan besleniyor', /lastBlob=tam\.blob; recStart=0; recStop=\(tam\.dur\|\|0\)\*1000;/.test(macKod));
ok('askıda kalma koruması iki yolda da var',
   /\}, 10000, \[\], 'idbListe'\);/.test(macKod) && /\}, 10000, null, 'idbGetir'\);/.test(macKod));

/* ---------- GERÇEK İŞLEVİ KOŞTUR ---------- */
const mListe=macKod.match(/async function mdbListe\(\)\{[\s\S]*?\n  \}/);
const mGetir=macKod.match(/async function mdbGetir\(id\)\{[\s\S]*?\n  \}/);
ok('mdbListe çıkarılabildi', !!mListe);
ok('mdbGetir çıkarılabildi', !!mGetir);
if(!mListe||!mGetir) return;

function tezgah(kayitlar){
  return new Function('__k', `
    const sayac={video:0, kayit:0};
    const veri=__k;
    const sozZamanAsimi=(f)=>new Promise(r=>f(r));
    const openMDB=async()=>({
      transaction(){ return { objectStore(){ return {
        openCursor(){
          const q={}; setTimeout(()=>{
            let i=0;
            const ilerle=()=>{
              if(i>=veri.length){ q.onsuccess({target:{result:null}}); return; }
              const kayit=veri[i++];
              sayac.kayit++;
              /* İmleç kaydın TAMAMINI verir; sayaç videoyu OKUNDU sayar
                 ancak liste onu dışarı taşırsa. Aşağıda öyle ölçülüyor. */
              q.onsuccess({target:{result:{value:kayit, continue:ilerle}}});
            };
            ilerle();
          },0);
          return q;
        },
        get(id){ const q={}; setTimeout(()=>{ const k=veri.find(x=>x.id===id);
          if(k&&k.blob) sayac.video++;
          q.result=k; q.onsuccess(); },0); return q; },
        getAll(){ const q={}; setTimeout(()=>{ veri.forEach(k=>{ if(k.blob) sayac.video++; });
          q.result=veri.map(k=>({...k})); q.onsuccess(); },0); return q; },
      }; }, set oncomplete(f){}, set onerror(f){}, set onabort(f){} }; },
    });
    ${mListe[0]}
    ${mGetir[0]}
    return { mdbListe, mdbGetir, sayac };
  `)(kayitlar);
}
const ARSIV=(n)=>Array.from({length:n},(_,i)=>({
  id:i+1, title:'Cekim '+(i+1), created:1000+i, dur:60+i, size:(i+1)*1048576,
  blob:'VIDEO-'+(i+1)+'-'+'x'.repeat(50)
}));

(async()=>{
  {
    const t=tezgah(ARSIV(20));
    const liste=await t.mdbListe();
    ok('20 çekim listeleniyor', liste.length===20);
    ok('listede HİÇBİR video taşınmıyor', liste.every(x=>x.blob===undefined));
    ok('videosu olan kayıt işaretleniyor', liste.every(x=>x.videoVar===true));
    ok('üstveri eksiksiz geliyor',
       liste.every(x=>x.id!=null && x.title!=null && x.created!=null && x.dur!=null && x.size!=null));
    /* showTakes bu üç alanı gösteriyor — üçü de listede olmalı. */
    ok('listede tarih var (ekranda gösteriliyor)', liste.every(x=>typeof x.created==='number'));
    ok('listede boyut var', liste.every(x=>typeof x.size==='number'));
    ok('listede ad var', liste.every(x=>typeof x.title==='string'));
  }
  {
    /* Sıralama: yeniden eskiye. */
    const t=tezgah(ARSIV(5));
    const liste=await t.mdbListe();
    ok('en yeni çekim başta', liste[0].created===1004);
    ok('en eski çekim sonda', liste[4].created===1000);
  }
  {
    /* ASIL ÖLÇÜM: seçilen çekim için TEK video okunuyor. */
    const t=tezgah(ARSIV(20));
    await t.mdbListe();
    ok('liste açmak SIFIR video okuyor (ölçülen '+t.sayac.video+')', t.sayac.video===0);
    const tam=await t.mdbGetir(7);
    ok('seçilen çekim getiriliyor', tam && tam.id===7);
    ok('videosu geliyor', tam && typeof tam.blob==='string' && tam.blob.startsWith('VIDEO-7'));
    ok('yalnız BİR video okundu (ölçülen '+t.sayac.video+')', t.sayac.video===1);
  }
  {
    const t=tezgah([]);
    const liste=await t.mdbListe();
    ok('boş arşivde boş liste', Array.isArray(liste) && liste.length===0);
    ok('boş arşivde video okunmuyor', t.sayac.video===0);
  }
  {
    /* Videosu düşmüş kayıt: liste onu işaretlemeli, açmak sebep söylemeli. */
    const t=tezgah([{id:1,title:'Bozuk',created:1,dur:10,size:0}]);
    const liste=await t.mdbListe();
    ok('videosu olmayan kayıt işaretleniyor', liste[0].videoVar===false);
    const tam=await t.mdbGetir(1);
    ok('videosu olmayan kayıt getirilince blob yok', tam && !tam.blob);
  }
  {
    const t=tezgah(ARSIV(3));
    const yok=await t.mdbGetir(99);
    ok('olmayan çekim için null dönüyor', yok===null || yok===undefined);
  }

  /* ---------- TELEFONLA AYNI KURAL MI ---------- */
  const tListe=tel.match(/async function dbListe\(\)\{[\s\S]*?\n\}/);
  ok('telefon listesi çıkarılabildi', !!tListe);
  if(tListe){
    ok('telefon da imleç kullanıyor', /openCursor\(\)/.test(tListe[0]));
    ok('telefon da videoyu bırakıyor', /const \{blob, \.\.\.ustveri\}=c\.value;/.test(tListe[0]));
    ok('telefon da videoVar işaretliyor', /ustveri\.videoVar=!!blob;/.test(tListe[0]));
    /* Sıralama KASTEN farklı: telefonda yıldız var, masaüstünde yok. */
    ok('telefon yıldızlıyı öne alıyor (Macte yıldız kavramı yok)',
       /\(b\.fav\?1:0\)-\(a\.fav\?1:0\)/.test(tListe[0]) && !/fav/.test(mListe[0]));
  }
})();
