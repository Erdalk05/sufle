const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), os=require('os'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
/* Bozma turu geçici kopyayı ölçmeli: yolu env'den al, yoksa depodakini kullan. */
const denetimPy=(()=>{
  const acik=process.env.SUFLE_DENETIM;
  if(acik && !fs.existsSync(acik)) throw new Error('Verilen denetim.py yolu yok: '+acik);
  return acik || path.join(REPO,'denetim.py');
})();

/* YOL TARİFİ DEDEKTÖRÜ (2026-08-18).
   Bu depo AYNI SINIFA üç kez düştü: depo dolunca yanlış bölüm tarif edildi ·
   kamera izni reddedilince Android'de olmayan "Safari" tarif edildi · v9.31'de
   rozet var olmayan bir hareketi tarif etti. Ortak nokta: METİN BİR VAAT
   EDİYOR, arayüz onu tutmuyor. Dedektör kendi arayüzümüze ait `A → B → C`
   zincirlerinin her parçasının gerçek bir etiket olduğunu ölçüyor.

   BU TEST DEDEKTÖRÜ KOŞTURUYOR — şeklini okumuyor. Kaynağı grep'lemek,
   dedektörün ÇALIŞTIĞINI değil YAZILDIĞINI kanıtlar; bu deponun kopya-test
   tuzağı tam olarak budur. */

const kos=(html)=>{
  const f=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'sufle-yol-')),'index.html');
  fs.writeFileSync(f,html);
  try{ execFileSync('python3',[denetimPy,f],{cwd:REPO,encoding:'utf8'}); return ''; }
  catch(e){ return String(e.stdout||'')+String(e.stderr||''); }
};

/* En küçük sentetik kabuk: iki sözlük + bir mesaj. Gerçek dosyayı kopyalamıyoruz,
   çünkü o zaman test ürünün BAŞKA kusurlarına da kırılırdı. */
const kabuk=(mesaj)=>`<!doctype html><body><div id="a"></div>
<script>
const I18N={tr:{tabCam:'Kamera',tabMore:'Diğer',gKompozit:'Kompozit ve yeşil ekran',devBtn:'Cihaz uyumluluğu',settings:'Ayarlar',bSes:'Ses'},
 en:{tabCam:'Camera',tabMore:'More',gKompozit:'Composite and green screen',devBtn:'Device compatibility',settings:'Settings',bSes:'Audio'}};
const MSG={tr:{uyari:'${mesaj}'},en:{uyari:'x'}};
</script></body>`;

const iyi=kos(kabuk('Ayarlar → Kamera → Kompozit ve yeşil ekran'));
ok('gerçek yol tarifi temiz geçiyor', !/yere gönderiyor/.test(iyi));

const kotu=kos(kabuk('Ayarlar → Yardım → Tanılama Paneli'));
ok('var olmayan bölüm YAKALANIYOR', /yere gönderiyor/.test(kotu));
ok('yakalanan parça raporda adıyla yazıyor', /Yardım/.test(kotu));

// Tek kelimelik kısa önek istismarı: "Ses Ayarları" diye bir bölüm yok ama
// "Ses" gerçek bir bölüm adı. İlk yazışta bu tarif geçip gidiyordu.
const kotu2=kos(kabuk('Ayarlar → Ses Ayarları'));
ok('gerçek bir kelimeyle başlayan SAHTE bölüm de yakalanıyor', /yere gönderiyor/.test(kotu2));

// İşletim sistemi tarifleri KAPSAM DIŞI: doğruluğunu bu depo bilemez.
const dis=kos(kabuk('Ayarlar → Safari → Mikrofon izni ver'));
ok('işletim sistemi tarifi yanlış alarm vermiyor', !/yere gönderiyor/.test(dis));

// Biçim etiketi tarifin parçasını bölmemeli.
const bicimli=kos(kabuk('Ayarlar → Kamera → <b>Kompozit ve yeşil ekran</b> açık olsun'));
ok('kalın yazı tarifi bölmüyor', !/yere gönderiyor/.test(bicimli));

// Etiketin kısaltılmış hâli kabul edilmeli (gerçek etiket parantezli olabilir).
const kisa=kos(kabuk('Ayarlar → Diğer → Cihaz uyumluluğu panelini aç'));
ok('etiketin kısaltılmış hâli kabul ediliyor', !/yere gönderiyor/.test(kisa));

// Kendi köküyle başlamayan tarifler kapsam dışı (başka uygulamanın yolu).
const yabanci=kos(kabuk('Fotoğraflar → Albümler → Son eklenenler'));
ok('bizim olmayan yol tarifi kapsam dışı', !/yere gönderiyor/.test(yabanci));

/* ÜRÜNÜN KENDİSİ DE ÖLÇÜLMELİ. Yalnız sentetik girdiyle sınamak, dedektörün
   ÇALIŞTIĞINI kanıtlar ama ÜRÜNÜN TEMİZ olduğunu kanıtlamaz — ve asıl
   koruduğumuz şey bu. Yol `kaynak.js`ten geliyor, yani bozma turunda geçici
   kopya ölçülüyor. */
const {telefonYolu}=require('./kaynak.js');
const gercek=(()=>{
  try{ execFileSync('python3',[denetimPy,telefonYolu()],{cwd:REPO,encoding:'utf8'}); return ''; }
  catch(e){ return String(e.stdout||'')+String(e.stderr||''); }
})();
ok('ürünün kendi yol tarifleri gerçek yerleri gösteriyor', !/yere gönderiyor/.test(gercek));

// Ürünün kendisi temiz olmalı — dedektörün asıl işi bu.
const src=fs.readFileSync(denetimPy,'utf8');
ok('dedektör kapsam sınırını yazılı olarak taşıyor', /DIS_DUNYA/.test(src) && /KOKLER/.test(src));
ok('dedektör pencere değil tam dize okuyor', /PENCERE DEĞİL TAM DİZE/.test(src));
