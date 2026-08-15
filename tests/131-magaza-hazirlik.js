const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, REPO}=require('./kaynak.js');

/* F.4 — MAĞAZA HAZIRLIĞI: manifest + gizlilik.

   Gizlilik metni mağazaların zorunlu şartı, AMA asıl sebep bu değil:
   gizlilik bu ürünün en güçlü satış argümanı (matris #10 "çevrimdışı ve
   gizlilik" = 5, sınıfının en iyisi). Yalnız depoda duran bir belge kimsenin
   okumadığı ölü bir kâğıt olurdu; metin uygulamanın İÇİNDE de duruyor.

   ÖLÇÜLEREK YAZILDI, iddia edilmedi (v9.9 kaynağı):
     bize ait sunucuya giden ağ çağrısı  0
     analitik / izleme / çökme raporu    0
     üçüncü taraf kütüphane              0
   Tek istisna sesle takip: konuşma tarayıcının kendi tanıma servisine
   gidiyor ve Chrome/Safari bunu üreticinin sunucusunda işliyor. Bunu
   yazmamak, gizliliği satış argümanı yapan bir üründe en ağır dürüstlük
   kusuru olurdu — bu yüzden metinde ve testte AÇIKÇA aranıyor. */

const tel = oku(telefonYolu());
const man = JSON.parse(fs.readFileSync(path.join(REPO,'manifest.json'),'utf8'));
const gizHam = fs.readFileSync(path.join(REPO,'GIZLILIK.md'),'utf8');
/* Belge sarmalı düz yazı: "ses tanıma\nservisine" gibi satır sonunda bölünen
   ifadeler desenle bulunamıyordu. Boşlukları tekleştirip arıyoruz — aranan
   şey CÜMLE, satır düzeni değil. İlk yazımda buna takılıp belgeyi değil
   testi düzeltmek gerektiğini gördüm. */
const giz = gizHam.replace(/\s+/g, ' ');

/* ---------- MANIFEST MAĞAZAYA HAZIR MI ---------- */
{
  for (const alan of ['name','short_name','description','start_url','scope','display',
                      'background_color','theme_color','lang','categories','icons','id'])
    ok('manifest alanı var: ' + alan, man[alan] !== undefined);
  /* id: uygulamanın KALICI kimliği. start_url değişirse tarayıcı onu AYRI bir
     uygulama sanar ve kullanıcının kurulu kopyası kopar. */
  ok('id sabit bir değer', typeof man.id === 'string' && man.id.length > 1);
  const boyutlar = man.icons.map(i => i.sizes);
  ok('192 ve 512 ikon bildirilmiş', boyutlar.includes('192x192') && boyutlar.includes('512x512'));
  /* maskable olmadan Android ikonu beyaz kutuda küçük görünür. */
  ok('maskable ikon bildirilmiş', man.icons.some(i => i.purpose === 'maskable'));
  /* Bildirilen her ikon DOSYASI gerçekten olmalı: olmayan dosyaya işaret eden
     manifest, kurulum ekranını sessizce bozar. */
  for (const i of man.icons)
    ok('ikon dosyası gerçekten var: ' + i.src, fs.existsSync(path.join(REPO, i.src)));
  /* screenshots BİLEREK yazılmadı: var olmayan dosyaya işaret etmek kurulum
     ekranını bozar. Görseller hazırlanınca eklenecek. */
  ok('olmayan ekran görüntüsüne işaret edilmiyor', man.screenshots === undefined);
}

/* ---------- KISAYOLLAR VE PAYLAŞIM ÖLÜ DEĞİL Mİ ---------- */
{
  /* Manifestte duran ama kodda karşılığı olmayan bir kısayol, kullanıcının
     dokunduğunda hiçbir şey olmayan bir simge demektir. */
  ok('kısayollar bildirilmiş', Array.isArray(man.shortcuts) && man.shortcuts.length > 0);
  const kod = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  ok('kısayol parametresi kodda işleniyor', /function fromShortcut\(\)\{/.test(kod));
  for (const s of man.shortcuts) {
    const p = (s.url.match(/go=([a-z]+)/) || [])[1];
    ok('kısayol "' + s.short_name + '" kodda karşılanıyor',
       !!p && new RegExp("go==='" + p + "'").test(kod));
  }
  ok('paylaşım hedefi bildirilmiş', !!man.share_target);
  ok('paylaşılan metin kodda okunuyor', /get\('text'\)/.test(kod));
}

/* ---------- GİZLİLİK METNİ DÜRÜST MÜ ---------- */
{
  ok('gizlilik belgesi depoda', giz.length > 1000);
  ok('iki dilde yazılmış', /Privacy Policy/.test(giz) && /Gizlilik Politikası/.test(giz));
  /* EN ÖNEMLİ İDDİA: istisna saklanmamalı. "Hiçbir veri toplamıyoruz" deyip
     sesle takibi yazmamak, mağaza başvurusunda yanlış beyan olurdu. */
  ok('sesle takip istisnası belgede açıkça yazılı',
     /ses tanıma servisine/.test(giz) && /Google, Apple/.test(giz));
  ok('istisnanın varsayılan KAPALI olduğu yazılı', /varsayılan olarak kapalıdır/.test(giz));
  ok('uzak önizlemenin sınırı yazılı', /diske hiç yazılmaz/.test(giz));
  ok('veri kaybı riski ve çaresi yazılı', /Dosyaya yedekle/.test(giz));
  ok('iletişim adresi var', /@/.test(giz));
}

/* ---------- METİN UYGULAMANIN İÇİNDE Mİ ---------- */
{
  /* Yalnız depoda duran belge kimsenin okumadığı ölü kâğıttır. Tarayıcıda
     doğrulandı: yardım sayfasında görünüyor ve istisnayı söylüyor. */
  ok('uygulamada gizlilik başlığı var', /data-i18n="privTitle"/.test(tel));
  ok('uygulamada gizlilik gövdesi var', /id="privBody"/.test(tel));
  ok('gövde iki dilde dolduruluyor', /\$\('#privBody'\)\.innerHTML=PRIV\[L\];/.test(tel));
  ok('uygulama metni de istisnayı söylüyor',
     /Tek istisna:<\/b> sesle takip/.test(tel) && /ses tanıma servisine/.test(tel));
  /* Metin dille birlikte yenilenmeli, yoksa İngilizceye geçen kullanıcı
     Türkçe gizlilik metni okur. */
  ok('dil değişince metin yenileniyor (applyLang içinde)',
     /\$\('#helpBody'\)\.innerHTML=HELP\[L\];\s*\n\s*\$\('#privBody'\)\.innerHTML=PRIV\[L\];/.test(tel));
}

/* ---------- İDDİALAR HÂLÂ DOĞRU MU ---------- */
{
  /* Belge "sıfır analitik, sıfır üçüncü taraf" diyor. Bu iddia bir gün
     yanlışlanırsa belge YALAN söylemeye başlar — o yüzden kilitleniyor. */
  const temiz = tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');
  ok('analitik/izleme aracı hâlâ yok', !/analytics|gtag\(|mixpanel|sentry|posthog/i.test(temiz));
  ok('dışarıdan yüklenen kod hâlâ yok', !/<script[^>]+src=/.test(temiz));
  ok('uzak sunucuya fetch yok', !/fetch\(['"]https?:\/\//.test(temiz));
}
