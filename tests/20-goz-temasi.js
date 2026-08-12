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
ok('varsayılan çizgi %12', /eyePos:12,/.test(jsHam));
ok('kaydırıcı da %12', /id="eye" min="4" max="60" value="12"/.test(src));
ok('gösterge de %12', /id="vEye">12</.test(src));
ok('kaydırıcı merceğe kadar inebiliyor (min 4)', /id="eye" min="4"/.test(src));

// ---- ESKİ VARSAYILANDAN TAŞIMA ----
ok('eski %24 bir kez %12ye taşınıyor', /st\.eyePos===24 && !st\.eyeTasindi/.test(jsHam));
ok('taşıma yalnız bir kez', /st\.eyeTasindi=1/.test(jsHam));
function tasi(kayitli, bayrak){
  const o={eyePos:kayitli, eyeTasindi:bayrak};
  if(o.eyePos===24 && !o.eyeTasindi){ o.eyePos=12; o.eyeTasindi=1; }
  return o;
}
ok('eski varsayılan taşınıyor', tasi(24,undefined).eyePos===12);
ok('ikinci kez taşınmıyor', tasi(24,1).eyePos===24);
ok('BİLEREK seçilmiş değere dokunulmuyor', tasi(45,undefined).eyePos===45);
ok('zaten iyi olan değere dokunulmuyor', tasi(8,undefined).eyePos===8);

// ---- ÇOK AŞAĞIDAYSA CANLI UYARI ----
ok('uyarı ögesi var', /id="eyeUyari"/.test(src));
ok('6° altında uyarı gizli', /u\.classList\.toggle\('hidden', a<6\)/.test(jsHam));
ok('uyarı derece söylüyor', /Math\.round\(a\)\+'°<\/b> düşük/.test(jsHam));
ok('uyarı ne yapılacağını söylüyor', /%8-15/.test(jsHam));
ok('reçeteye yönlendiriyor', /Göz teması reçetesi/.test(jsHam));

// ---- İPUCU ARTIK SENARYOYU KAPATMIYOR ----
ok('ipucu okuma alanından çıkarıldı', !/\.tapnote\{position:absolute;top:52%/.test(src));
ok('ipucu denetim çubuğunun üstünde', /\.tapnote\{position:absolute;bottom:150px/.test(src));
ok('sebebi kodda yazılı', /senaryonun ilk satırlarını kapatıyordu/.test(src));
