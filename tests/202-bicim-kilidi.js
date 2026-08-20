const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {repoOku,esnek,REPO}=require('./kaynak');

/* BİÇİM KİLİDİ TARAYICISININ KENDİ DENETİMİ (2026-08-20).

   NE ÖLÇÜLDÜ: kabuğun `<script>` bölgelerinde, dize ve yorum DIŞINDA kalan
   her `,` ve `;` işaretinden sonra bir boşluk eklemek davranışı hiç
   değiştirmiyor. Buna rağmen **201 test dosyasının 65'i kırıldı** — yani o
   testler kodun davranışına değil YAZIM BİÇİMİNE bakıyordu.

   Bu, deponun `CLAUDE.md` içinde tablo hâlinde yazdığı en pahalı test
   kusuru sınıfı. 2026-08-14 gecesinde beş vaka tek tek bulunmuştu, 19/20
   Ağustos gecesinde beş vaka daha; `EKSIKLER` F2 maddesi *"sistematik
   tarama hâlâ yok"* diyordu. `bicim.py` o taramadır.

   BU DOSYA ARACIN KENDİSİNİ ÖLÇÜYOR — çünkü ölçmeyen bir kapı, kapı
   değildir ve bu depoda bir tarayıcının sessizce hiçbir şey ölçmemesi
   defalarca yaşandı. */

const BICIM=repoOku('bicim.py','SUFLE_BICIM');
const TABAN=path.join(REPO,'tests','bicim-taban.json');

/* ---------- 1) ARAÇ GERÇEKTEN DÖNÜŞTÜRÜYOR MU ---------- */
ok('biçim tarayıcısı depoda', BICIM.length>2000);
ok('dönüşüm hiçbir şey değiştirmezse araç DURUYOR',
   /dönüşüm HİÇBİR ŞEY değiştirmedi/.test(BICIM));
ok('dönüşüm yeterince geniş değilse araç DURUYOR',
   /dönüşüm yeterince geniş değil/.test(BICIM));
/* İki sınıf ayrılmalı: gerçek fonksiyonu kaynaktan çıkarıp KOŞTURAN bir
   testin adres kırılganlığı, o disiplinin bedelidir — kusuru değil. Sayıyı
   ayırmadan yayımlamak, doğru disiplini cezalandırmak olurdu. */
ok('iddia kilidi ile çıkarım kırılganlığı AYRILIYOR',
   /İDDİA BİÇİME KİLİTLİ/.test(BICIM) && /çıkarım deseni/.test(BICIM));
ok('yalnız iddia sınıfı ratchetleniyor', /biçime kilitli test ARTTI/.test(BICIM));
/* Aracın kendi dürüstlük sınırı YAZILI olmalı: bulduğu her vaka gerçek
   ama hiç bulamaması "temiz" demek değil. */
ok('aracın dürüstlük sınırı yazılı',
   /biçime bakan her testi" bulmaz|NOKTALAMA\n?\s*ARALIĞINA duyarlı/.test(BICIM));

/* ---------- 2) TABAN VAR VE ANLAMLI ---------- */
{
  ok('biçim tabanı dosyası var', fs.existsSync(TABAN));
  const t=JSON.parse(fs.readFileSync(TABAN,'utf8'));
  ok('taban iddia sayısını tutuyor', typeof t.kilitli==='number');
  ok('taban çıkarım sayısını da tutuyor', typeof t.cikarim==='number');
  ok('taban hangi dosyalar olduğunu ADIYLA yazıyor ('+(t.dosyalar||[]).length+')',
     Array.isArray(t.dosyalar) && t.dosyalar.length===t.kilitli);
  /* Adı geçen her dosya gerçekten var: silinmiş bir dosyayı listede tutmak
     sayıyı yapay olarak yüksek gösterir ve ratchet anlamsızlaşır. */
  const yok=(t.dosyalar||[]).filter(f=>!fs.existsSync(path.join(REPO,'tests',f)));
  ok('listedeki her dosya gerçekten var'+(yok.length?' — yok: '+yok.join(', '):''),
     yok.length===0);
}

/* ---------- 3) esnek() DİZELERE DOKUNMUYOR ----------
   Kullanıcının GÖRDÜĞÜ metni ölçen iddialar bu depodaki tek MEŞRU biçim
   kilidi. Normalleştirme dizelerin içine girseydi onları da kırardı —
   yani aracın kendisi, engellemeye çalıştığı kusuru üretirdi. */
ok('noktalama aralığı siliniyor',
   esnek("el.setAttribute('tabindex', '0');")==="el.setAttribute('tabindex','0');");
ok('dize İÇİ olduğu gibi kalıyor',
   esnek("t('SES 3, KESİLDİ; bitti')")==="t('SES 3, KESİLDİ; bitti')");
ok('yorum içi olduğu gibi kalıyor',
   esnek("x=1;/* not, burada */")==="x=1;/* not, burada */");
ok('satır sonu silinmiyor (satır yorumu bir sonraki satıra taşınmasın)',
   esnek("a=1;\n// not\nb=2;")==="a=1;\n// not\nb=2;");
ok('düzenli ifade içi korunuyor',
   esnek("s.split(/[,;] /)")==="s.split(/[,;] /)");

/* ---------- 4) KAPI BU ADIMI GERÇEKTEN KOŞTURUYOR ----------
   Araç deponun içinde durup hiç çağrılmasaydı ölü bir nöbetçi olurdu —
   bu deponun kendi hata sınıflarından biri ("ön koşulu olan ayar = ölü ayar"
   ile aynı kök). */
{
  const KAPI=repoOku('kapi.sh','SUFLE_KAPI');
  ok('kapı biçim kilidi adımını koşturuyor', /python3 bicim\.py \|\| KOD=1/.test(KAPI));
  ok('adım kapının adım sayısında yazılı', /11\/11 Biçim kilidi/.test(KAPI));
}
