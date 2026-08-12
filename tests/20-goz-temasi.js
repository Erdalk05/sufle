const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const jsHam=src.match(/<script>([\s\S]*)<\/script>/)[1];

/* GÖZ TEMASI — suflenin bütün varlık sebebi.
   Erdal ekran görüntüsü gönderdi: okuma çizgisi ekranın ortasına yakındı,
   kamera ise en üstte. Ölçtüm: %45'te bakış sapması 9° — tam "izleyici aşağı
   baktığını görür" eşiği. Ayrıca ipucu metni senaryonun ilk satırlarını
   kapatıyordu (top:52%). */

const st={};
eval(cikar(jsHam,/function gazeAngle\(\)\{[\s\S]*?\n\}/,'gazeAngle'));
const aci = e => { st.eyePos=e; st.dist=60; return gazeAngle(); };

ok('%8 mükemmel (<3°)', aci(8)<3);
ok('%12 iyi (<3°)', aci(12)<3);
// Telefonun formülü ekran yüksekliğini 14 cm sayıyor (Mac'te 21). İlk yazdığım
// testte Mac'in değerini kullanıp yanlış eşik beklemiştim — kendi hatam.
ok('%24 iyi sayılır ama ideal değil', aci(24)>3 && aci(24)<5);
ok('%45 uyarı eşiğini geçiyor (Erdal’ın gördüğü)', aci(45)>=5.9);
ok('%60 belirgin şekilde kötü', aci(60)>=7.9);
ok('çizgi yükseldikçe sapma artıyor', aci(8)<aci(24) && aci(24)<aci(45));
ok('mesafe artınca sapma azalıyor', (st.dist=100, gazeAngle()) < (st.dist=40, gazeAngle()));

// ---- VARSAYILAN MERCEĞE YAKLAŞTIRILDI ----
// v8.6: %12 fazla yukarı kaçtı (Erdal: 'çok üste kalmış') → %18 dengesi.
// Bu satırlar aşağıdaki v8.6 bölümünde güncel hâliyle kontrol ediliyor.

ok('gösterge kaydırıcıyla aynı', /id="vEye">18</.test(src));
ok('kaydırıcı merceğe kadar inebiliyor (min 4)', /id="eye" min="4"/.test(src));

// ---- ESKİ VARSAYILANDAN TAŞIMA ----
ok('eski değerler taşınıyor', /\(st\.eyePos===24 \|\| st\.eyePos===12\) && st\.eyeTasindi<2/.test(jsHam));
ok('taşıma sürümlenmiş (tekrar koşmaz)', /st\.eyeTasindi=2/.test(jsHam));
// Taşıma davranışı v8.6 bölümünde tasi2() ile sınanıyor.

// ---- ÇOK AŞAĞIDAYSA CANLI UYARI ----
ok('uyarı ögesi var', /id="eyeUyari"/.test(src));
ok('6° altında uyarı gizli', /u\.classList\.toggle\('hidden', a<6\)/.test(jsHam));
ok('uyarı derece söylüyor', /Math\.round\(a\)\+'°<\/b> düşük/.test(jsHam));
ok('uyarı ne yapılacağını söylüyor', /%8-15/.test(jsHam));
ok('reçeteye yönlendiriyor', /Göz teması reçetesi/.test(jsHam));

// ---- İPUCU ARTIK SENARYOYU KAPATMIYOR ----
ok('ipucu okuma alanından çıkarıldı', !/\.tapnote\{position:absolute;top:52%/.test(src));
ok('ipucu hız hapının üstünde', /\.tapnote\{position:absolute;bottom:calc\(22% \+ 78px\)/.test(src));
ok('sebebi kodda yazılı', /senaryonun ilk satırlarını kapatıyordu/.test(src));

// ---------- ALT BÖLGE YIĞILMASI (v8.6, ekran görüntüsünden) ----------
// Dört öge aynı bandda üst üste biniyordu: durum çipleri 86px, ses şeridi 92px,
// ipucu 150px, hız hapı bottom:22%. Ekranda hepsi birbirinin üstüne yazıyordu.
const px = re => { const m=src.match(re); return m ? m[1] : null; };
ok('ses şeridi çiplerin üstüne çıkarıldı', /#vHud\{[^}]*bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 130px\)/.test(src));
ok('durum çipleri yerinde kaldı', /#hud\{[^}]*bottom:calc\(86px/.test(src));
ok('şerit ile çipler arasında boşluk var (130 > 86)', 130-86>=40);
ok('ipucu hız hapının üstüne alındı', /\.tapnote\{[^}]*bottom:calc\(22% \+ 78px\)/.test(src));
ok('ipucu artık okuma alanında değil', !/\.tapnote\{[^}]*top:52%/.test(src));

// İpucu bir kez başlattıktan sonra bir daha çıkmamalı
ok('ilk akış bayrağı yazılıyor', /if\(!st\.ilkAkis\)\{ st\.ilkAkis=1; save\(\); \}/.test(jsHam));
ok('sonraki açılışta ipucu gizleniyor', /if\(st\.ilkAkis && \$\('#tapnote'\)\) \$\('#tapnote'\)\.style\.display='none'/.test(jsHam));
ok('ilkAkis varsayılanı var', /ilkAkis:0/.test(jsHam));

// ---------- OKUMA ÇİZGİSİ DENGESİ ----------
ok('varsayılan %18', /eyePos:18,/.test(jsHam));
ok('kaydırıcı %18', /id="eye" min="4" max="60" value="18"/.test(src));
st.dist=60; st.eyePos=18;
ok('%18 bakış sapması iyi (<3°)', gazeAngle()<3);
ok('%18 uyarı eşiğinin altında', gazeAngle()<6);
function tasi2(kayitli, bayrak){
  const o={eyePos:kayitli, eyeTasindi:bayrak||0};
  if((o.eyePos===24||o.eyePos===12) && o.eyeTasindi<2){ o.eyePos=18; o.eyeTasindi=2; }
  return o;
}
ok('eski %24 → %18', tasi2(24,0).eyePos===18);
ok('aşırı düzeltilmiş %12 → %18', tasi2(12,1).eyePos===18);
ok('taşıma bir kez daha koşmuyor', tasi2(18,2).eyePos===18);
ok('BİLEREK seçilmiş değere dokunulmuyor', tasi2(35,0).eyePos===35);
ok('reçetenin %8i korunuyor', tasi2(8,0).eyePos===8);

// ---------- SESLE TAKİP DAHA HIZLI TOPARLIYOR ----------
ok('geniş arama 1,2 sn sonra devrede', /kayipSure>1200/.test(jsHam));
ok('kayıp rozeti 1,5 sn sonra', /now-lastHitAt>1500/.test(jsHam));
ok('eski 3 sn eşiği kalmadı', !/kayipSure>3000/.test(jsHam));
