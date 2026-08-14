const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* G5 — makeBgCanvas BÜYÜK GÖRSELDE BELLEK ŞİŞİRİYOR MU:
   ŞİŞİRMİYOR (hipotez çürüdü) — AMA BİR ÜST KATMAN ŞİŞİRİYORDU.

   makeBgCanvas tek seferlik ve SINIRLI: en büyük hedefte bile
   1920x1080x4 = 7,9 MB ayırıyor, dokuyu yükleyip bırakıyor.
   Saklanan görsel de zaten sınırlı: 1280 px uzun kenar, JPEG 0,82,
   1,4 MB dataURL tavanı.

   ASIL ŞİŞME DOSYA SEÇİMİNDEYDİ — M1-P1 dersinin aynısı: içeriği
   önce tümüyle belleğe almak. Eski yol `readAsDataURL` kullanıyordu;
   base64 dizesi dosyanın 1,33 katı ve YALNIZCA baytları görsele
   vermek için var oluyordu. ÖLÇÜLEN TEPE (dize + çözülmüş RGBA):

     12 MP telefon fotoğrafı (3,5 MB)  ->  4,7 + 46,5  =  51 MB
     48 MP fotoğraf (12 MB)            -> 16,0 + 186   = 202 MB
     60 MP fotoğraf (25 MB)            -> 33,3 + 230   = 263 MB

   Üstelik hiçbir boyut kapısı yoktu: sekme ölürse kullanıcı sebebini
   hiçbir yerde göremiyordu.

   İki değişiklik: nesne adresi base64 dizesini tümüyle kaldırıyor
   (12 MP fotoğrafta 4,7 MB, 60 MPde 33 MB), ve dosya boyutu için
   sebebini söyleyen açık bir kapı kondu. Çözülmüş görüntünün kendi
   maliyeti geriye kalıyor; onu düşürmek `createImageBitmap` ile
   yeniden boyutlandırma ister ve gerçek cihazda doğrulanmalı (G11). */

/* ---------- makeBgCanvas SINIRLI MI ---------- */
const mBoy=kod.match(/function bgDokuBoyu\(W,H\)\{[\s\S]*?\n\}/);
ok('bgDokuBoyu çıkarılabildi', !!mBoy);
if(!mBoy) return;
const boy=new Function('W','H', mBoy[0].replace(/^function bgDokuBoyu\(W,H\)\{/,'').replace(/\}$/,''));
{
  /* En kötü durumda ayrılan tuval ne kadar? Piksel x 4 bayt (RGBA). */
  let enBuyuk=0, nerede='';
  for(const [ad,W,H] of [['9:16',1080,1920],['16:9',1920,1080],['4:5',1080,1350],
                         ['1:1',1080,1080],['kamera',1280,720],['4K',3840,2160],
                         ['8K',7680,4320]]){
    const [tw,th]=boy(W,H); const mb=tw*th*4/1048576;
    if(mb>enBuyuk){ enBuyuk=mb; nerede=ad; }
    ok(ad+': arka plan tuvali 8 MBin altında ('+mb.toFixed(1)+' MB)', mb<8);
  }
  console.log('   en büyük ayırma: '+enBuyuk.toFixed(1)+' MB ('+nerede+')');
  /* Kamera 8K bildirse bile doku büyümemeli — sınır oradan geliyor. */
  const [a,b]=boy(7680,4320);
  ok('kamera 8K bildirse de doku 1920x1080i aşmıyor', Math.max(a,b)<=1920 && Math.min(a,b)<=1080);
}
{
  /* Tuval saklanmıyor, dokuya yüklenip bırakılıyor: her çağrıda yeni
     tuval ayırmak SORUN DEĞİL, saklamak sorun olurdu. */
  ok('arka plan tuvali bir değişkende tutulmuyor', !/comp\.bgCv\s*=/.test(kod));
  ok('doku tek bir GL nesnesine yükleniyor', /gl\.bindTexture\(gl\.TEXTURE_2D,comp\.bgTex\);/.test(kod));
}

/* ---------- SAKLANAN GÖRSEL SINIRLI MI ---------- */
ok('görsel 1280 pikselden büyük saklanmıyor', /const mx=1280, sc=Math\.min\(1,mx\/Math\.max\(img\.width,img\.height\)\);/.test(kod));
ok('JPEGe çevriliyor (PNG çok büyük olurdu)', /toDataURL\('image\/jpeg',0\.82\)/.test(kod));
ok('küçültmeden sonra da tavan var (1,4 MB)', /if\(url\.length>1400000\)\{ toast\(m\('bgTooBig'\)\); return; \}/.test(kod));
ok('tavan aşılırsa sebebi söyleniyor', /bgTooBig:'Görsel çok büyük/.test(tel) && /bgTooBig:'Image too large/.test(tel));

/* ---------- ASIL BULGU: DOSYA OKUMA YOLU ---------- */
ok('base64 dizesi artık üretilmiyor (readAsDataURL yok)', !/readAsDataURL/.test(kod));
ok('dosya nesne adresiyle veriliyor', /const adres=URL\.createObjectURL\(f\);/.test(kod));
ok('adres iş bitince bırakılıyor', /const birak=\(\)=>\{ URL\.revokeObjectURL\(adres\); \};/.test(kod));
ok('başarıda bırakılıyor', /img\.onload=\(\)=>\{\s*birak\(\);/.test(kod));
ok('hatada da bırakılıyor (sızıntı olmasın)', /img\.onerror=\(\)=>\{ birak\(\); toast\(m\('bgTooBig'\)\); \};/.test(kod));
ok('dosya boyutu kapısı var', /if\(f\.size>25\*1024\*1024\)\{ toast\(m\('bgDosyaBuyuk'\)\); return; \}/.test(kod));
ok('boyut kapısının sebebi iki dilde yazılı',
   /bgDosyaBuyuk:'Görsel dosyası çok büyük — 25 MB altında bir görsel seç'/.test(tel) &&
   /bgDosyaBuyuk:'Image file too large — pick one under 25 MB'/.test(tel));
/* Kapı, dosyaya DOKUNMADAN önce olmalı: sonra olsa bellek zaten harcanmış olur. */
ok('kapı adres üretiminden ÖNCE',
   kod.indexOf('f.size>25*1024*1024') < kod.indexOf('URL.createObjectURL(f)'));

/* ---------- GERÇEK İŞLEYİCİYİ KOŞTUR ---------- */
const mH=kod.match(/\$\('#bgFile'\)\.onchange=e=>\{[\s\S]*?\n\};/);
ok('dosya işleyicisi çıkarılabildi', !!mH);
if(!mH) return;

function sec(dosyaMB, {gorselW=4032, gorselH=3024, yuklemeHata=false, buyukCikti=false}={}){
  return new Function('__d', `
    const iz=[];
    const f={ size:__d.mb*1024*1024, name:'foto.jpg' };
    const e={ target:{ files:[f], value:'x' } };
    let acikAdres=0;
    const URL={ createObjectURL:()=>{ acikAdres++; iz.push('adresAcildi'); return 'blob:1'; },
                revokeObjectURL:()=>{ acikAdres--; iz.push('adresBirakildi'); } };
    const toast=t=>iz.push('mesaj:'+t);
    const m=k=>k;
    const st={}; const save=()=>iz.push('kaydedildi'); const apply=()=>{};
    const loadCompBg=()=>iz.push('arkaPlanKuruldu');
    let img=null;
    class Image{ constructor(){ img=this; this.width=__d.w; this.height=__d.h;
      this._src=''; }
      set src(v){ this._src=v; iz.push('kaynak:'+v);
        setTimeout(()=>{ if(__d.hata) this.onerror&&this.onerror(); else this.onload&&this.onload(); },0); }
      get src(){ return this._src; } }
    const document={ createElement:()=>({ width:0, height:0,
      getContext:()=>({ drawImage:(im,x,y,w,h)=>iz.push('cizildi:'+w+'x'+h) }),
      toDataURL:()=>'data:image/jpeg;base64,'+'A'.repeat(__d.buyuk?1500000:1000) }) };
    const $=()=>({ onclick:null });
    ${mH[0].replace("$('#bgFile').onchange=", "const isle=")}
    isle(e);
    return new Promise(r=>setTimeout(()=>r({iz, acikAdres, girdiDegeri:e.target.value, st}),5));
  `)({mb:dosyaMB, w:gorselW, h:gorselH, hata:yuklemeHata, buyuk:buyukCikti});
}

(async()=>{
  {
    const r=await sec(3.5);
    ok('normal fotoğraf kabul ediliyor', r.iz.includes('kaydedildi'));
    ok('normal fotoğrafta adres açılıyor', r.iz.includes('adresAcildi'));
    ok('iş bitince adres bırakılıyor (sızıntı yok)', r.acikAdres===0);
    ok('görsele nesne adresi veriliyor, dataURL değil', r.iz.includes('kaynak:blob:1'));
    ok('hiçbir aşamada base64 dizesi üretilmiyor', !r.iz.some(x=>/^kaynak:data:/.test(x)));
    ok('1280 pikselden büyük çizilmiyor',
       r.iz.some(x=>/^cizildi:1280x/.test(x)));
    ok('arka plan yeniden kuruluyor', r.iz.includes('arkaPlanKuruldu'));
    ok('dosya girdisi temizleniyor (aynı dosya tekrar seçilebilsin)', r.girdiDegeri==='');
  }
  {
    const r=await sec(30);
    ok('30 MB dosya reddediliyor', !r.iz.includes('kaydedildi'));
    ok('30 MB dosyada sebebi söyleniyor', r.iz.includes('mesaj:bgDosyaBuyuk'));
    ok('30 MB dosyaya hiç DOKUNULMUYOR (adres bile açılmıyor)', !r.iz.includes('adresAcildi'));
  }
  {
    /* Sınırın hemen altı geçmeli: kapı çalışan kullanımı kesmemeli. */
    const r=await sec(24.9);
    ok('24,9 MB dosya kabul ediliyor (kapı fazla dar değil)', r.iz.includes('kaydedildi'));
  }
  {
    const r=await sec(3.5,{yuklemeHata:true});
    ok('bozuk görselde sebebi söyleniyor', r.iz.includes('mesaj:bgTooBig'));
    ok('bozuk görselde de adres bırakılıyor', r.acikAdres===0);
    ok('bozuk görsel kaydedilmiyor', !r.iz.includes('kaydedildi'));
  }
  {
    const r=await sec(3.5,{buyukCikti:true});
    ok('küçültmeden sonra hâlâ büyükse reddediliyor', !r.iz.includes('kaydedildi'));
    ok('o durumda da sebebi söyleniyor', r.iz.includes('mesaj:bgTooBig'));
    ok('o durumda da adres sızmıyor', r.acikAdres===0);
  }
  {
    /* Zaten küçük bir görsel BÜYÜTÜLMEMELİ (ölçek en fazla 1). */
    const r=await sec(0.3,{gorselW:640, gorselH:480});
    ok('küçük görsel büyütülmüyor', r.iz.some(x=>x==='cizildi:640x480'));
  }
})();
