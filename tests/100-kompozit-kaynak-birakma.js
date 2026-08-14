const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* G7 — KOMPOZİT KAPANINCA TÜM GPU KAYNAKLARI BIRAKILIYOR MU:
   BIRAKILMIYORDU — iki kalem eksikti. "Yarım kalmış düzeltme" sınıfı:
   stopComptaki yorum "aç-kapa döngüsünde doku ve program birikiyordu"
   diyor ve doku, arabellek, program gerçekten siliniyordu. Ama:

   1) GÖLGELENDİRİCİLER HİÇ SİLİNMİYORDU. Kaynakta tek bir `deleteShader`
      yoktu. `deleteShader` çağrılmadıkça gölgelendirici nesneleri program
      silinse bile GPUda kalır: her açılışta iki tane daha birikiyordu.

   2) TUVAL ARABELLEKLERİ HİÇ KÜÇÜLTÜLMÜYORDU. Kompozit kapandıktan sonra
      iki tuval de eski boyutunda duruyordu. ÖLÇÜLDÜ:
        9:16 hedef  compCv 7,9 MB + compOut 7,9 MB = 15,8 MB
        16:9 hedef  aynı                            = 15,8 MB
        1:1  hedef  4,4 + 4,4                       =  8,9 MB
      Kapalı bir özellik için tutulan bellek. İkisi de o sırada gizli
      (body.comp sınıfı kaldırılıyor), yani küçültmek görünen hiçbir
      şeyi değiştirmiyor; startComp her açılışta doğru boyutu kuruyor.

   Ayrıca bağlanma (link) başarısız olduğunda program da bırakılmıyordu. */

/* ---------- KAYNAK OLUŞTURMA VE BIRAKMA EŞLEŞİYOR MU ---------- */
const mStart=kod.match(/function startComp\(\)\{[\s\S]*?\n\}/);
const mStop=kod.match(/function stopComp\(\)\{[\s\S]*?\n\}/);
ok('startComp çıkarılabildi', !!mStart);
ok('stopComp çıkarılabildi', !!mStop);
if(!mStart||!mStop) return;
const bas=mStart[0], dur=mStop[0];

/* Her create* için bir delete* olmalı — eşleşmeyen kalem sızıntıdır. */
const ESLESME=[
  ['createProgram','deleteProgram','program'],
  ['createBuffer','deleteBuffer','arabellek'],
  ['createShader','deleteShader','gölgelendirici'],
];
for(const [yap,sil,ad] of ESLESME){
  ok(ad+': oluşturuluyor', new RegExp('gl\\.'+yap+'\\(').test(kod));
  ok(ad+': bırakılıyor da', new RegExp('gl\\.'+sil+'\\(').test(kod));
}
ok('doku oluşturuluyor', /function glTex\(/.test(kod) || /createTexture/.test(kod));
ok('iki doku da siliniyor',
   /if\(comp\.tex\) gl\.deleteTexture\(comp\.tex\);/.test(dur) &&
   /if\(comp\.bgTex\) gl\.deleteTexture\(comp\.bgTex\);/.test(dur));

/* ---------- ASIL BULGU 1: GÖLGELENDİRİCİLER ---------- */
ok('gölgelendiriciler bir değişkende tutuluyor (silinebilsin diye)',
   /const vs=sh\(gl\.VERTEX_SHADER,VS_SRC\), fs=sh\(gl\.FRAGMENT_SHADER,FS_SRC\);/.test(bas));
ok('ikisi de programa bağlanıyor', /gl\.attachShader\(pr,vs\); gl\.attachShader\(pr,fs\);/.test(bas));
ok('ikisi de bırakılıyor', /gl\.deleteShader\(vs\); gl\.deleteShader\(fs\);/.test(bas));
/* Bağlamadan SONRA silinmeli: önce silinirse program bağlanamaz. */
ok('silme bağlamadan (link) sonra',
   bas.indexOf('gl.linkProgram(pr)') < bas.indexOf('gl.deleteShader(vs)'));
/* Bağlanma kontrolünden ÖNCE silinmeli: yoksa hata yolunda sızarlar. */
ok('silme başarısızlık kontrolünden önce (hata yolunda da bırakılıyor)',
   bas.indexOf('gl.deleteShader(vs)') < bas.indexOf('LINK_STATUS'));
ok('bağlanma başarısızsa program da bırakılıyor',
   /if\(!gl\.getProgramParameter\(pr,gl\.LINK_STATUS\)\)\{\s*gl\.deleteProgram\(pr\);/.test(bas));

/* ---------- ASIL BULGU 2: TUVAL ARABELLEKLERİ ---------- */
ok('kompozit tuvali 1x1e indiriliyor', /if\(comp\.cv\)\{ comp\.cv\.width=1; comp\.cv\.height=1; \}/.test(dur));
ok('çıktı tuvali de 1x1e indiriliyor',
   /const oc=\$\('#compOut'\); if\(oc\)\{ oc\.width=1; oc\.height=1; \}/.test(dur));
/* Küçültme GL kaynakları silindikten SONRA olmalı. */
ok('küçültme doku silmelerinden sonra',
   dur.indexOf('deleteTexture') < dur.indexOf('comp.cv.width=1'));
ok('tuval göstergesi de temizleniyor (bayat referans kalmasın)', /comp\.cv=null;/.test(dur));
/* İkisi de o sırada gizli: görünen hiçbir şey değişmiyor. */
ok('kompozit tuvali yalnız comp sınıfıyla görünüyor', /body\.comp #compCv\{display:block\}/.test(tel));
ok('çıktı tuvali yalnız comp\\.burn ile görünüyor', /body\.comp\.burn #compOut\{display:block\}/.test(tel));
ok('durdururken comp sınıfı kaldırılıyor', /body\.classList\.remove\('comp','burn'\);/.test(dur));

/* ---------- BAYAT REFERANS OKUNMUYOR ---------- */
ok('drawComp kapalıyken hiç okumuyor', /function drawComp\(\)\{\s*if\(!comp\.on\) return;/.test(kod));
ok('resizeComp kapalıyken hiç okumuyor', /function resizeComp\(\)\{\s*if\(!comp\.on\|\|!comp\.gl\) return;/.test(kod));
ok('compRecStream kapalıyken hiç okumuyor', /function compRecStream\(\)\{\s*if\(!comp\.on\) return null;/.test(kod));
ok('durdurma comp.on false yaparak başlıyor (okuyucular hemen kapansın)',
   /function stopComp\(\)\{\s*comp\.on=false;/.test(dur));

/* ---------- DURDURMAYI GERÇEKTEN KOŞTUR ---------- */
function durdur({tuvalW=1080, tuvalH=1920, glVar=true, akisVar=true}={}){
  return new Function('__d', `
    const iz=[];
    const cv={ width:__d.w, height:__d.h };
    const oc={ width:__d.w, height:__d.h };
    const gl=__d.gl?{
      deleteTexture:t=>iz.push('dokuSilindi:'+t),
      deleteBuffer:b=>iz.push('arabellekSilindi:'+b),
      deleteProgram:p=>iz.push('programSilindi:'+p) }:null;
    const kameraIzleri=[{ad:'ses'}];
    const kompozitIzleri=[{ad:'tuval', stop:()=>iz.push('tuvalIziDurdu')}, kameraIzleri[0]];
    kameraIzleri[0].stop=()=>iz.push('SES_IZI_DURDU');
    const comp={ on:true, raf:9, cv, gl, tex:'T1', bgTex:'T2', buf:'B', pr:'P',
                 stream: __d.akis?{ getTracks:()=>kompozitIzleri }:null, bgReady:true };
    const stream={ getTracks:()=>kameraIzleri };
    const body={ classList:{ remove:(...a)=>iz.push('sinifKaldirildi:'+a.join(',')) } };
    const cancelAnimationFrame=()=>iz.push('donguDurdu');
    const $=k=>k==='#compOut'?oc:null;
    const logErr=()=>{};
    ${dur}
    stopComp();
    return {iz, cv:[cv.width,cv.height], oc:[oc.width,oc.height], comp};
  `)({w:tuvalW, h:tuvalH, gl:glVar, akis:akisVar});
}
{
  const r=durdur();
  ok('çizim döngüsü durduruluyor', r.iz.includes('donguDurdu'));
  ok('iki doku da siliniyor (koşarak)',
     r.iz.includes('dokuSilindi:T1') && r.iz.includes('dokuSilindi:T2'));
  ok('arabellek siliniyor (koşarak)', r.iz.includes('arabellekSilindi:B'));
  ok('program siliniyor (koşarak)', r.iz.includes('programSilindi:P'));
  ok('kompozit tuvali gerçekten 1x1 oldu', r.cv[0]===1 && r.cv[1]===1);
  ok('çıktı tuvali gerçekten 1x1 oldu', r.oc[0]===1 && r.oc[1]===1);
  ok('göstergeler temizlendi',
     r.comp.tex===null && r.comp.bgTex===null && r.comp.buf===null &&
     r.comp.pr===null && r.comp.gl===null && r.comp.cv===null);
  ok('kompozit kapalı işaretlendi', r.comp.on===false);
  ok('bgReady sıfırlandı (bayat arka plan kullanılmasın)', r.comp.bgReady===false);
  /* EN KRİTİK KORUMA: kameranın SES izi durdurulmamalı — durdurulursa
     sonraki bütün çekimler sessiz kalıyordu. */
  ok('kameranın ses izi DURDURULMUYOR', !r.iz.includes('SES_IZI_DURDU'));
  ok('yalnız kompozitin kendi izi durduruluyor', r.iz.includes('tuvalIziDurdu'));
  ok('kompozit akışı bırakılıyor', r.comp.stream===null);
}
{
  /* GL bağlamı zaten kaybolmuşsa çökmemeli — bağlam kaybı yolu buraya düşüyor. */
  const r=durdur({glVar:false});
  ok('GL bağlamı yokken çökmüyor', r.comp.gl===null);
  ok('GL yokken de tuvaller küçültülüyor', r.cv[0]===1 && r.oc[0]===1);
}
{
  const r=durdur({akisVar:false});
  ok('akış yokken çökmüyor', r.comp.on===false);
  ok('akış yokken de tuvaller küçültülüyor', r.cv[0]===1 && r.oc[0]===1);
}
{
  /* Başka bir hedef oranında da aynı: küçültme boyuta bağlı değil. */
  const r=durdur({tuvalW:1920, tuvalH:1080});
  ok('yatay hedefte de tuvaller bırakılıyor', r.cv[0]===1 && r.oc[0]===1);
}
