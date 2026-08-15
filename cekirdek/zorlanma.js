/* ZORLANMA HARİTASI — ORTAK ÇEKİRDEK.

   Soru: "senaryonun neresinde takılıyorum?" Cevap üç sinyalden çıkıyor ve
   üçü de ÜCRETSİZ — kullanıcı fazladan hiçbir şey yapmıyor:

     slow  sesle takip açıkken beklenenden yavaş okunan yer
     back  bir satırdan fazla GERİ sardığın yer (tekrar okumak zorunda kaldın)
     pause elle duraklattığın yer

   Prova raporunun (E.4) tamamlayıcısı: o "nasıl okudum" der, bu "nerede
   takıldım" der. Telefonda vardı, Mac'te yoktu (T47'de ölçüldü).

   Buradaki iki fonksiyon SAF: DOM'a, duruma ve sözlüğe dokunmuyorlar.
   Kabuğa özel olan şey sinyalin NEREDEN geldiği (telefonun `words`,
   Mac'in kendi kelime dizisi) — o yüzden kelime sayısı ve satır metni
   DIŞARIDAN veriliyor.

   Ağırlıklar: geri sarma ve yavaşlama, duraklamadan daha güçlü sinyal.
   Duraklama bilinçli bir tercih de olabilir (nefes, vurgu); geri sarmak
   ise neredeyse her zaman tökezlemektir. */

function zorlanmaIsaretle(harita, tur, idx, kelimeSayisi){
  /* Sınır dışı indeks SESSİZCE atılır: kayıt sırasında senaryo değişirse
     eski indeks başka kelimeyi gösterir ve harita yanlış yeri işaretlerdi. */
  if(!harita || idx == null || idx < 0) return false;
  if(kelimeSayisi != null && idx >= kelimeSayisi) return false;
  const k = String(idx);
  if(!harita[k]) harita[k] = {s:0, b:0, p:0};
  if(tur === 'slow') harita[k].s++;
  else if(tur === 'back') harita[k].b++;
  else harita[k].p++;
  return true;
}

/* `satirMetni(ln)` kabuktan gelir: telefonda `.ln` düğümleri, Mac'te kendi
   satır dizisi. Rapor SATIR bazında toplanıyor çünkü kullanıcı "37. kelimede
   takıldım" ile bir şey yapamaz; okuyacağı şey satırdır. */
function zorlanmaRaporu(harita, wordLine, satirMetni){
  const satirlar = {};
  for(const k of Object.keys(harita || {})){
    const i = +k, ln = (wordLine || [])[i];
    if(ln == null || ln < 0) continue;
    if(!satirlar[ln]) satirlar[ln] = {ln, s:0, b:0, p:0, idx:i};
    satirlar[ln].s += harita[k].s || 0;
    satirlar[ln].b += harita[k].b || 0;
    satirlar[ln].p += harita[k].p || 0;
  }
  return Object.values(satirlar).map(r => {
    r.total = r.s * 2 + r.b * 2 + r.p;
    const m = satirMetni ? satirMetni(r.ln) : '';
    r.text = String(m || '').trim().slice(0, 64);
    return r;
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
}
