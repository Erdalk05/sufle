const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

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
  const m=kod.match(/const sapma = caps && caps\.exposureCompensation;[\s\S]*?\} else \{ st\.poz=undefined; st\.pozElle=false; \}/);
  ok('pozlama kurulumu çıkarılabildi', !!m);
  if(m){
    ok('iki yol da aranıyor (sapma ve süre)',
       /caps\.exposureCompensation/.test(m[0]) && /exposureMode[\s\S]*?includes\('manual'\)/.test(m[0]) &&
       /caps\.exposureTime/.test(m[0]));
    ok('desteklenmiyorsa satır gizleniyor', /\$\('#pozRow'\)\.style\.display = pozYet \? 'flex' : 'none'/.test(m[0]));
    ok('desteklenmiyorsa durum da sıfırlanıyor (ölü ayar kalmasın)',
       /else \{ st\.poz=undefined; st\.pozElle=false; \}/.test(m[0]));
    ok('sınırlar cihazdan okunuyor (sabit değer değil)',
       /yet\.min/.test(m[0]) && /yet\.max/.test(m[0]));
  }
  const w=kod.match(/const wbKip = [\s\S]*?\} else \{ st\.wb=0; \}/);
  ok('beyaz ayarı kurulumu çıkarılabildi', !!w);
  if(w){
    /* Kip VE aralık BİRLİKTE gerekiyor: yalnız biri varsa uygulanamaz. */
    /* İKİSİ BİRDEN şart: kip 'manual' değilken renk sıcaklığı uygulanmaz.
       İlk yazımda iddia yalnız iki ifadenin VARLIĞINI arıyordu; kasıtlı
       bozma "ikisini VE ile bağla" kuralını söküp geçti — gevşek desen. */
    ok('beyaz ayarı hem kip hem aralık istiyor',
       /whiteBalanceMode\) \|\| \[\]\)\.includes\('manual'\)/.test(w[0]) && /caps\.colorTemperature/.test(w[0]));
    ok('kip ve aralık VE ile bağlı (biri yetmez)',
       /const wbVar = !!\(wbKip && wbYet\);/.test(kod));
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
    ok('sapma yolunda kip continuous, değer sapma',
       /exposureMode:'continuous', exposureCompensation:st\.poz/.test(p[0]));
    ok('süre yolunda kip manual, değer süre',
       /exposureMode:'manual', exposureTime:st\.poz/.test(p[0]));
    /* Cihaz reddederse ayar SESSİZCE kalmamalı: sürgü kaldırılıyor ve
       sebebi söyleniyor — yoksa "çekiyorum ama değişmiyor" olurdu. */
    ok('cihaz reddederse ayar kaldırılıyor ve söyleniyor',
       /catch\(e=>\{ logErr\('poz',e\); toast\(m\('pozNo'\)\)/.test(p[0]) &&
       /st\.poz=undefined; pozYolu=null/.test(p[0]));
  }
  const w=kod.match(/function applyWb\(\)\{[\s\S]*?\n\}/);
  ok('applyWb çıkarılabildi', !!w);
  if(w){
    ok('elle değer verilince kip de manual oluyor',
       /whiteBalanceMode:'manual', colorTemperature:st\.wb/.test(w[0]));
    ok('sıfır değer otomatiğe dönüyor', /whiteBalanceMode:'continuous'/.test(w[0]));
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
