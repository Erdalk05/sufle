const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* D9 — KOMUT SÖZLÜĞÜNÜN KULLANICI DÜZENLEDİĞİ YERİ: KENDİ TETİK KELİMEN.
   Çökme aranıyordu; çökme YOK ama İKİ SESSİZ ÖLÜM çıktı.

   norm() harf ve rakam dışındaki HER ŞEYİ siliyor — boşluk dahil. Eşleştirme
   ise tek belirteçle yapılıyor (toks[i]===userWake) ve tanıyıcı kelimeleri
   ayrı belirteçler hâlinde veriyor. ÖLÇÜLEN normalleştirme:
       "hey sufle" -> "heysufle"      · "sufle  bas" -> "suflebas"
       "!!!" -> ""    "..." -> ""      emoji -> ""
   Sonuç:
     1) Çok kelimeli tetik HİÇBİR ZAMAN eşleşemez — hiçbir belirteç boşluksuz
        birleşime eşit olamaz.
     2) Yalnız noktalama/emoji içeren tetik boş dizeye iniyor ve `userWake &&`
        koruması yüzünden hiç denenmiyor.
   İkisinde de alan DOLU görünüyor: kullanıcı tetiğini kurduğunu sanıyor,
   hiçbir yerde uyarı yok. "Ön koşulu olan ayar = ölü ayar" sınıfının bir başka
   yüzü — burada ön koşulu kullanıcının kendisi bozuyor ve kimse söylemiyor.

   BU TURUN KAPSAMI: sessiz ölümü SESLİ hâle getirmek. Çok kelimeli tetiği
   desteklemek ayrı bir iş — eşleştirme kayıt sırasında koşan sıcak yol,
   oraya pencere araması eklemek burada yapılmadı ve plana yazıldı. */

const mNorm=kod.match(/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/);
ok('norm çıkarılabildi', !!mNorm);
const mUyar=kod.match(/function wakeUyar\(\)\{[\s\S]*?\n\}/);
ok('wakeUyar çıkarılabildi', !!mUyar);
const mTake=kod.match(/function takeCommands\(toks\)\{[\s\S]*?\n\}/);
ok('takeCommands çıkarılabildi', !!mTake);
if(!mNorm || !mUyar || !mTake) return;

/* ---------- ÖLÇÜM: NORMALLEŞTİRME BOŞLUĞU SİLİYOR ---------- */
const norm=new Function('L','FOLD',mNorm[0]+'; return norm;')('tr',
  {'ı':'i','ş':'s','ç':'c','ğ':'g','ö':'o','ü':'u','İ':'i'});
ok('boşluklu tetik tek parçaya iniyor (eşleşmesi imkânsız)', norm('hey sufle')==='heysufle');
ok('çift boşluk da aynı', norm('sufle  bas')==='suflebas');
ok('yalnız noktalama boş dizeye iniyor', norm('!!!')==='');
ok('yalnız emoji boş dizeye iniyor', norm('🎬')==='');
ok('tek kelime tetik sağlam kalıyor', norm('hazir')==='hazir');
ok('Türkçe büyük harf katlanıyor', norm('Hazır')==='hazir');

/* ---------- KANIT: ÇOK KELİMELİ TETİK GERÇEKTEN EŞLEŞMİYOR ----------
   Gerçek takeCommands koşturuluyor. Bu bir KUSUR KAYDI değil, sınırın
   kanıtı: uyarı bu yüzden veriliyor. */
function komutKos(userWakeHam, konusulan){
  const iz=[];
  return new Function('__iz','__w','__k', `
    const userWake=__w;
    const WAKE={sufle:1};
    const VCMD={basla:'play', dur:'pause'};
    const TAIL={};
    const runVoiceCmd=c=>__iz.push('KOMUT:'+c);
    ${mTake[0]}
    __iz.kalan=takeCommands(__k);
    return __iz;
  `)(iz, userWakeHam, konusulan);
}
{
  const r=komutKos(norm('hey sufle'), ['hey','sufle','basla']);
  /* "sufle" yerleşik tetik olduğu için komut yine de çalışır — ama bu
     kullanıcının kendi tetiği sayesinde DEĞİL. Kendi tetiğinin katkısı sıfır. */
  const r2=komutKos(norm('hey kamera'), ['hey','kamera','basla']);
  ok('çok kelimeli kendi tetiği hiçbir komut çalıştırmıyor',
     !r2.some(x=>/^KOMUT:/.test(x)));
  ok('çok kelimeli tetikte kelimeler metne geri düşüyor',
     JSON.stringify(r2.kalan)===JSON.stringify(['hey','kamera','basla']));
  ok('yerleşik tetik hâlâ çalışıyor (karşılaştırma)', r.some(x=>x==='KOMUT:play'));
}
{
  const r=komutKos(norm('hazir'), ['hazir','dur']);
  ok('tek kelimelik kendi tetiği komutu çalıştırıyor', r.some(x=>x==='KOMUT:pause'));
  ok('komut kelimeleri metinden çıkarılıyor', r.kalan.length===0);
}
{
  const r=komutKos(norm('!!!'), ['','dur']);
  ok('boş normalleşen tetik komut çalıştırmıyor', !r.some(x=>/^KOMUT:/.test(x)));
}

/* ---------- UYARI GERÇEKTEN ÇIKIYOR MU ---------- */
function uyarKos(ham){
  return new Function('__ham','__norm', `
    const st={wakeWord:__ham};
    const userWake=__norm(__ham);
    const el={textContent:'', style:{display:'none'}};
    const $=s=>(s==='#wakeWarn'?el:null);
    const m=k=>k;
    ${mUyar[0]}
    wakeUyar();
    return {metin:el.textContent, gorunur:el.style.display};
  `)(ham, norm);
}
{
  const r=uyarKos('hey sufle');
  ok('boşluklu tetikte uyarı veriliyor', r.metin==='wakeMulti');
  ok('boşluklu tetikte uyarı görünür', r.gorunur==='block');
}
{
  const r=uyarKos('!!!');
  ok('normalleşince boşalan tetikte uyarı veriliyor', r.metin==='wakeBad');
  ok('boşalan tetikte uyarı görünür', r.gorunur==='block');
}
{
  const r=uyarKos('hazir');
  ok('geçerli tetikte uyarı YOK', r.metin==='');
  ok('geçerli tetikte alan gizli', r.gorunur==='none');
}
{
  /* Alan boşken uyarı vermek yanlış olur: tetik kelimesi ZORUNLU değil,
     yerleşik "sufle" zaten çalışıyor. */
  const r=uyarKos('');
  ok('alan boşken uyarı verilmiyor', r.metin==='' && r.gorunur==='none');
  const r2=uyarKos('   ');
  ok('yalnız boşluk girilince de uyarı verilmiyor', r2.metin==='');
}

/* ---------- BAĞLANTILAR ---------- */
ok('yazarken uyarı tazeleniyor', /userWake=norm\(st\.wakeWord\); save\(\); wakeUyar\(\);/.test(kod));
ok('açılışta da uyarı tazeleniyor (kayıtlı bozuk tetik sessiz kalmasın)',
   /\$\('#wakeWord'\)\.value=st\.wakeWord\|\|''; userWake=norm\(st\.wakeWord\|\|''\); wakeUyar\(\);/.test(kod));
ok('uyarı alanı sayfada var', /id="wakeWarn"/.test(tel));
ok('uyarı iki dilde tanımlı',
   (tel.match(/wakeMulti:'/g)||[]).length===2 && (tel.match(/wakeBad:'/g)||[]).length===2);
/* apply() içinde AYNI satır iki kez duruyordu; ikincisi hiçbir şey yapmıyordu. */
ok('tetik satırı apply icinde bir kez geçiyor',
   (kod.match(/\$\('#wakeWord'\)\.value=st\.wakeWord/g)||[]).length===1);

/* ---------- SENARYONUN KENDİSİ KOMUT TETİKLEMESİ KONTROLÜ DURUYOR ----------
   Kendi tetiğin metinde geçiyorsa hazırlık kontrolü bunu engel olarak
   gösteriyor; bu iddia o korumanın kullanıcı tetiğini de kapsadığını sınar. */
const mKal=kod.match(/function komutKaliplari\(\)\{[\s\S]*?\n\}/);
ok('komut kalıbı taraması çıkarılabildi', !!mKal);
if(mKal) ok('tarama kullanıcının kendi tetiğini de kapsıyor',
   /userWake&&toks\[i\]===userWake/.test(mKal[0]));
