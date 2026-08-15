/* METİN ARAÇLARI — ORTAK ÇEKİRDEK.

   ÖLÇÜLDÜ (Tur 46): iki kabukta 93 aynı adlı fonksiyon var ama yalnız 14'ü
   birebir aynı; 32'si %85+ benzer, yani SÜRÜKLENMİŞ KOPYA. Sürüklenme burada
   teorik değil — `cleanText` iki kabukta FARKLI İŞ yapıyordu (%78 benzerlik):

     Mac      : U+2028/2029 satır ayırıcı · U+200B-200F/U+2060/FEFF görünmez
                karakter · U+202A-202E/U+2066-2069 bidi denetimi · yumuşak tire
     telefon  : bunların HİÇBİRİ

   Yani aynı "🧹 Temizle" düğmesi platforma göre başka sonuç veriyordu ve ASIL
   ÜRÜN olan telefon eksik olan taraftı. Görünmez karakterler sesle takip
   eşleşmesini sessizce bozar: kelime ekranda doğru görünür, tanıyıcı onu
   eşleştiremez, sufle durur ve kullanıcı sebebini göremez.

   Buradaki fonksiyonlar SAF: DOM'a, duruma ya da sözlüğe dokunmuyorlar.
   Taşınabilir olmalarının sebebi bu; taşınamayanlar (motor, işaretleme,
   çizim) kabukta kaldı ve gerekçesi yol haritasında yazılı. */

const KISALTMA=new Set(['vb','vs','vd','bkz','bk','örn','dr','doç','prof','yrd','av','sn','sy',
  'no','nu','tel','cad','sok','mah','apt','şb','müh','çev','ed','age','yy','mö','ms','tr','krş']);

function cleanText(t){
  return t.replace(/[\u2028\u2029]/g,'\n')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g,'')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g,'')
    .replace(/\u00AD/g,'')
    .replace(/\u00a0/g,' ')
    .replace(/[\u201c\u201d\u201e]/g,'"').replace(/[\u2018\u2019\u201a]/g,"'")
    .replace(/[ \t]+/g,' ')
    .split(/\r?\n/).map(l=>l.trim()).join('\n')
    .replace(/\n{3,}/g,'\n\n').replace(/ +([,.;:!?])/g,'$1').trim();
}

function joinLines(t){
  const out=[];
  t.split(/\r?\n/).forEach(line=>{
    const x=line.trim();
    if(!x){ out.push(''); return; }
    if(/^#{1,3}\s|^\[.*\]$/.test(x)){ out.push(x); return; }
    const prev=out[out.length-1];
    if(prev && prev!=='' && !/^#{1,3}\s|^\[.*\]$/.test(prev) && !/[.!?\u2026:;]$/.test(prev))
      out[out.length-1]=prev+' '+x;
    else out.push(x);
  });
  return out.join('\n');
}

function sentenceEnd(s){
  if(!/[.!?…:;]["')\]]?$/.test(s)) return false;
  const c=String(s).replace(/["')\]]$/,'');
  if(!c.endsWith('.')) return true;              // ! ? … : ; kesin bitirir
  const g=c.slice(0,-1);
  if(/^\d+$/.test(g)) return false;              // sıra sayısı: "3." "12."
  if(KISALTMA.has(g.toLocaleLowerCase('tr'))) return false;
  if(/^(\p{Lu}\.)+\p{Lu}$/u.test(g)) return false;   // T.C. · A.Ş. · M.Ö.
  return true;
}

function breathMarks(t){
  return t.split(/\r?\n/).map(line=>{
    const x=line.trim();
    if(!x||/^#{1,3}\s|^\[.*\]$/.test(x)) return line;
    if(/(^|\s)\/{1,2}(\s|$)/.test(x)) return line;          // zaten işaretli
    return x.replace(/([.!?\u2026])\s+(?=\S)/g,'$1 / ');
  }).join('\n');
}

function duzMetin(t){
  return (t||'')
    .replace(/^#{1,3}.*$/gm,'')            // bölüm başlıkları ayrı ele alınıyor
    .replace(/^\[.*\]$/gm,'')              // [yönerge] okunmaz
    .replace(/\{[^}]{1,24}\}/g,'')         // {telaffuz} ipucu — markup() ile AYNI sınır
    .replace(/\((?:\d+(?:[.,]\d+)?)s?\)/g,'')  // (2) bekleme
    .replace(/(^|\s)\/\/?(?=\s|$)/g,'$1')  // / ve // duraklama
    .replace(/\*/g,'')                     // *vurgu*
    .replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
