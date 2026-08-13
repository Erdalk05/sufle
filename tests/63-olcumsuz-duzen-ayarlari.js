const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* KALINLIK VE HARF ARALIĞI HİÇ ÖLÇÜM YAPMIYORDU
   A4/A5 turunda düzeltilen yollar en azından measure() çağırıyordu. Bu ikisi
   HİÇBİR ŞEY çağırmıyordu: `bind('#weight','weight'); bind('#ls','ls');` —
   geri arama yok.

   Oysa #scroller hem `font-weight:var(--weight)` hem `letter-spacing:var(--ls)`
   kullanıyor ve `word-wrap:break-word` ile sarıyor: ikisi de satır sarmasını
   değiştiriyor. Üç sonuç birden doğuyordu:

     · wordTops bayat   → vurgu yanlış satırda beliriyor
     · maxPos bayat     → harf aralığı artınca metin uzuyor, sınır eski kalıyor:
                          sufle metnin SONUNA HİÇ ULAŞMIYOR ve son satırlar
                          okunmadan akış bitiyor. A4'te "maxPos güncelleniyor mu"
                          diye sorulmuştu; kaydırıcılarda cevap evetti, BURADA
                          hayırdı.
     · pxPerWord bayat  → wpm tabanlı akış hızı yanlış hesaplanıyor

   Biyonik okuma da kelime başlarını kalınlaştırıp sarmayı değiştiriyor;
   buildContent ölçüyor (maxPos doğru) ama okunan kelime kayıyordu. */

/* ---------- ARTIK ÖLÇÜLÜYOR ---------- */
ok('kalınlık değişince kelime korunuyor',
   /bind\('#weight','weight',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/.test(kod));
ok('harf aralığı değişince kelime korunuyor',
   /bind\('#ls','ls',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/.test(kod));
ok('geri aramasız eski bağlama kalmadı',
   !/bind\('#weight','weight'\);/.test(kod) && !/bind\('#ls','ls'\);/.test(kod));

/* ---------- DÜZENİ ETKİLEMEYENLERE DOKUNULMADI ----------
   Perde koyuluğu bir renk katmanı, hedef süre yalnız bir sayı: ikisi de satır
   sarmasını değiştirmiyor. Her ayara aynı çekici vurmak yanlış olurdu. */
ok('perde koyuluğu hâlâ sade bağlanıyor', /bind\('#scrimSl','scrim'\);/.test(kod));
ok('hedef süre hâlâ sade bağlanıyor', /bind\('#target','target'\);/.test(kod));

/* ---------- GEREKÇE: BU İKİSİ GERÇEKTEN SARMAYI DEĞİŞTİRİYOR ----------
   Düzeltmenin dayanağı CSS. Kural kalkarsa gerekçe de değişir. */
ok('sufle kalınlığı --weight ile alıyor', /font-weight:var\(--weight\)/.test(tel));
ok('sufle harf aralığını --ls ile alıyor', /letter-spacing:var\(--ls\)/.test(tel));
ok('sufle metni sarıyor (sabit satır değil)', /word-wrap:break-word/.test(tel));
ok('kalınlık ayarı gerçekten --weight yazıyor', /setProperty\('--weight',String\(st\.weight\)\)/.test(kod));
ok('harf aralığı ayarı gerçekten --ls yazıyor', /setProperty\('--ls',st\.ls\+'px'\)/.test(kod));

/* ---------- BAYAT maxPos NE YAPAR: SAYIYLA ----------
   Harf aralığı artınca satır sayısı artar. Eski maxPos ile akış erken biter ve
   son kelimeler okuma çizgisine HİÇ gelmez. */
{
  const EYE=200, N=300, LH=60;
  const tops=(kelimePerSatir)=>Array.from({length:N},(_,i)=>EYE+Math.floor(i/kelimePerSatir)*LH+LH/2);
  const DAR=tops(8), GENIS=tops(6);          // harf aralığı arttı: satırda 8 → 6 kelime
  const maxPosEski=DAR[N-1]-EYE, maxPosYeni=GENIS[N-1]-EYE;
  ok('harf aralığı artınca metin uzuyor (maxPos büyümeli)', maxPosYeni > maxPosEski);
  /* Eski sınırla akış durduğunda son kelime çizgiye gelmiş mi? */
  const sonKelimeY = GENIS[N-1];
  ok('bayat maxPos ile son kelime okuma çizgisine ULAŞMIYOR',
     maxPosEski + EYE < sonKelimeY);
  const kacKelime = GENIS.filter(y => y > maxPosEski + EYE).length;
  ok('bayat maxPos ile okunmadan kalan kelime var ('+kacKelime+' kelime)', kacKelime > 0);
}

/* ---------- BİYONİK OKUMA ---------- */
const sw=cikar(kod,/\$\$\('\.sw'\)\.forEach\(s=>s\.onclick=async\(\)=>\{[\s\S]*?\n\}\);/,'anahtarlar');
const biy=cikar(sw,/if\(k==='bionic'\)\{[\s\S]*?\n  \}/,'biyonik dalı');
ok('biyonik açılınca içerik yeniden kuruluyor', /buildContent\(\);/.test(biy));
ok('biyonik açılınca okunan kelime saklanıyor', /activeIdx>=0 \? activeIdx : yakinIdx\(pos\+eyeOff\(\)\)/.test(biy));
ok('biyonik sonrası kelime okuma çizgisine getiriliyor',
   /setPos\(Math\.max\(0, Math\.min\(maxPos, wordTops\[i\]-eyeOff\(\)\)\)\)/.test(biy));
ok('kelime indeksi yeniden kurmadan ÖNCE alınıyor',
   biy.indexOf('yakinIdx(pos+eyeOff())') < biy.indexOf('buildContent()'));
/* buildContent zaten ölçüyor; maxPos orada doğruydu, eksik olan konumdu. */
ok('buildContent hâlâ kendisi ölçüyor',
   /measure\(\); updateStats\(\); renderSections\(\);/.test(cikar(kod,/function buildContent\(\)\{[\s\S]*?\n\}/,'buildContent')));

/* ---------- A4/A5 DÜZELTMELERİ DURUYOR ---------- */
for(const [ad,re] of [
  ['yazı boyutu', /bind\('#fs','fs',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/],
  ['satır aralığı', /bind\('#lh','lh',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/],
  ['kenar boşluğu', /bind\('#mg','mg',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/],
  ['okuma çizgisi', /bind\('#eye','eyePos',\(\)=>requestAnimationFrame\(yenidenOlc\)\)/],
  ['döndürme', /orientationchange',\(\)=>setTimeout\(yenidenOlc,320\)/],
]) ok(ad+' korumasi duruyor', re.test(kod));
