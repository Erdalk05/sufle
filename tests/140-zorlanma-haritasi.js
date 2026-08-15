const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, macMetni, cikar, REPO}=require('./kaynak.js');

/* A.4 — ZORLANMA HARİTASI, İKİ PLATFORMDA.

   T47'de ölçüldü: telefonda CANLI bir özellik (`#diffBtn` → `renderDiff`),
   Mac'te HİÇ YOK. Prova raporunun (E.4) tamamlayıcısı — o "nasıl okudum"
   der, bu "nerede takıldım" der.

   TARAYICIDA GERÇEK OLAYLARLA DOĞRULANDI (Tur 48, Mac, CDP tuş olayları):
     Boşluk ile elle duraklat -> depoda {"10":{p:1}}
     ArrowLeft ×2 (geri sar)  -> {"10":{b:1,p:1},"11":{b:1}}
     kutu                     -> satır metni + "geri 2 · durak 1"
     sıfırla                  -> depo {}, kutu sebebini söylüyor

   ÜÇ SİNYALİN ÜÇÜ DE ÜCRETSİZ: kullanıcı fazladan hiçbir şey yapmıyor.
   Mac'te sesle yavaşlama kancası T47'de ölçülüp YOK bulunmuştu; bu turda
   eklendi (telefondaki eşiklerin aynısı). */

const tel = oku(telefonYolu());
const mac = macMetni();

/* ---------- HESAP ORTAK ÇEKİRDEKTE ---------- */
{
  const acik = process.env.SUFLE_ZORLANMA;
  if (acik && !fs.existsSync(acik)) throw new Error('Verilen yol yok: ' + acik);
  const yol = acik || path.join(REPO, 'cekirdek', 'zorlanma.js');
  ok('zorlanma çekirdeği depoda', fs.existsSync(yol));
  ok('telefon çekirdeği gömüyor', /==CEKIRDEK:zorlanma\.js==/.test(tel));
  ok('Mac de aynı çekirdeği gömüyor', /==CEKIRDEK:zorlanma\.js==/.test(mac));

  const api = new Function(fs.readFileSync(yol, 'utf8') +
    '\n return {zorlanmaIsaretle, zorlanmaRaporu};')();

  /* Sayım: üç tür ayrı sayılmalı, yoksa "yavaşladım" ile "geri sardım"
     ayırt edilemez ve kullanıcı ne yapacağını bilemez. */
  const h = {};
  api.zorlanmaIsaretle(h, 'slow', 5, 20);
  api.zorlanmaIsaretle(h, 'slow', 5, 20);
  api.zorlanmaIsaretle(h, 'back', 5, 20);
  api.zorlanmaIsaretle(h, 'pause', 12, 20);
  ok('yavaşlama sayıldı', h['5'].s === 2);
  ok('geri sarma ayrı sayıldı', h['5'].b === 1);
  ok('duraklama ayrı sayıldı', h['12'].p === 1);

  /* SINIR DIŞI İNDEKS SESSİZCE ATILIR: kayıt sırasında senaryo değişirse
     eski indeks başka kelimeyi gösterir ve harita YANLIŞ yeri işaretlerdi. */
  ok('sınır üstü indeks reddediliyor', api.zorlanmaIsaretle(h, 'slow', 99, 20) === false);
  ok('negatif indeks reddediliyor', api.zorlanmaIsaretle(h, 'slow', -1, 20) === false);
  ok('boş indeks reddediliyor', api.zorlanmaIsaretle(h, 'slow', null, 20) === false);
  ok('reddedilen işaret haritayı KİRLETMİYOR', h['99'] === undefined && h['-1'] === undefined);

  /* Rapor SATIR bazında: kullanıcı "37. kelimede takıldım" ile bir şey
     yapamaz, okuyacağı şey satırdır. */
  const wordLine = [0,0,0,0,0, 1,1,1,1,1,1,1, 2];
  const rapor = api.zorlanmaRaporu(h, wordLine, ln => ['ilk','ikinci','üçüncü'][ln]);
  ok('rapor satır bazında toplandı', rapor.length === 2);
  ok('satır metni raporda', rapor[0].text === 'ikinci');
  /* Ağırlık: geri sarma ve yavaşlama duraklamadan güçlü sinyal — duraklama
     bilinçli olabilir (nefes, vurgu), geri sarmak neredeyse hep tökezlemedir. */
  ok('en çok zorlanılan satır başta', rapor[0].ln === 1 && rapor[0].total > rapor[1].total);
  ok('ağırlık doğru (2 yavaş + 1 geri = 6)', rapor[0].total === 6);
  /* Satırı olmayan işaret sessizce atılmalı, çökmemeli. */
  ok('satırsız işaret raporu bozmuyor',
     api.zorlanmaRaporu({'50':{s:1,b:0,p:0}}, wordLine, () => 'x').length === 0);
  ok('boş harita boş rapor', api.zorlanmaRaporu({}, wordLine, () => 'x').length === 0);
}

/* ---------- TELEFON ÇEKİRDEĞE BAĞLI MI ---------- */
{
  /* Telefonda kendi kopyası kalsaydı Mac'e taşınan sürümle zamanla ayrışırdı
     — `cleanText` vakasının (T46) birebir tekrarı olurdu. */
  ok('telefon işaretlemeyi çekirdekten yapıyor',
     /zorlanmaIsaretle\(diffMap\(\), kind, idx, words\.length\)/.test(tel));
  ok('telefon raporu çekirdekten alıyor',
     /zorlanmaRaporu\(diffMap\(\), wordLine,/.test(tel));
  ok('telefonda yerel kopya kalmadı',
     !/byLine\[ln\]=\{ln:0|r\.total=r\.s\*2\+r\.b\*2\+r\.p/.test(tel));
  ok('telefonda gösterim düğmesi duruyor', /id="diffBtn"/.test(tel));
}

/* ---------- MAC: ÜÇ SİNYAL DE BAĞLI MI ---------- */
{
  ok('Macte harita deposu senaryoya ait', /function macZorlanma\(\)\{/.test(mac) && /sc\.diff=\{\}/.test(mac));
  ok('Macte işaretleyici var', /function macMarkDiff\(tur, idx\)\{/.test(mac));
  ok('Macte rapor üreticisi var', /function macZorlanmaRapor\(\)\{/.test(mac));

  /* ① ELLE DURAKLATMA — yalnız KULLANICI yolundan. `stop()` metin bitince ve
     kayıt kapanınca da çağrılıyor; oraya konsaydı her çekim "zorlandım"
     sayılırdı. */
  ok('duraklatma sinyali togglePlay içinde',
     /if\(running\)\{ macMarkDiff\('pause', activeIdx\); stop\(\); return; \}/.test(mac));
  const stopGovde = cikar(mac, /function stop\(\)\{[\s\S]*?\n  \}/, 'Mac stop');
  ok('stop() içine KONMADI (her çekimi zorlanma sayardı)', !/macMarkDiff/.test(stopGovde));

  /* ② GERİ SARMA — yalnız geri. İleri atlamak bilinçli bir tercihtir. */
  ok('geri sarma sinyali jumpLine içinde', /if\(dir<0\) macMarkDiff\('back', activeIdx\);/.test(mac));

  /* ③ SESLE YAVAŞLAMA — T47'de Mac'te YOK bulunan kanca. Telefondaki
     eşiklerin aynısı: <0,35 sn gürültü, >6 kelime atlama. */
  ok('Macte yavaşlama kancası eklendi', /vPrevMac/.test(mac));
  ok('yavaşlama eşiği telefonla aynı',
     /dts>0\.35 && dw<=6 && \(dw\/dts\*60\) < state\.speed\*0\.6/.test(mac));
  const telEsik = /dts>0\.35 && dw<=6 && \(dw\/dts\*60\) < st\.wpm\*0\.6/.test(tel);
  ok('telefondaki eşik de aynı (iki platform aynı şeyi ölçüyor)', telEsik);
}

/* ---------- MAC ARAYÜZÜ ÖLÜ DEĞİL Mİ ---------- */
{
  ok('Macte harita kutusu var', /id="macDiffOut"/.test(mac));
  ok('Macte sıfırlama düğmesi var', /id="macDiffClear"/.test(mac));
  ok('sıfırlama bir olaya bağlı', /\$\('#macDiffClear'\)\.onclick=/.test(mac));
  ok('sıfırlama gerçekten siliyor', /sc\.diff=\{\}; save\(\); macDiffCiz\(\)/.test(mac));

  /* ÇİZİM İŞARETLEMEYE BAĞLI OLMALI. İlk hâlinde harita doluyordu ama kutu
     boş kalıyordu: çizim yalnız açılışta çağrılıyordu, yani kullanıcı biriken
     işaretleri HİÇ göremiyordu. Tarayıcıda yakalandı. */
  /* `[^)]*` iç içe parantezi geçemiyordu (`macZorlanma()` içeride) — desen
     kod doğruyken kırmızı veriyordu. */
  ok('her işaretten sonra çizim tazeleniyor',
     /if\(zorlanmaIsaretle\([\s\S]*?\)\)\{ save\(\); macDiffCiz\(\); \}/.test(mac));
  /* Harita SENARYOYA ait: senaryo değişince yeniden çizilmeli, yoksa önceki
     senaryonun satırları görünmeye devam eder. */
  /* Çıpa FONKSİYON TANIMI olmalı: ilk `selectScript` ANMASI çağrı yerinde ve
     oradan 400 karakter tanıma bile ulaşmıyordu. */
  ok('senaryo değişince yeniden çiziliyor',
     /function selectScript\(id\)\{[\s\S]*?macDiffCiz\(\)/.test(mac));
  /* Boş durumda SEBEP yazılmalı: boş kutu "bozuldu" gibi okunur. */
  ok('boşken sebebi söyleniyor', /mDiffEmpty/.test(mac));
  /* Üç sayaç da ekranda ayrı görünmeli. */
  for (const k of ['mDiffSlow', 'mDiffBack', 'mDiffPause'])
    ok('sayaç etiketi çeviriye bağlı: ' + k, new RegExp(k).test(mac));
}
