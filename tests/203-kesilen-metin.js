const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {repoOku,esnek,macYolu,oku}=require('./kaynak');

/* KUTUSUNA SIĞMAYAN METİN — ÇİZİLMİŞ EKRAN NÖBETÇİSİ (2026-08-20).

   BULGU: masaüstünün durum çubuğundaki cihaz/yetenek satırı
   ("macOS · Chrome · MP4 ✓ · Kırpma ✓ · Sesle takip ✓ · Paylaşım ✓")
   üç noktayla kesiliyordu: 1440 pikselde 395 pikselin 377'si, 1100 pikselde
   yalnız 244'ü çiziliyordu. Satırın BÜTÜN VARLIK SEBEBİ o yetenekleri
   göstermek — kesilince kullanıcı "bu tarayıcıda sesle takip var mı"
   sorusunun cevabını hiç göremiyordu.

   Telefonda tam bu sınıf için bir kapı vardı (kırpılan kart özeti, mutlak 0);
   masaüstünde yoktu. Kapı genelleştirildi.

   ⚠️ ARACIN KENDİ KÖR NOKTASI DA ÖLÇÜLDÜ: ilk düzeltmem işe yaramadı.
   `#statusbar>span` seçicisi (kimlik + tür) `#sbDev`ten (yalnız kimlik)
   daha özgül olduğu için `white-space:normal` sessizce kaybetti; kırpma
   kalktı ama satır SARMAK yerine kutusunun DIŞINA taşıp komşusuna bindi.
   Yalnız "gizli taşma" arayan bir dedektör o düzeltmeyi BAŞARILI diye
   onaylıyordu. Bu yüzden iki sınıf da ölçülüyor: KESİK ve TAŞAN. */

const K=repoOku('kontrast.py','SUFLE_KONTRAST');
const E=repoOku('ekran.py','SUFLE_EKRAN');
const mac=esnek(oku(macYolu()));

/* ---------- 1) İKİ SINIF DA ÖLÇÜLÜYOR ---------- */
ok('çizilmiş ekran KESİK metni ölçüyor', /tur: 'kesik'/.test(K));
ok('çizilmiş ekran TAŞAN metni ölçüyor', /tur: 'taşan'/.test(K));
/* Taşma, metnin KENDİ çizim dikdörtgeniyle ölçülmeli: `scrollWidth`
   taşma görünürken kutuyu büyütmediği için o yolla ölçülemiyor. */
ok('taşma metnin çizim dikdörtgeniyle ölçülüyor',
   /createRange\(\)/.test(K) && /selectNodeContents/.test(K));
/* Yalnız YATAY kesik sayılıyor: dikeyde satır yüksekliği yuvarlamaları
   bir-iki piksel gürültü üretip dedektörü yalancı yapıyordu (ölçüldü). */
ok('kesik ölçümü yatayla sınırlı (dikey gürültü yalancı yapıyordu)',
   /el\.scrollWidth > el\.clientWidth \+ 1/.test(K));
/* MUTLAK KURAL, tabana göre değil: bir metnin varlık sebebi okunmasıdır. */
ok('kesilen metin MUTLAK kural (tabana bağlanmamış)',
   /kesik = sonu okunmuyor/.test(K) && !/~kesik'\)\s*\n\s*if eskiK/.test(K));
/* Kullanıcının kendi metni meşru olarak kısalır — muafiyet DAR olmalı. */
ok('kullanıcı metni muafiyeti dar ve adlandırılmış',
   /#scroller,#editor,#text,#prompt,\.scriptItem/.test(K));

/* ---------- 2) ÖLÇÜM ARACI BOZUK KOPYAYA YÖNLENDİRİLEBİLİYOR ----------
   Bir dedektörün ayırt ettiğini kanıtlamak için deponun KENDİ dosyasını
   bozmak gerekiyordu; kasıtlı bozma turunun tam kaçındığı şey. */
ok('çizilmiş ekran aracı telefon yolunu ortam değişkeninden alabiliyor',
   /_kabuk\('SUFLE_TELEFON'/.test(E));
ok('çizilmiş ekran aracı Mac yolunu ortam değişkeninden alabiliyor',
   /_kabuk\('SUFLE_MAC'/.test(E));
ok('verilen yol yoksa sessizce depoya DÜŞMÜYOR', /verilen yol yok/.test(E));

/* ---------- 3) MASAÜSTÜ YETENEK SATIRI KESİLMİYOR ----------
   İddia BİÇİM değil DAVRANIŞ: satır sarabilmeli ve kural özgüllük
   yarışını kaybetmemeli. İkisi de kullanıcı için farklı sonuç doğuruyor. */
ok('yetenek satırı sarabiliyor', /#sbDev\{[^}]*white-space:normal/.test(mac));
ok('yetenek satırı üç noktayla kesilmiyor',
   !/#sbDev\{[^}]*text-overflow:ellipsis/.test(mac));
/* ÖZGÜLLÜK: `#statusbar>span{white-space:nowrap}` kuralı var ve o daha
   özgül. Kuralın kazanması için seçicinin de kapsayıcıyı içermesi şart —
   bu satır olmadan düzeltme SESSİZCE etkisiz. */
ok('durum çubuğu satırları varsayılan olarak sarmıyor (kuralın rakibi duruyor)',
   /#statusbar>span[^{]*\{[^}]*white-space:nowrap/.test(mac));
ok('yetenek satırı kuralı özgüllük yarışını kazanıyor (kapsayıcıyla yazılmış)',
   /#statusbar>#sbDev\{/.test(mac));

/* ---------- 4) SATIRIN İÇERİĞİ HÂLÂ DEĞER TAŞIYOR ----------
   Kesilmeyi "metni kısaltarak" çözmek de bir yol olurdu; o zaman kapı
   yeşile döner ama kullanıcı yine bilgiyi kaybederdi. */
{
  const dl=mac.match(/function deviceLine\(\)\{[\s\S]*?\n  \}/);
  ok('cihaz satırı çıkarılabildi', !!dl);
  for(const k of ['MP4','mDevCrop','mDevVoice','mDevShare'])
    ok('yetenek satırı "'+k+'" bilgisini taşıyor', !!dl && dl[0].includes(k));
}
