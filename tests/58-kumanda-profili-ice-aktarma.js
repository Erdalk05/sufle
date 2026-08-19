const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
/* v9.39: bu fonksiyonların metinleri sözlüğe taşındı; tezgâh GERÇEK sözlüğü
   yükleyip t() ve yer tutucu yardımcısını sağlıyor.
   (Yorumda ters tırnak yok: şablon dizelerinin içine giriyor.) */
const {cekirdekOku:_co4}=require('./kaynak.js');
const SOZ_T=_co4('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'')+
  "\nglobalThis.I18N=I18N; globalThis.t=(k)=>I18N[globalThis.L||'tr'][k];"+
  "\nglobalThis.srY=(m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; };";
eval(SOZ_T);
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* SÜZGEÇ ARTIK ÇEKİRDEKTE (D.3, Tur 45): aynı profil dosyası hem telefona hem
   Mac'e girebiliyor, kural iki yerde ayrı yaşarsa biri düzeltilip diğeri
   unutulur. Tezgâh gerçek çekirdeği yüklüyor — kopya değil. */
function cekirdek(){
  const fs2=require('fs'), path2=require('path');
  return require('./kaynak.js').cekirdekOku('kumanda.js','SUFLE_KUMANDA');
}

/* KUMANDA PROFİLİ: DIŞA AKTARMA VARDI, İÇE AKTARMA YOKTU
   "⬆︎ Profili dışa aktar" düğmesi vardı ve kodundaki yorum amacı açıkça
   yazıyordu: "aynı kumandayı ikinci cihazda baştan öğretmek zorunda kalma".
   Ama `sufleRemote` işareti kaynakta YALNIZCA dışa aktarma tarafında geçiyordu:
   dosya dışarı çıkıyor, geri giremiyordu. Özelliğin sözü verdiği şey hiçbir
   zaman gerçekleşmiyordu — depodaki "yarım kalmış özellik" sınıfı.

   Planın sorusu "bozuk dosyada çöküyor mu" idi; cevap "içe aktarma yok" oldu.
   Soru artık kabul ölçütü: içe aktarma eklendi ve bozuk girdiye dayanıklı.
   Bu yolun asıl riski de bu — kullanıcı yanlış dosyayı seçebilir. */

/* ---------- ÖZELLİK GERÇEKTEN BAĞLI MI ---------- */
ok('içe aktarma düğmesi sayfada var', /id="mapImport"/.test(tel));
ok('dosya seçici sayfada var', /id="mapFile"/.test(tel));
ok('düğme dosya seçiciyi açıyor', /\$\('#mapImport'\)\.onclick=\(\)=>\$\('#mapFile'\)\.click\(\)/.test(kod));
ok('dosya seçildiğinde işleyici koşuyor', /\$\('#mapFile'\)\.onchange=e=>\{/.test(kod));
ok('düğme etiketi iki dilde', (tel.match(/mapImport:'/g)||[]).length >= 2);
ok('dışa aktarma bozulmadı', /\$\('#mapExport'\)\.onclick=async\(\)=>\{/.test(kod));

/* ---------- SÜZGEÇ: yalnız tanınan eşleme geçiyor ---------- */
const suz=new Function(
  cekirdek()+'\n'+
  cikar(kod,/const GECERLI_EYLEM=KUMANDA_EYLEMLERI;/,'GECERLI_EYLEM')+'\n'+
  cikar(kod,/function eslemeSuz\(o\)\{[^\n]*\}/,'eslemeSuz')+'; return eslemeSuz;')();
ok('geçerli eşleme aynen geçiyor',
   JSON.stringify(suz({KeyA:'toggle',KeyB:'rec'})) === JSON.stringify({KeyA:'toggle',KeyB:'rec'}));
ok('tanınmayan eylem eleniyor (ölü tuş olmasın)',
   JSON.stringify(suz({KeyA:'toggle',KeyB:'buEylemYok'})) === JSON.stringify({KeyA:'toggle'}));
ok('bütün bilinen eylemler kabul ediliyor',
   Object.keys(suz({a:'toggle',b:'nextLine',c:'prevLine',d:'faster',e:'slower',f:'rec',g:'reset',h:'lock',i:'none'})).length === 9);
ok('metin olmayan değer eleniyor',
   JSON.stringify(suz({KeyA:1,KeyB:null,KeyC:{x:1},KeyD:['toggle']})) === '{}');
ok('boş anahtar eleniyor', JSON.stringify(suz({'':'toggle'})) === '{}');
/* Bozuk üst düzey girdiler çökertmemeli. */
for(const [ad,v] of [['null',null],['dizi',[1,2]],['metin','merhaba'],['sayı',42],['tanımsız',undefined]])
  ok('bozuk girdi ('+ad+') çökertmiyor ve boş dönüyor', JSON.stringify(suz(v)) === '{}');

/* ---------- İÇE AKTARMA AKIŞI ---------- */
const isleyici=cikar(kod,/\$\('#mapFile'\)\.onchange=e=>\{[\s\S]*?\n\};/,'içe aktarma');
function yukle(icerik,{okumaHatasi=false}={}){
  const iz=[];
  const f=new Function('__iz','__icerik','__hata',`
    const st={remoteMap:{ESKI:'toggle'},remoteMap2:{}};
    const save=()=>__iz.push('kaydedildi');
    const renderMap=()=>__iz.push('tabloYenilendi');
    const renderLearn=()=>{};
    const logErr=(w,e)=>__iz.push('log:'+w);
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x; const L='tr';
    let __r=null;
    class FileReader{
      constructor(){ __r=this; }
      readAsText(){ if(__hata){ this.onerror(); } else { this.result=__icerik; this.onload(); } }
    }
    const e={target:{files:[{name:'x.json'}],value:'x'}};
    const $=k=>({onchange:null,click(){}, });
    ${cekirdek()}
    ${cikar(kod,/const GECERLI_EYLEM=KUMANDA_EYLEMLERI;/,'GECERLI_EYLEM')}
    ${cikar(kod,/function eslemeSuz\(o\)\{[^\n]*\}/,'eslemeSuz')}
    let __h=null;
    ${isleyici.replace(/^\$\('#mapFile'\)\.onchange=/,'__h=')}
    __h(e);
    __iz.map=JSON.stringify(st.remoteMap);
    __iz.map2=JSON.stringify(st.remoteMap2);
  `);
  f(iz,icerik,okumaHatasi);
  return iz;
}
{
  const iz=yukle(JSON.stringify({sufleRemote:1,map:{KeyA:'toggle',KeyB:'rec'},map2:{KeyA:'reset'}}));
  ok('geçerli profil yükleniyor', iz.map === JSON.stringify({KeyA:'toggle',KeyB:'rec'}));
  ok('çift basış eşlemesi de yükleniyor', iz.map2 === JSON.stringify({KeyA:'reset'}));
  ok('kaydediliyor', iz.includes('kaydedildi'));
  ok('tablo tazeleniyor', iz.includes('tabloYenilendi'));
  ok('kaç tuş yüklendiği söyleniyor', iz.some(x=>/toast:mapIn 3 tuş/.test(x)));
}
{
  const iz=yukle('{bu json değil');
  ok('bozuk JSON çökertmiyor', iz.some(x=>/toast:mapInBad/.test(x)));
  ok('bozuk JSON mevcut profili BOZMUYOR', iz.map === JSON.stringify({ESKI:'toggle'}));
  ok('bozuk JSON günlüğe yazılıyor', iz.some(x=>/log:mapIn/.test(x)));
}
{
  const iz=yukle(JSON.stringify({baskaUygulama:1,map:{KeyA:'toggle'}}));
  ok('başka uygulamanın dosyası reddediliyor', iz.some(x=>/toast:mapInBad/.test(x)));
  ok('reddedilen dosya profili değiştirmiyor', iz.map === JSON.stringify({ESKI:'toggle'}));
}
{
  const iz=yukle(JSON.stringify({sufleRemote:1,map:{KeyA:'saçmaEylem'},map2:'metin'}));
  ok('tanınan eşleme yoksa söyleniyor', iz.some(x=>/toast:mapInEmpty/.test(x)));
  /* EN ÖNEMLİSİ: bozuk dosya yüzünden öğretilmiş eşlemeyi kaybetmek, içe
     aktarmayı hiç yapmamaktan kötü olurdu. */
  ok('tanınan eşleme yoksa mevcut profil KORUNUYOR', iz.map === JSON.stringify({ESKI:'toggle'}));
  ok('boş sonuçta kaydetme yapılmıyor', !iz.includes('kaydedildi'));
}
{
  const iz=yukle(JSON.stringify({sufleRemote:1,map:null,map2:null}));
  ok('eşleme alanları null olsa da çökmüyor', iz.some(x=>/toast:mapInEmpty/.test(x)));
}
{
  const iz=yukle('', {okumaHatasi:true});
  ok('dosya okunamazsa söyleniyor', iz.some(x=>/toast:mapInErr/.test(x)));
  ok('okuma hatasında profil korunuyor', iz.map === JSON.stringify({ESKI:'toggle'}));
}

/* ---------- DIŞA AKTARILAN DOSYA GERİ YÜKLENEBİLİYOR MU ----------
   Özelliğin bütün amacı bu; iki uç birbirini tanımalı. */
const disa=cikar(kod,/\$\('#mapExport'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/,'dışa aktarma');
ok('dışa aktarma sufleRemote işaretini yazıyor', /sufleRemote:1/.test(disa));
ok('içe aktarma aynı işareti arıyor', /!j\.sufleRemote/.test(isleyici));
ok('dışa aktarma map ve map2 yazıyor', /map:keyMap\(\),map2:keyMap2\(\)/.test(disa));
ok('içe aktarma map ve map2 okuyor', /eslemeSuz\(j\.map\), m2=eslemeSuz\(j\.map2\)/.test(isleyici));

/* ---------- MESAJLAR ---------- */
for(const k of ['mapIn','mapInBad','mapInEmpty','mapInErr'])
  ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length >= 2);
ok('boş sonuç mesajı profilin değişmediğini söylüyor', /mapInEmpty:'[^']*profil değişmedi/.test(tel));
