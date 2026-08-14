const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* J8 — dbDel ZAMAN AŞIMI KORUMASI EKSİKTİ.
   `openDB`, `dbPut`, `dbListe` ve `dbGetir` `sozZamanAsimi` ile korunuyordu;
   `dbDel` KORUNMUYORDU ve `onabort` da bağlı değildi. IndexedDB işlemi kota
   baskısında ya da sürüm değişiminde iptal edilir; o durumda söz HİÇ çözülmez
   ve `await dbDel(...)` sonsuza kadar bekler.

   Önemi toplu silmede ortaya çıkıyor: silme bir DÖNGÜDE çağrılıyor
   (`for(const it of kill) await dbDel(it.id)`), üstelik arşiv yolunda düğme
   o sırada devre dışı bırakılmış oluyor — yani kullanıcının çıkışı da yok.
   Ekran sonsuza kadar öylece kalıyordu.

   İKİNCİ KATMAN: zaman aşımı tek çağrıyı kurtarır ama DÖNGÜYÜ kurtarmaz.
   50 kayıt x 10 sn = 8 dakikalık donmuş arayüz. Üst üste üç başarısızlık
   deponun gerçekten cevap vermediği anlamına gelir; döngü orada duruyor ve
   kullanıcıya kaç tanesinin silindiği söyleniyor. */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sDel=parca(/async function dbDel\(id\)\{[\s\S]*?\n\}/,'dbDel');
const sSoz=parca(/function sozZamanAsimi\(kur, ms, dusus, nerede\)\{[\s\S]*?\n\}/,'sozZamanAsimi');
const sWipe=parca(/\$\('#takesWipe'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/,'toplu silme');
if(!sDel || !sSoz || !sWipe) return;

/* ---------- BÜTÜN DEPO İŞLEVLERİ KORUNUYOR MU ---------- */
for(const ad of ['openDB','dbPut','dbListe','dbGetir','dbDel']){
  const m=kod.match(new RegExp('(?:async )?function '+ad+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
  ok(ad+' çıkarılabildi', !!m);
  if(m){
    ok(ad+' zaman aşımıyla korunuyor', /sozZamanAsimi\(/.test(m[0]));
    /* Süre de MAKUL olmalı: koruma duruyor ama 999999999 yazılırsa etkisiz. */
    const ms=+((m[0].match(/\}\s*,\s*(\d+)\s*,/)||[])[1]);
    ok(ad+' zaman aşımı makul ('+ms+' ms)', ms>=1000 && ms<=30000);
  }
}
ok('silme iptal olayına da bağlı (kota/sürüm değişimi)', /tx\.onabort=\(\)=>\{ logErr\('dbDel'/.test(sDel));
ok('silme hata olayına bağlı', /tx\.onerror=\(\)=>\{ logErr\('dbDel'/.test(sDel));
ok('silme başarıda true dönüyor', /tx\.oncomplete=\(\)=>bitir\(true\)/.test(sDel));
ok('zaman aşımında false düşüyor (silinmedi sayılıyor)', /, 10000, false, 'dbDel'\)/.test(sDel));

/* ---------- ASKIDA KALMA GERÇEKTEN ÇÖZÜLÜYOR MU ---------- */
function delKos({olay}){
  return new Function('__olay', `
    let gunluk=[];
    const logErr=(a,b)=>gunluk.push(a+':'+b);
    let zamanlayici=null;
    const setTimeout=(f)=>{ zamanlayici=f; return 1; };
    const clearTimeout=()=>{ zamanlayici=null; };
    ${sSoz}
    const tx={};
    const db={ transaction:()=>{ const t={ objectStore:()=>({ delete:()=>{} }),
      set oncomplete(f){ tx.tam=f; }, set onerror(f){ tx.hata=f; }, set onabort(f){ tx.iptal=f; } };
      return t; } };
    const openDB=async()=>db;
    ${sDel}
    const soz=dbDel(1);
    /* dbDel async: openDB beklemesi askiya aliyor, yani islem HENUZ kurulmadi.
       Olayi hemen tetiklersem tx.tam tanimsiz olur — ilk denememde oyle oldu.
       Bir mikro-gorev bekleyip oyle atesle. */
    return Promise.resolve().then(()=>{
      // olay: 'tam' | 'hata' | 'iptal' | 'hic' (askida kal)
      if(__olay==='tam') tx.tam();
      else if(__olay==='hata') tx.hata();
      else if(__olay==='iptal') tx.iptal();
      else if(zamanlayici) zamanlayici();     // zaman asimi atesledi
      return soz;
    }).then(v=>({sonuc:v, gunluk}));
  `)(olay);
}
{
  return Promise.all([
    delKos({olay:'tam'}), delKos({olay:'hata'}),
    delKos({olay:'iptal'}), delKos({olay:'hic'}),
  ]).then(([tam,hata,iptal,hic])=>{
    ok('normal silme true dönüyor', tam.sonuc===true);
    ok('hata durumunda false dönüyor', hata.sonuc===false);
    ok('hata günlüğe yazılıyor', hata.gunluk.some(x=>/^dbDel:/.test(x)));
    ok('İPTAL durumunda da çözülüyor (eskiden hiç çözülmezdi)', iptal.sonuc===false);
    ok('iptal günlüğe yazılıyor', iptal.gunluk.some(x=>/^dbDel:/.test(x)));
    ok('ASKIDA KALINCA zaman aşımı çözüyor (eskiden sonsuza kadar beklerdi)', hic.sonuc===false);
    ok('zaman aşımı günlüğe yazılıyor', hic.gunluk.some(x=>/zaman asimi/.test(x)));
    return dongu();
  });
}

/* ---------- DÖNGÜ: ÜST ÜSTE BAŞARISIZLIKTA DURUYOR MU ---------- */
function dongu(){
  function kos(basarili){
    const iz=[];
    return new Function('__iz','__b', `
      let wipeArm=1, wipeT=null;     // onay zaten kurulu: ikinci dokunus
      const el={ '#takesWipe':{ textContent:'' } };
      const $=k=>el[k]||null;
      const m=k=>k, t=k=>k;
      const toast=x=>__iz.push('toast:'+x);
      const renderTakes=()=>{};
      const clearTimeout=()=>{}, setTimeout=()=>1;
      const dbListe=async()=>Array.from({length:50},(_,i)=>({id:i+1,fav:false}));
      const dbDel=async(id)=>{ __iz.push('dene:'+id); return __b(id); };
      ${sWipe}
      return el['#takesWipe'].onclick().then(()=>__iz);
    `)(iz, basarili);
  }
  return kos(()=>false).then(iz=>{
    const deneme=iz.filter(x=>x.startsWith('dene:')).length;
    ok('depo hiç cevap vermezse döngü ERKEN duruyor ('+deneme+' deneme, 50 değil)', deneme<=3);
    ok('kullanıcıya deponun cevap vermediği söyleniyor', iz.some(x=>/wipeStuck/.test(x)));
    ok('kaç tanesinin silindiği de söyleniyor', iz.some(x=>/wipeStuck: ?0/.test(x)));
    return kos(()=>true);
  }).then(iz=>{
    const deneme=iz.filter(x=>x.startsWith('dene:')).length;
    ok('her şey yolundaysa hepsi siliniyor', deneme===50);
    ok('normal sonuç bildiriliyor', iz.some(x=>/toast:50 wiped/.test(x)));
    ok('gereksiz uyarı verilmiyor', !iz.some(x=>/wipeStuck/.test(x)));
    /* Arada tek tük hata döngüyü kesmemeli: geçici bir hata yüzünden
       kullanıcının silme isteği yarım kalmamalı. */
    let n=0;
    return kos(()=>{ n++; return n%4!==0; });
  }).then(iz=>{
    const deneme=iz.filter(x=>x.startsWith('dene:')).length;
    ok('arada tek tük hata döngüyü KESMİYOR ('+deneme+' deneme)', deneme===50);
    ok('araya karışan hatalarda uyarı verilmiyor', !iz.some(x=>/wipeStuck/.test(x)));
    son();
  });
}

function son(){
  /* ---------- KAYNAK DÜZEYİ ---------- */
  ok('iki toplu silme yolu da art arda hatada duruyor',
     (kod.match(/else if\(\+\+ust2?>=3\)\{ break; \}/g)||[]).length===2);
  ok('mesaj iki dilde', (tel.match(/wipeStuck:'/g)||[]).length===2);
  /* Denetim `kelime: '` biçimini sahte MSG anahtarı sayıyor (vlSette yaşandı). */
  ok('mesaj sahte anahtar üretmiyor', !/wipeStuck:'[^']*:\s*'/.test(tel));
  ok('iki nokta birleştirmede', /m\('wipeStuck'\)\+': '/.test(kod));
}
