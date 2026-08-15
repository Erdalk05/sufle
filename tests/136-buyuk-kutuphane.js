const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, macMetni}=require('./kaynak.js');

/* C.3 — BÜYÜK KÜTÜPHANE YÖNETİLEBİLİR OLSUN.

   C.3 (klasör/etiket) yine ERTELENDİ, ama bu kez ölçerek. Gerçek tarayıcıda,
   tohumlanmış kütüphanelerle:

     senaryo   depo      liste çizimi   liste yüksekliği
        10     8,2 KB       0,4 ms            711 px
        50    36,2 KB       0,8 ms          3.591 px
       200   141,5 KB       2,0 ms         14.391 px
       800   562,9 KB       7,4 ms         57.591 px

   Performans gerekçesi ÇÜRÜDÜ: 800 senaryo 7,4 ms'de çiziliyor ve arama
   anında sonuç veriyor. Klasör eklemek, kimsenin yaşamadığı bir sorun için
   herkese kalıcı bir seçim dayatmak olurdu — B fazında tam tersini yaptık.

   AMA ÖLÇÜM İKİ GERÇEK KUSUR BULDU, ikisi de kapatıldı:

   ① Telefonda arama VARDI ama ULAŞILAMIYORDU. 200 senaryoda sayfa 14.720 px
     kayıyor; dibe inince arama kutusu viewport'un 14.558 px yukarısında,
     ✕ kapat düğmesi de öyle. Kütüphaneyi yönetmenin iki aracı da tam
     gerektiği anda kayboluyordu.
   ② Mac'te senaryo araması HİÇ YOKTU. Sol panel 9.202 px kayıyor, aramasız
     tek yol tek tek gözle taramaktı. Telefonda olan yetenek Mac'te yok:
     bu deponun 5 numaralı teşhis kuralı (iki platformu karşılaştır).

   Ertelemenin gerekçesi ancak İKİ platformda da senaryo anında
   bulunabiliyorsa geçerli. Bu dosya onu kilitliyor. */

const tel = oku(telefonYolu());
const mac = macMetni();

/* ---------- ① TELEFON: KÜTÜPHANE ARAÇLARI KAYBOLMASIN ---------- */
{
  ok('telefonda senaryo araması var', /id="scriptFind"/.test(tel));

  /* Yapışkan başlık: arama VE kapat düğmesi listeyle birlikte kaymasın. */
  const bas = (tel.match(/#scHead\{[^}]*\}/) || [''])[0];
  ok('yapışkan başlık kuralı var', /position:\s*sticky/.test(bas));
  ok('başlık en üste yapışıyor', /top:\s*0/.test(bas));
  /* Saydam bırakılırsa altından kayan satırlar başlığın İÇİNDEN geçer —
     okunmaz bir üst üste binme. Zemin ŞART. */
  ok('yapışkan başlığın zemini var', /background:\s*var\(--/.test(bas));
  /* Yığılma bağlamı: liste satırları başlığın üstüne binmesin. */
  ok('başlık listenin üstünde çiziliyor (z-index)', /z-index:\s*[1-9]/.test(bas));

  /* İÇERİK: başlık bloğu, kaybolan İKİ aracı da taşımalı. Yalnız <h2> sarmak
     aramayı yine kaybettirirdi. */
  /* İÇ İÇE </div> TUZAĞI: `[\s\S]*?\n  </div>` bloğu İLK iç kapanışta
     kesiyordu (#secWrap'inkinde) ve arama kutusu blok dışında görünüyordu —
     kod doğruyken test yanlış diyordu. Sınır, bloğun hemen ardından gelen
     listeye demirlendi. */
  const bas0 = tel.indexOf('<div id="scHead">');
  const bas1 = tel.indexOf('id="scriptList"', bas0);
  const govde = bas0 >= 0 && bas1 > bas0 ? tel.slice(bas0, bas1) : '';
  ok('başlık bloğu ayrılabildi (ölçmeyen kapı değil)', govde.length > 200);
  ok('kapat düğmesi yapışkan blokta', /id="scriptsX"/.test(govde));
  ok('arama kutusu yapışkan blokta', /id="scriptFind"/.test(govde));
  /* Liste blokta OLMAMALI: içerideyse yapışkanlık anlamsız olur. */
  ok('liste yapışkan blokta DEĞİL', !/id="scriptList"/.test(govde));
}

/* ---------- ② MAC: ARAMA VAR VE ÖLÜ DEĞİL ---------- */
{
  ok('Macte senaryo araması var', /id="scriptFind"/.test(mac));
  ok('Macte arama kutusu çeviriye bağlı', /id="scriptFind"[^>]*data-i18n-ph="findPh"/.test(mac));

  /* Kutu ölü olmasın: bir olaya bağlı olmalı ve listeyi yeniden çizmeli. */
  ok('arama kutusu bir olaya bağlı', /\$\('#scriptFind'\)\.oninput\s*=/.test(mac));
  ok('arama listeyi yeniden çiziyor',
     /\$\('#scriptFind'\)\.oninput\s*=\s*\(\)\s*=>\s*renderScripts\(\)/.test(mac));

  /* Aynı tuzağın fonksiyon hâli: `\n  }` içteki forEach'in kapanışına
     çarpıyordu. Sınır, hemen ardından gelen fonksiyona demirlendi. */
  const rs0 = mac.indexOf('function renderScripts()');
  const rs1 = mac.indexOf('function selectScript', rs0);
  const rs = rs0 >= 0 && rs1 > rs0 ? mac.slice(rs0, rs1) : '';
  ok('Mac renderScripts çıkarılabildi (ölçmeyen kapı değil)', rs.length > 300);
  ok('çizim arama kutusunu OKUYOR', /#scriptFind/.test(rs));
  /* Türkçe katlama telefondakiyle aynı kural olmalı: "urun" yazan "Ürün"ü
     bulmalı. Düz toLowerCase kullanmak Türk kullanıcıda sessizce başarısız
     olur — bu hata sınıfı başka projelerde de çıktı. */
  ok('arama Türkçe katlama (norm) kullanıyor', /norm\(/.test(rs));
  ok('başlıkta VE metinde aranıyor',
     /norm\(s\.title[^)]*\)\)?\.includes\(q\)/.test(rs) && /norm\(s\.text[^)]*\)\)?\.includes\(q\)/.test(rs));
  /* Sonuç yoksa boş liste değil, SEBEP yazılmalı: boş ekran "bozuldu" gibi
     okunuyor. */
  /* macMetni() anahtarı KULLANICININ GÖRDÜĞÜ metne çözüyor (A.2c), yani
     burada 'scNoHit' değil cümlenin kendisi aranır — iddia zaten ekranda
     ne yazdığına bakmalı. */
  ok('eşleşme yoksa sebep söyleniyor', /Eşleşen senaryo yok/.test(rs));

  /* Kutu listeye ORANTILI: kısa listede fazladan alan açmasın. */
  ok('kutu yalnız liste uzunken görünüyor', /classList\.toggle\('hidden'/.test(rs));
  const esik = (rs.match(/state\.scripts\.length\s*>=\s*(\d+)/) || [])[1];
  ok('eşik makul (bulunan: ' + esik + ')', +esik >= 8 && +esik <= 30);
  /* Kutu gizlenirken içi de temizlenmeli: gizli bir süzgeç, kullanıcının
     senaryolarını görünmez yapar ve sebebi ekranda yazmaz — ölü ayarın en
     zararlı hâli. */
  ok('kutu gizlenince süzgeç de temizleniyor', /if\(!uzun\)\s*kutu\.value=''/.test(rs));
}

/* ---------- İKİ PLATFORM DA ARAYABİLİYOR ---------- */
{
  /* Asıl iddia bu: C.3 ertelenebilir ÇÜNKÜ her iki kabukta da senaryo
     anında bulunuyor. Biri kaybolursa erteleme gerekçesi çöker. */
  ok('senaryo araması İKİ kabukta da var',
     /id="scriptFind"/.test(tel) && /id="scriptFind"/.test(mac));
  /* Aynı çeviri anahtarı: iki kabuk aynı sözü versin. */
  ok('iki kabukta da aynı yer tutucu anahtarı', /findPh/.test(tel) && /findPh/.test(mac));
}
