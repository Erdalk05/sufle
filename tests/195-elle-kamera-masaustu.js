const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cekirdekOku}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());
const CEK=cekirdekOku('kamera.js','SUFLE_KAMERA');

/* ELLE KAMERA DENETİMLERİ MASAÜSTÜNE (2026-08-19).

   ÖLÇÜM: `applyConstraints` telefonda 8 iz, Mac'te **0**. 16 Ağustos'un
   eksik listesinde masaüstü için üç madde yazıyordu ve ölçünce üçü de
   yanlış çıktı (kompozit, arşiv, kaldığın yer hepsi VAR); masaüstünde
   gerçekten eksik olan tek şey buydu.

   KURAL ÇEKİRDEĞE ALINDI, KOPYALANMADI. Telefonun `setupCaps`i de artık
   aynı fonksiyonları çağırıyor. Kopyalasaydık, iki kabuk aynı cihazda
   farklı denetim gösterirdi ve fark ancak kullanıcı ikisini yan yana
   koyduğunda görünürdü.

   ORTAK PAYDA: **ön koşulu olan ayar = sessiz ölü özellik.** Yetenek yoksa
   denetim HİÇ çizilmemeli; çizilirse kullanıcı sürgüyü oynatır, kamera
   değişmez, sebebi hiçbir yerde yazmaz. */

const c=(()=>new Function(CEK+
  '\nreturn {kamKilitKipleri,kamKilitKisiti,kamPozYolu,kamPozKisiti,kamPozYazi,'+
  'kamWbAralik,kamWbKisiti};')())();

/* ---------- 1) KİLİT KİPLERİ ---------- */
{
  const {kamKilitKipleri}=c;
  ok('manual kipi kilit sayılıyor',
     kamKilitKipleri({focusMode:['continuous','manual']}).odak==='manual');
  /* iOS 'single-shot' veriyor, Android 'manual'. Yalnız birine bakan kod
     platformlardan birinde kilidi hiç göstermezdi. */
  ok('single-shot da kilitliyor',
     kamKilitKipleri({focusMode:['continuous','single-shot']}).odak==='single-shot');
  ok('continuous tek başına kilit DEĞİL',
     kamKilitKipleri({focusMode:['continuous']}).var===false);
  ok('yalnız pozlama kilidi de yeter',
     kamKilitKipleri({exposureMode:['manual']}).var===true);
  ok('yetenek yoksa kilit yok', kamKilitKipleri({}).var===false);
  ok('bozuk girdi çökmüyor', kamKilitKipleri(null).var===false);
}

/* ---------- 2) KİLİT KISITI: DESTEKSİZ ALAN GÖNDERİLMİYOR ---------- */
{
  const {kamKilitKisiti}=c;
  /* 🔴 DESTEKSİZ ALANI İSTEMEK BAZI TARAYICILARDA TÜM KISITI REDDETTİRİYOR
     ve kilit sessizce hiç uygulanmıyordu. Yalnız desteklenen alan gider. */
  const yalnizOdak=kamKilitKisiti({odak:'manual', poz:undefined}, true);
  ok('desteklenmeyen alan kısıta konmuyor', !('exposureMode' in yalnizOdak));
  ok('desteklenen alan kısıta konuyor', yalnizOdak.focusMode==='manual');
  const kapali=kamKilitKisiti({odak:'manual', poz:'manual'}, false);
  ok('kilit kapanınca continuous gönderiliyor',
     kapali.focusMode==='continuous' && kapali.exposureMode==='continuous');
  ok('hiçbir alan desteklenmiyorsa kısıt YOK (boşuna istek atılmıyor)',
     kamKilitKisiti({}, true)===null);
}

/* ---------- 3) POZLAMANIN İKİ YOLU ---------- */
{
  const {kamPozYolu}=c;
  /* Cihazlar ikiye bölünüyor; yalnız birine bakmak desteği olan cihazların
     yarısını dışarıda bırakırdı. */
  const a=kamPozYolu({exposureCompensation:{min:-3,max:3,step:1}});
  ok('sapma yolu seçiliyor', a.yol==='sapma');
  ok('sapmada varsayılan nötr (0)', a.varsayilan===0);
  const b=kamPozYolu({exposureMode:['manual'],exposureTime:{min:100,max:900,step:10}});
  ok('süre yolu seçiliyor', b.yol==='sure');
  ok('sürede varsayılan aralığın ortası', b.varsayilan===500);
  /* exposureTime var ama 'manual' kip YOKSA süre uygulanamaz — yol açılmamalı. */
  ok('manual kipi olmadan süre yolu açılmıyor',
     kamPozYolu({exposureTime:{min:1,max:9}}).yol===null);
  ok('yetenek yoksa yol yok', kamPozYolu({}).yol===null);
  ok('sapma yolu süreye tercih ediliyor (kullanıcıya daha anlaşılır)',
     kamPozYolu({exposureCompensation:{min:-2,max:2},
                 exposureMode:['manual'],exposureTime:{min:1,max:9}}).yol==='sapma');
  ok('adım verilmezse aralıktan türetiliyor',
     kamPozYolu({exposureCompensation:{min:-3,max:3}}).adim===0.5);
}

/* ---------- 4) KISIT: KİP İLE DEĞER BİRLİKTE ---------- */
{
  const {kamPozKisiti,kamWbKisiti}=c;
  /* 🔴 YALNIZ DEĞERİ İSTEMEK sessizce hiçbir şey yapmaz: kip otomatik
     kalırsa kamera kendi pozlamasını sürdürür. "Yarım kalmış düzeltme" sınıfı. */
  const sp=kamPozKisiti('sapma',1.5);
  ok('sapma kısıtı kipi de taşıyor', sp.exposureMode==='continuous' && sp.exposureCompensation===1.5);
  const sr=kamPozKisiti('sure',400);
  ok('süre kısıtı manual kipi taşıyor', sr.exposureMode==='manual' && sr.exposureTime===400);
  ok('yol yoksa kısıt yok', kamPozKisiti(null,1)===null);
  ok('değer yoksa kısıt yok', kamPozKisiti('sapma',undefined)===null);
  ok('sıfır GEÇERLİ bir değer (nötr pozlama)', kamPozKisiti('sapma',0)!==null);
  ok('beyaz ayarı elle iken kip de manual',
     kamWbKisiti(5200).whiteBalanceMode==='manual' && kamWbKisiti(5200).colorTemperature===5200);
  ok('beyaz ayarı 0 iken otomatiğe dönülüyor',
     kamWbKisiti(0).whiteBalanceMode==='continuous' && !('colorTemperature' in kamWbKisiti(0)));
}

/* ---------- 5) BEYAZ AYARI YETENEĞİ ---------- */
{
  const {kamWbAralik}=c;
  ok('kip + sıcaklık birlikteyse açık',
     kamWbAralik({whiteBalanceMode:['manual'],colorTemperature:{min:3000,max:7000,step:50}}).var===true);
  /* Sıcaklık var ama 'manual' kip yoksa değer UYGULANMAZ — sürgüyü
     göstermek ölü ayar olurdu. */
  ok('kip olmadan sıcaklık tek başına yetmiyor',
     kamWbAralik({colorTemperature:{min:3000,max:7000}}).var===false);
  ok('yetenek yoksa kapalı', kamWbAralik({}).var===false);
  const r=kamWbAralik({whiteBalanceMode:['manual'],colorTemperature:{}});
  ok('sınır verilmezse makul varsayılan', r.min===2800 && r.max===7500 && r.adim===100);
}

/* ---------- 6) KULLANICIYA YAZILAN DEĞER ---------- */
{
  const {kamPozYazi}=c;
  ok('sapmada artı işareti yazılıyor', kamPozYazi('sapma',2,-3,3)==='+2');
  ok('sapmada eksi olduğu gibi', kamPozYazi('sapma',-1,-3,3)==='-1');
  /* Ham mikrosaniye kimseye bir şey anlatmaz; yüzde anlatır. */
  ok('sürede yüzdeye çevriliyor', kamPozYazi('sure',500,100,900)==='50%');
  ok('değer yoksa tire', kamPozYazi(null,undefined,0,1)==='—');
}

/* ---------- 7) İKİ KABUK DA ÇEKİRDEĞİ KULLANIYOR ---------- */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': kamera çekirdeği gömülü', /function kamPozYolu\(/.test(src));
  /* KURAL KOPYALANMAMALI: kabukta ikinci bir yetenek kararı yaşarsa iki
     kabuk aynı cihazda farklı denetim gösterir. */
  ok(ad+': kilit kipleri çekirdekten soruluyor', /kamKilitKipleri\(caps\)/.test(src));
  ok(ad+': pozlama yolu çekirdekten soruluyor', /kamPozYolu\(caps\)/.test(src));
  ok(ad+': beyaz ayarı çekirdekten soruluyor', /kamWbAralik\(caps\)/.test(src));
  ok(ad+': kısıtlar çekirdekten üretiliyor',
     /kamPozKisiti\(/.test(src) && /kamWbKisiti\(/.test(src) && /kamKilitKisiti\(/.test(src));
  /* Kabuğun KENDİ kodunda ikinci bir kip listesi kalmamalı. Gömülü çekirdek
     bloğu çıkarılarak bakılıyor: onun içinde bu desenler ZATEN var ve onları
     ihlal saymak testi ürün doğruyken kırardı. */
  const govde=src.replace(/\/\* ==CEKIRDEK:kamera\.js== \*\/[\s\S]*?\/\* ==\/CEKIRDEK:kamera\.js== \*\//,'');
  ok(ad+': kabukta ikinci bir kip listesi kalmadı',
     !/whiteBalanceMode\s*\|\|\s*\[\]/.test(govde) && !/find\(k=>k==='manual'\|\|k==='single-shot'\)/.test(govde));
  ok(ad+': kabukta ikinci bir kısıt kalıbı kalmadı',
     !/\{exposureMode:'manual', exposureTime:/.test(govde) &&
     !/\{whiteBalanceMode:'manual', colorTemperature:/.test(govde));
}

/* ---------- 8) MASAÜSTÜ: YETENEK YOKSA DENETİM ÇİZİLMİYOR ---------- */
{
  ok('Mac: pozlama satırı yeteneğe bağlı',
     /\$\('#macPozRow'\)\.style\.display = pozVar \? 'flex' : 'none'/.test(mac));
  ok('Mac: beyaz ayarı satırı yeteneğe bağlı',
     /\$\('#macWbRow'\)\.style\.display = wb\.var \? 'flex' : 'none'/.test(mac));
  ok('Mac: kilit satırı yeteneğe bağlı',
     /\$\('#macLockRow'\)\.style\.display = macKilitKipleri\.var \? 'flex' : 'none'/.test(mac));
  ok('Mac: fener satırı yeteneğe bağlı',
     /\$\('#macTorchRow'\)\.style\.display = fener \? 'flex' : 'none'/.test(mac));
  /* Desteksiz cihazda "açık" görünen ama hiçbir şey yapmayan bayrak kalmasın. */
  ok('Mac: desteksizken kilit durumu temizleniyor',
     /if\(!macKilitKipleri\.var\) state\.camLock=false/.test(mac));
  ok('Mac: desteksizken fener durumu temizleniyor', /if\(!fener\) state\.torch=false/.test(mac));
  ok('Mac: desteksizken pozlama durumu temizleniyor',
     /state\.poz=undefined; state\.pozElle=false/.test(mac));
  /* 🔴 KULLANICI İSTEMEDEN KAMERAYA DOKUNULMAZ: açılışta uygulamak, kimsenin
     istemediği hâlde kamerayı 'manual' kipe alır (telefonda tam da bu kusur
     çekim akışı ölçümünde iki hata birden düşürmüştü). */
  ok('Mac: pozlama ancak kullanıcı seçtiyse uygulanıyor',
     /if\(state\.pozElle\) macPozUygula\(\)/.test(mac));
  ok('Mac: beyaz ayarı ancak elle değer varsa uygulanıyor',
     /if\(state\.wb\) macWbUygula\(\)/.test(mac));
  /* Anahtar DURUM DEĞİL, KAMERAYA GİDEN İSTEK. */
  ok('Mac: kilit anahtarı kameraya uygulanıyor', /if\(k==='camLock'\)\{ macKilitUygula\(\); \}/.test(mac));
  ok('Mac: fener anahtarı kameraya uygulanıyor', /if\(k==='torch'\)\{ macFenerUygula\(\); \}/.test(mac));
  /* Yetenekler ancak izin+akış sonrası okunabiliyor; openCam'den çağrılmalı. */
  ok('Mac: yetenekler kamera açılınca yeniden ölçülüyor', /macKamYetenek\(\);\s+\/\//.test(mac));
  ok('Mac: sürgüye dokunmak elle kipi işaretliyor', /state\.pozElle=true/.test(mac));
  /* Kısıt reddedilirse denetim GİZLENİYOR: reddeden cihazda duran bir sürgü,
     kullanıcıya çalışıyormuş gibi görünür. */
  ok('Mac: reddedilen pozlama isteğinde sürgü gizleniyor',
     /macPozUygula[\s\S]{0,400}?\$\('#macPozRow'\)\.style\.display='none'/.test(mac));
}

/* ---------- 9) MASAÜSTÜ ZİNCİRİ: HER HALKA ADIYLA ÖLÇÜLÜYOR ----------
   Fonksiyon kapsamı kapısı "hiçbir testin ANMADIĞI fonksiyon" sayar. Adı
   geçmeyen bir fonksiyon, testi olmayan fonksiyondur; kapı bunu sayı olarak
   tutuyor ki yeni kod sessizce ölçüsüz kalmasın. */
for(const f of ['macVideoIzi','macKamKisit','macPozUygula','macWbUygula',
                'macKilitUygula','macFenerUygula','macPozYaz','macWbYaz','macKamYetenek']){
  ok('Mac: '+f+' tanımlı ve çağrılıyor',
     new RegExp('function '+f+'\\(').test(mac) &&
     (mac.match(new RegExp(f+'\\(','g'))||[]).length>=2);
}
/* Değer yazıcıları sürgüden de çağrılmalı: kullanıcı sürükledikçe sayı
   değişmiyorsa denetim ölü görünür. */
ok('Mac: pozlama değeri sürgüyle birlikte yazılıyor', /macPozYaz\(\); macPozUygula\(\)/.test(mac));
ok('Mac: beyaz ayarı değeri sürgüyle birlikte yazılıyor', /macWbYaz\(\); macWbUygula\(\)/.test(mac));

