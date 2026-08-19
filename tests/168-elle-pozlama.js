const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cekirdekOku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
/* v9.34: yetenek KARARLARI cekirdek/kamera.js'e taşındı (Mac de aynı kuralı
   kullanıyor). Kabuk artık kararı SORUYOR; bu test de kararın kendisini
   çekirdekten koşturuyor — kabuktaki kısıt nesnesini aramak, kuralın
   taşındığı gün ürün doğruyken kırılırdı. */
const KAM=cekirdekOku('kamera.js','SUFLE_KAMERA');
const kam=(()=>new Function(KAM+'\nreturn {kamPozKisiti,kamWbKisiti,kamPozYolu,kamWbAralik};')())();

/* ELLE POZLAMA VE BEYAZ AYARI (2026-08-17).

   Rekabet ölçümünde 12. kategori (kamera denetimleri) "elle pozlama/beyaz
   ayarı yok" diye 3'te duruyordu. Eklendi — ama bu deponun 3 numaralı hata
   sınıfına düşmeden: ÖN KOŞULU OLAN AYAR = ÖLÜ AYAR. Cihaz desteklemiyorsa
   sürgü HİÇ görünmüyor ve durum sıfırlanıyor; kullanıcı çekip hiçbir şey
   olmayan bir ayar görmüyor.

   İKİ YOL VAR ve cihazlar ikiye bölünüyor:
     · exposureCompensation → otomatiğe ±sapma
     · exposureMode:'manual' + exposureTime → pozlamanın kendisi
   Yalnız birine bakmak desteği olan cihazların yarısını dışarıda bırakırdı.

   GERÇEK TARAYICIDA ÖLÇÜLDÜ (sahte kamera, exposureTime yolu):
     açılış      → satır görünür, değer %50, iz ayarı {manual, time:55}
     sürgü %83   → iz ayarı {manual, time:85}
   Beyaz ayarı o cihazda desteklenmediği için satır HİÇ görünmedi. */

/* ---------- YETENEĞE BAĞLI GÖSTERİM ---------- */
{
  const m=kod.match(/const pozBilgi = kamPozYolu\(caps\);[\s\S]*?\} else \{ st\.poz=undefined; st\.pozElle=false; \}/);
  ok('pozlama kurulumu çıkarılabildi', !!m);
  if(m){
    /* v9.34: iki yolun SEÇİMİ çekirdekte. Kabuk kararı soruyor, kuralı
       kendisi yazmıyor — Mac de aynı kuralı kullanıyor. */
    ok('yol çekirdekten soruluyor', /kamPozYolu\(caps\)/.test(m[0]));
    ok('iki yol da aranıyor (sapma ve süre)',
       kam.kamPozYolu({exposureCompensation:{min:-2,max:2}}).yol==='sapma' &&
       kam.kamPozYolu({exposureMode:['manual'],exposureTime:{min:1,max:9}}).yol==='sure');
    ok('desteklenmiyorsa satır gizleniyor', /\$\('#pozRow'\)\.style\.display = pozYet \? 'flex' : 'none'/.test(m[0]));
    ok('desteklenmiyorsa durum da sıfırlanıyor (ölü ayar kalmasın)',
       /else \{ st\.poz=undefined; st\.pozElle=false; \}/.test(m[0]));
    ok('sınırlar cihazdan okunuyor (sabit değer değil)',
       kam.kamPozYolu({exposureCompensation:{min:-7,max:7}}).min===-7);
  }
  const w=kod.match(/const wbBilgi = kamWbAralik\(caps\);[\s\S]*?\} else \{ st\.wb=0; \}/);
  ok('beyaz ayarı kurulumu çıkarılabildi', !!w);
  if(w){
    /* Kip VE aralık BİRLİKTE gerekiyor: yalnız biri varsa uygulanamaz. */
    /* İKİSİ BİRDEN şart: kip 'manual' değilken renk sıcaklığı uygulanmaz.
       İlk yazımda iddia yalnız iki ifadenin VARLIĞINI arıyordu; kasıtlı
       bozma "ikisini VE ile bağla" kuralını söküp geçti — gevşek desen. */
    ok('beyaz ayarı hem kip hem aralık istiyor',
       kam.kamWbAralik({whiteBalanceMode:['manual'],colorTemperature:{min:3000,max:7000}}).var===true);
    ok('kip ve aralık VE ile bağlı (biri yetmez)',
       kam.kamWbAralik({colorTemperature:{min:3000,max:7000}}).var===false &&
       kam.kamWbAralik({whiteBalanceMode:['manual']}).var===false);
    ok('desteklenmiyorsa beyaz ayarı satırı gizleniyor',
       /\$\('#wbRow'\)\.style\.display = wbVar \? 'flex' : 'none'/.test(w[0]));
    ok('desteklenmiyorsa beyaz ayarı otomatiğe dönüyor', /else \{ st\.wb=0; \}/.test(w[0]));
  }
}

/* ---------- KİP VE DEĞER BİRLİKTE GÖNDERİLİYOR ---------- */
{
  const p=kod.match(/function applyPoz\(\)\{[\s\S]*?\n\}/);
  ok('applyPoz çıkarılabildi', !!p);
  if(p){
    ok('kısıt çekirdekten üretiliyor (kural iki yerde yaşamıyor)',
       /kamPozKisiti\(pozYolu, st\.poz\)/.test(p[0]));
    /* Kuralın KENDİSİ burada koşturuluyor: kip ile değer birlikte gitmezse
       kamera otomatik kalır ve sürgü sessizce hiçbir şey yapmaz. */
    ok('sapma yolunda kip continuous, değer sapma',
       kam.kamPozKisiti('sapma',2).exposureMode==='continuous' &&
       kam.kamPozKisiti('sapma',2).exposureCompensation===2);
    ok('süre yolunda kip manual, değer süre',
       kam.kamPozKisiti('sure',300).exposureMode==='manual' &&
       kam.kamPozKisiti('sure',300).exposureTime===300);
    /* Cihaz reddederse ayar SESSİZCE kalmamalı: sürgü kaldırılıyor ve
       sebebi söyleniyor — yoksa "çekiyorum ama değişmiyor" olurdu. */
    ok('cihaz reddederse ayar kaldırılıyor ve söyleniyor',
       /catch\(e=>\{ logErr\('poz',e\); toast\(m\('pozNo'\)\)/.test(p[0]) &&
       /st\.poz=undefined; pozYolu=null/.test(p[0]));
  }
  const w=kod.match(/function applyWb\(\)\{[\s\S]*?\n\}/);
  ok('applyWb çıkarılabildi', !!w);
  if(w){
    ok('beyaz ayarı kısıtı çekirdekten üretiliyor', /kamWbKisiti\(st\.wb\)/.test(w[0]));
    ok('elle değer verilince kip de manual oluyor',
       kam.kamWbKisiti(5000).whiteBalanceMode==='manual' &&
       kam.kamWbKisiti(5000).colorTemperature===5000);
    ok('sıfır değer otomatiğe dönüyor', kam.kamWbKisiti(0).whiteBalanceMode==='continuous');
    ok('cihaz reddederse söyleniyor', /toast\(m\('wbNo'\)\)/.test(w[0]));
  }
}

/* ---------- KULLANICI YOLU ---------- */
{
  ok('sürgü anında uygulanıyor (sonuç gözle bulunuyor)',
     /\$\('#poz'\)\.oninput=e=>\{ st\.poz=\+e\.target\.value; st\.pozElle=true; yazPoz\(\); applyPoz\(\); save\(\); \};/.test(kod));
  ok('beyaz ayarı da anında uygulanıyor',
     /\$\('#wb'\)\.oninput=e=>\{ st\.wb=\+e\.target\.value; yazWb\(\); applyWb\(\); save\(\); \};/.test(kod));
  /* Otomatiğe dönüş kolay olmalı: yanlış renkte kalan kullanıcı sıkışmasın. */
  ok('çift dokunuş otomatiğe döndürüyor',
     /\$\('#wb'\)\.ondblclick=\(\)=>\{ st\.wb=0;/.test(kod));
  ok('değer kullanıcıya anlaşılır yazılıyor', /function yazPoz\(\)\{[\s\S]*?'%'/.test(kod));
  ok('beyaz ayarı otomatikken "Otomatik" yazıyor', /\$\('#vWb'\)\.textContent = st\.wb \? st\.wb\+'K' : t\('wbAuto'\)/.test(kod));
  for(const k of ['pozLabel','pozHint','wbLabel','wbHint','wbAuto'])
    ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length===2);
  for(const k of ['pozNo','wbNo'])
    ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length===2);
  /* Açıklama SEBEP söylemeli: "parlaklık" yetmez, ne zaman işe yaradığını
     bilmeyen kullanıcı ayarı hiç açmaz. */
  ok('pozlama açıklaması ne işe yaradığını söylüyor', /pozHint:'[^']*arkadan ışık|pozHint:'[^']*Arkadan ışık/i.test(tel));
  ok('beyaz ayarı açıklaması ten rengini anlatıyor', /wbHint:'[^']*ten rengin/i.test(tel));
}

/* ---------- KULLANICI İSTEMEDEN KAMERAYA DOKUNULMAZ (kapı yakaladı) ----------
   İlk hâlim açılışta `applyPoz()` çağırıyordu: kullanıcı sürgüye hiç
   dokunmadığı hâlde kamera 'manual' kipe alınıyordu. Çekim akışı ölçümünde
   iki hata birden düştü (`poz` ve onun bozduğu `camLock`) ve ALTYAZI ÜRETİMİ
   bozuldu — yani yeni bir ayar, çekirdek özelliği kırıyordu. Otomatik
   pozlama iyidir; elle kip ancak kullanıcı SEÇERSE anlamlıdır. */
{
  ok('açılışta pozlama yalnız kullanıcı seçtiyse uygulanıyor',
     /if\(st\.pozElle\) applyPoz\(\);/.test(kod));
  ok('seçim bayrağı sürgüye dokununca kalkıyor',
     /st\.poz=\+e\.target\.value; st\.pozElle=true;/.test(kod));
  ok('desteklenmeyen cihazda seçim bayrağı da sıfırlanıyor',
     /st\.poz=undefined; st\.pozElle=false;/.test(kod));
  /* Beyaz ayarı da aynı kural: otomatikken kameraya istek göndermek
     gereksiz ve reddedilirse boşuna hata kaydı bırakır. */
  ok('beyaz ayarı otomatikken kameraya dokunulmuyor', /if\(st\.wb\) applyWb\(\);/.test(kod));
  /* Varsayılan durumda yeni alan olmalı: eski kayıtlarda yoktur ve
     `undefined` falsy olduğu için davranış doğru kalır. */
  ok('pozElle varsayılan durumda tanımlı', /pozElle:false/.test(kod));
}
