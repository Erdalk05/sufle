const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* DEPO DOLUNCA ARŞİVLENEMEYEN ÇEKİM — ÇIKIŞ YOLU YOKTU
   Yıldızsız çekimleri toplu silen özellik VARDI, ama yalnız arşiv ekranında.
   Yani şunu varsayıyordu: kullanıcı geçici bildirimi okudu, böyle bir düğmenin
   varlığını biliyor, sonuç ekranını KAPATMADAN arşive gidip buldu. Oysa
   yazılamayan çekim o sırada yalnızca bellekte — ekranı kapatınca gidiyor.
   Öneri, kaybın yaşandığı yerde durmalı.

   Silme kendiliğinden YAPILMIYOR: geri alınamaz, karar kullanıcının. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* ---------- KUTU YALNIZ GEREKTİĞİNDE GÖRÜNÜYOR ---------- */
const kutu = cikar(kod, /function arsivKutusu\(\)\{[\s\S]*?\n\}/, 'arsivKutusu');
function kutuKos(hata){
  const g={};
  new Function('__g','__h', `
    const arsivHatasi=__h;
    let arsivSilArm=9;
    const el={ '#archBox':{style:{display:'BASLANGIC'}},
               '#archWarn':{textContent:''},
               '#archWipe':{textContent:'',disabled:true} };
    const $=k=>el[k];
    const m=k=>k;
    ${kutu}
    arsivKutusu();
    __g.gorunur = el['#archBox'].style.display;
    __g.uyari   = el['#archWarn'].textContent;
    __g.dugme   = el['#archWipe'].textContent;
    __g.kapali  = el['#archWipe'].disabled;
    __g.arm     = arsivSilArm;
  `)(g,hata);
  return g;
}
{
  const g=kutuKos(true);
  ok('arşivlenemeyince kutu görünüyor', g.gorunur === '');
  ok('ne olduğu yazıyor', g.uyari === 'archWarnTxt');
  ok('çıkış yolu düğmesi adlandırılmış', g.dugme === 'archWipeBtn');
  ok('düğme tıklanabilir', g.kapali === false);
  ok('onay durumu sıfırlanıyor (önceki çekimden kalan onay taşınmıyor)', g.arm === 0);
}
{
  const g=kutuKos(false);
  ok('arşivleme başarılıysa kutu GİZLİ (her çekimde duran uyarı görünmez olur)',
     g.gorunur === 'none');
  ok('başarılıyken metin de yazılmıyor', g.uyari === '');
}

/* ---------- KURTARMA AKIŞI ---------- */
const handler = cikar(kod, /\$\('#archWipe'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/, 'archWipe onclick');
function tikla({kayitlar, yazmaSonuclari, tiklama=1}){
  const iz=[];
  const f=new Function('__iz','__k','__y', `
    let arsivSilArm=0, arsivSilT=null;
    const clearTimeout=()=>{};
    const setTimeout=()=>1;
    const el={ '#archWipe':{textContent:'',disabled:false} };
    const $=k=>el[k];
    const m=k=>k;
    const toast=k=>__iz.push('toast:'+k);
    const dbAll=async()=>__k;
    const dbDel=async(id)=>{ __iz.push('sil:'+id); return true; };
    const arsivKutusu=()=>__iz.push('kutuYenilendi');
    const renderTakes=()=>__iz.push('arsivYenilendi');
    let __n=0;
    const autoSaveTake=async()=>{ __iz.push('TEKRAR YAZILDI'); return __y[__n++]; };
    ${handler}
    __iz.el = el['#archWipe'];
    return $('#archWipe').onclick;
  `);
  const onclick=f(iz,kayitlar,yazmaSonuclari);
  let p=Promise.resolve();
  for(let i=0;i<tiklama;i++) p=p.then(()=>onclick());
  return p.then(()=>iz);
}

const KAYITLAR=[{id:'a',fav:false},{id:'b',fav:true},{id:'c',fav:false}];

(async () => {
{
  const iz = await tikla({kayitlar:KAYITLAR, yazmaSonuclari:[true], tiklama:1});
  ok('ilk dokunuşta HİÇBİR ŞEY silinmiyor (onay isteniyor)', !iz.some(x=>/^sil:/.test(x)));
  ok('ilk dokunuşta çekim de tekrar yazılmıyor', !iz.includes('TEKRAR YAZILDI'));
  ok('onay metni kaç çekim gideceğini söylüyor', /archWipeSure \(2\)/.test(iz.el.textContent));
}
{
  const iz = await tikla({kayitlar:KAYITLAR, yazmaSonuclari:[true], tiklama:2});
  ok('onaydan sonra siliniyor', iz.includes('sil:a') && iz.includes('sil:c'));
  ok('YILDIZLI çekime dokunulmuyor', !iz.includes('sil:b'));
  ok('kaç tanesinin silindiği söyleniyor', iz.some(x=>/toast:2 wiped/.test(x)));
  ok('yer açılınca AYNI çekim tekrar yazılıyor', iz.includes('TEKRAR YAZILDI'));
  ok('silme, tekrar yazmadan ÖNCE (yer açılmadan yazmanın anlamı yok)',
     iz.indexOf('sil:a') < iz.indexOf('TEKRAR YAZILDI'));
  ok('başarınca haber veriliyor', iz.some(x=>/toast:archRetryOk/.test(x)));
  ok('başarınca kutu kapanıyor', iz.includes('kutuYenilendi'));
  ok('başarınca arşiv listesi tazeleniyor', iz.includes('arsivYenilendi'));
}
{
  /* Yer açmak yetmediyse yalan söyleme: kutu AÇIK kalmalı ve düğme yeniden
     tıklanabilir olmalı, yoksa kullanıcı ikinci kez deneyemez. */
  const iz = await tikla({kayitlar:KAYITLAR, yazmaSonuclari:[false], tiklama:2});
  ok('yer açmak yetmediyse "yazıldı" DENMİYOR', !iz.some(x=>/archRetryOk/.test(x)));
  ok('yetmediyse videoyu paylaşması söyleniyor', iz.some(x=>/toast:archRetryFail/.test(x)));
  ok('yetmediyse düğme yeniden tıklanabilir', iz.el.disabled === false);
  ok('yetmediyse düğme adı geri geliyor', iz.el.textContent === 'archWipeBtn');
}
{
  /* Silinecek bir şey yoksa boşuna silme tiyatrosu yapma. */
  const iz = await tikla({kayitlar:[{id:'b',fav:true}], yazmaSonuclari:[true], tiklama:2});
  ok('silinecek yıldızsız çekim yoksa hiçbir şey silinmiyor', !iz.some(x=>/^sil:/.test(x)));
  ok('silinecek yoksa doğrudan "videoyu paylaş" deniyor', iz.some(x=>/toast:archNoWipe/.test(x)));
  ok('silinecek yoksa boşuna tekrar yazılmıyor', !iz.includes('TEKRAR YAZILDI'));
}

/* ---------- BAYRAK İKİ YOLDAN DA KURULUYOR MU ----------
   Yazma false dönerse VE zincir hata fırlatırsa. İkisi ayrı yol; birinde
   bayrak kurulmazsa kutu hiç açılmaz ve düzeltme ölü olur. */
const ast = cikar(kod, /async function autoSaveTake\(\)\{[\s\S]*?\n\}/, 'autoSaveTake');
ok('yazma başarısızsa bayrak kuruluyor', /arsivHatasi=!ok;/.test(ast));
ok('yazma sonucu çağırana DÖNÜYOR (tekrar deneme sonucu bilinsin)', /\n  return ok;\n/.test(ast));
ok('zincir hata fırlatırsa da bayrak kuruluyor',
   /\.catch\(e=>\{ logErr\('autoSave',e\); curTakeId=null; arsivHatasi=true;/.test(kod));
ok('sonuç ekranı kutuyu çiziyor', /arsivKutusu\(\);/.test(cikar(kod, /function showResult\(blob\)\{[\s\S]*?\n\}/, 'showResult')));

/* ---------- KUTU GERÇEKTEN SAYFADA VAR MI ----------
   Elemanlar yoksa handler sessizce hiçbir şey yapmaz — "yazıldı ama ölü"
   sınıfının tam örneği olurdu. */
for(const id of ['archBox','archWarn','archWipe'])
  ok('#'+id+' sayfada tanımlı', new RegExp('id="'+id+'"').test(tel));
ok('kutu varsayılan olarak GİZLİ', /id="archBox" style="display:none"/.test(tel));

/* ---------- MESAJLAR ---------- */
for(const k of ['archWarnTxt','archWipeBtn','archWipeSure','archRetryOk','archRetryFail','archNoWipe'])
  ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length >= 2);
ok('uyarı, videonun yalnız burada olduğunu söylüyor', /archWarnTxt:'[^']*yalnızca burada/.test(tel));
ok('onay geri alınamaz olduğunu söylüyor', /archWipeSure:'[^']*Geri alınamaz/.test(tel));

/* ---------- ARŞİV EKRANINDAKİ TOPLU SİLME BOZULMADI ---------- */
ok('arşiv ekranındaki toplu silme hâlâ yıldızlıları koruyor',
   /const all=await dbAll\(\), kill=all\.filter\(x=>!x\.fav\);/.test(
     cikar(kod, /\$\('#takesWipe'\)\.onclick=async\(\)=>\{[\s\S]*?\n\};/, 'takesWipe')));
})();
