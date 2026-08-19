const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku, macMetni}=require('./kaynak');
const tel=oku(telefonYolu()), mac=macMetni();
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'');

/* J5 — PAYLAŞIM İPTALİNDE MESAJ DOĞRU MU: DOĞRUYDU (telefonda).
   Telefonda DÖRT ayrı paylaşım yeri var (video, altyazı dosyası, yayın paketi,
   kumanda profili) ve dördü de `AbortError`ı ayırıp "iptal edildi, dosya
   duruyor" diyor. İptal bir HATA DEĞİL: kullanıcı bilerek vazgeçti; ona
   "paylaşım başarısız" demek yanlış suçlamadır.

   MAC TARAFINDA EKSİKTİ: orada iptalde HİÇBİR ŞEY söylenmiyordu, sessizce
   dönülüyordu. Kullanıcı düğmeye bastı, pencere açıldı, kapattı ve ekranda
   hiçbir iz yok — "bir şey oldu mu?" sorusu. Telefondaki mesajın aynısı
   eklendi.

   ASIL DEĞER GELECEKTE: yeni bir paylaşım yeri eklenip AbortErrorı unutursa,
   kullanıcı vazgeçtiğinde korkutucu bir "paylaşım başarısız" görecek. Bu test
   HER paylaşım çağrısını sayıyor ve her birinin iptali ayırdığını sınıyor;
   beşinci bir çağrı eklenirse kapı onu da ister. */

/* ---------- HER PAYLAŞIM YERİ İPTALİ AYIRIYOR MU ---------- */
{
  /* Çağrı yerlerini say, sonra her birinin çevresinde iptal dalını ara.
     Sayıyı da sabitliyoruz ki yeni bir çağrı sessizce eklenmesin. */
  const cagrilar=[...kod.matchAll(/navigator\.share\(/g)].map(m=>m.index);
  ok('telefonda paylaşım çağrıları bulundu ('+cagrilar.length+' yer)', cagrilar.length===4);
  let kapsanan=0;
  for(const i of cagrilar){
    /* Çağrının hemen ardındaki 260 karakterde iptal dalı olmalı. */
    const pencere=kod.slice(i, i+260);
    if(/e\.name==='AbortError'\)\{ shareCancelled\(\); return; \}/.test(pencere)) kapsanan++;
  }
  ok('paylaşım çağrılarının HEPSİ iptali ayırıyor ('+kapsanan+'/'+cagrilar.length+')',
     kapsanan===cagrilar.length);
}
{
  /* İptal mesajı: dosyanın kaybolmadığını söylemeli, yoksa kullanıcı çekimi
     yeniden yapmaya kalkar. */
  const m=kod.match(/function shareCancelled\(\)\{[\s\S]*?\n[^\n]*\}/);
  ok('iptal mesajı fonksiyonu var', !!m);
  if(m){
    /* v9.39: mesaj sözlüğe taşındı. Ölçüt aynı; yeri değişti. */
    ok('iptal mesajı iki dilde', /t\('paylasIptal'\)/.test(m[0]) &&
       /paylasIptal:'[^']*Paylaşım iptal edildi/.test(kod) &&
       /paylasIptal:'[^']*Sharing cancelled/.test(kod));
    ok('mesaj dosyanın durduğunu söylüyor', /paylasIptal:'[^']*dosya duruyor/.test(kod));
    ok('mesaj tekrar denenebileceğini söylüyor', /paylasIptal:'[^']*tekrar deneyebilirsin/.test(kod));
    ok('İngilizcesi de dosyanın durduğunu söylüyor', /paylasIptal:'[^']*the file is still here/.test(kod));
    /* İptal HATA DEĞİL: mesajda başarısızlık dili olmamalı. */
    ok('iptal mesajında başarısızlık dili yok',
       !/başarısız/i.test(m[0]) && !/failed/i.test(m[0]) && !/hata/i.test(m[0]));
  }
}
{
  /* İPTAL İLE GERÇEK HATA AYRI ŞEYLER: gerçek hata olduğunda ayrı bir mesaj
     ve yedek indirme yolu devreye girmeli. İkisi karışırsa ya vazgeçen
     kullanıcı korkar ya da gerçek hata sessiz kalır. */
  ok('gerçek hata ayrı mesaj veriyor', /toast\(m\('shareFail'\)\+' \('\+\(e\.name\|\|''\)\+'\)'\)/.test(kod));
  ok('gerçek hatada yedek indirme devreye giriyor', /\/\/ yedek yol: Dosyalar'a indir/.test(kod));
  ok('paylaşım hiç desteklenmiyorsa da söyleniyor',
     /toast\(navigator\.share\? m\('noFileShare'\) : m\('noShare'\)\)/.test(kod));
  ok('shareFail iki dilde', (tel.match(/shareFail:'/g)||[]).length===2);
}
{
  /* İPTAL YEDEK İNDİRMEYİ TETİKLEMEMELİ: kullanıcı vazgeçtiyse dosyayı
     zorla indirmek istediğinin tersidir. Her iptal dalı `return` ile çıkmalı. */
  const iptaller=[...kod.matchAll(/e\.name==='AbortError'\)\{ shareCancelled\(\); ([^}]*)\}/g)]
    .map(m=>m[1]);
  ok('her iptal dalı bulundu ('+iptaller.length+')', iptaller.length===4);
  ok('her iptal dalı RETURN ile çıkıyor (zorla indirme yok)',
     iptaller.every(x=>/return;/.test(x)));
}

/* ---------- MAC TARAFI ---------- */
{
  const cagrilar=[...macKod.matchAll(/navigator\.share\(/g)].map(m=>m.index);
  ok('Mac tarafında paylaşım çağrısı bulundu ('+cagrilar.length+')', cagrilar.length===1);
  ok('Mac iptali ayırıyor', /e\.name==='AbortError'\)\{ toast\(/.test(macKod));
  ok('Mac artık iptalde SESSİZ kalmıyor', /Paylaşım iptal edildi/.test(macKod));
  ok('Mac mesajı da dosyanın durduğunu söylüyor', /dosya duruyor, tekrar deneyebilirsin/.test(macKod));
  ok('Mac iptalde de return ediyor (zorla indirme yok)',
     /AbortError'\)\{ toast\([^)]*\); return; \}/.test(macKod));
  /* Gerçek hata Mac tarafında da yedek indirmeye düşmeli. */
  ok('Mac gerçek hatada klasik indirmeye düşüyor', /\/\/ 2\) klasik indirme/.test(macKod));
}
{
  /* İki platform aynı şeyi söylüyor mu — kullanıcı ikisini de kullanıyor. */
  const telMsg=(kod.match(/'Paylaşım iptal edildi[^']*'/)||[''])[0];
  const macMsg=(macKod.match(/'Paylaşım iptal edildi[^']*'/)||[''])[0];
  ok('telefon mesajı okunabildi', telMsg.length>10);
  ok('iki platform aynı iptal mesajını veriyor', telMsg===macMsg);
}

/* ---------- KAMERA MEŞGULKEN GELEN AbortError KARIŞMAMALI ----------
   Aynı hata adı kamera açarken de geliyor ve orada BAŞKA bir anlamı var
   (cihaz meşgul). İki yolun mesajları ayrı kalmalı. */
ok('kamera tarafındaki AbortError ayrı ele alınıyor',
   /n==='NotReadableError'\|\|n==='AbortError'\)\s*toast\(m\('camBusy'\)\)/.test(kod));
ok('kamera mesajı paylaşım mesajından farklı',
   /camBusy:'/.test(tel) && !/camBusy:'[^']*iptal edildi/.test(tel));
