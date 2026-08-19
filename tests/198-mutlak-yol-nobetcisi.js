const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const REPO=path.join(__dirname,'..');

/* MUTLAK YOL NÖBETÇİSİ — 19 Ağustos 2026'da ısırdıktan sonra yazıldı.

   NE OLDU: `kayit.py` (kapının 10. adımı, çekim akışı uçtan uca) ölçeceği
   dosyanın yolunu ELLE taşıyordu:

       TELEFON = 'file:///Users/…/Desktop/.sufle-deploy/index.html'

   Depo `~/sufle`ye taşındıktan sonra bu adım **eski dosyayı** açmaya devam
   etti. Eski dosya hâlâ çalışan bir uygulama olduğu için **on adım yeşil
   verdi ve hiçbiri o günkü kodu ölçmedi**. Kusur ancak eski klasör silinince
   ortaya çıktı — yani kapı, yanlış şeyi ölçtüğünü kendi başına söyleyemedi.

   NEDEN BU KADAR SİNSİ: yanlış yol bir HATA vermiyor, sadece BAŞKA bir şeyi
   ölçüyor. Test yeşil, rapor yeşil, yayın gidiyor. Erdal'ın başka deposunda
   da aynı sınıf yaşandı (worktree'den koşan kapı ana dizini ölçüyordu).

   KURAL: depodaki hiçbir araç/test dosyası kullanıcıya özel mutlak yol
   yazmaz. Yol ya betiğin KENDİ konumundan türetilir, ya ortam değişkeninden
   gelir, ya da `process.env.HOME` üzerinden kurulur.

   KAPSAM: kod ve araç dosyaları. Belgeler (`.md`) hariç — orada yol yazmak
   kullanıcıya tarif vermektir, ölçüm değil. */

const ATLA=new Set(['.git','node_modules','__pycache__','.build','belgeler','magaza']);
const UZANTI=/\.(py|js|sh|json)$/;
const dosyalar=[];
(function tara(dizin){
  for(const g of fs.readdirSync(dizin,{withFileTypes:true})){
    if(ATLA.has(g.name)) continue;
    const y=path.join(dizin,g.name);
    if(g.isDirectory()) tara(y);
    else if(g.isFile() && UZANTI.test(g.name)) dosyalar.push(y);
  }
})(REPO);

ok('taranacak araç/test dosyası var (ölçüm ölü değil)', dosyalar.length>50);

/* `/Users/<ad>/` — macOS'ta kullanıcıya özel mutlak yolun imzası. */
const DESEN=/\/Users\/[A-Za-z0-9_.-]+\//g;
const suclular=[];
for(const y of dosyalar){
  const src=fs.readFileSync(y,'utf8');
  const satirlar=src.split('\n');
  satirlar.forEach((l,i)=>{
    if(!DESEN.test(l)) return;
    DESEN.lastIndex=0;
    /* Yorum satırı da sayılır: bugünkü kusur tam olarak bir yorumun ALTINDAKİ
       satırdaydı ve yorumu muaf tutmak bu testi yarım bırakırdı. Ama KENDİ
       gerekçe metnimiz (bu dosya) ve olay kaydı hariç — orada yolu ANLATMAK
       gerekiyor. */
    suclular.push(path.relative(REPO,y)+':'+(i+1)+'  '+l.trim().slice(0,90));
  });
}
/* İKİ MUAFİYET, ikisi de DAR ve gerekçeli:
   · `tests/198-…` bu dosya: kusuru ANLATIYOR, kullanmıyor.
   · `tests/bozmalar.json` kasıtlı bozmaların kaydı — "yanlış kod" onun
     içeriğidir; orayı temiz saymak, bozma turunu yazılamaz hâle getirirdi. */
const gercek=suclular.filter(x=>!x.startsWith('tests/198-') &&
                                !x.startsWith('tests/bozmalar.json'));

ok('hiçbir araç/test dosyası kullanıcıya özel mutlak yol taşımıyor'+
   (gercek.length?'\n   → '+gercek.slice(0,6).join('\n   → '):''),
   gercek.length===0);

/* Dedektörün kendi ayırt ediciliği: deseni bulamayan bir tarayıcı her zaman
   temiz der ve kapı sonsuza kadar yeşil kalır. */
{
  const dene=(metin)=>{ DESEN.lastIndex=0; return DESEN.test(metin); };
  ok('desen gerçek bir mutlak yolu yakalıyor',
     dene("TELEFON = 'file:///Users/erdalkiziroglu/Desktop/x/index.html'"));
  ok('göreli yol yanlış alarm vermiyor', !dene("path.join(__dirname,'..','index.html')"));
  ok('ev dizininden kurulan yol yanlış alarm vermiyor',
     !dene("path.join(process.env.HOME,'Desktop','Teleprompter')"));
}

/* KAPININ 10. ADIMI ÖLÇTÜĞÜ DOSYAYI KENDİ KONUMUNDAN TÜRETMELİ.
   Bugünkü kusurun tam karşılığı; ayrıca dosya YOKSA sessizce geçmemeli. */
{
  /* Bozulabilir kaynak ORTAM DEĞİŞKENİYLE okunur: doğrudan depodan okusaydık
     kasıtlı bozma bu teste hiç ulaşmaz ve nöbetçi kanıtsız kalırdı — bu
     depoda dört kez yaşanmış sınıf (tests/115 tam bunu kilitliyor). */
  const kayitYolu=process.env.SUFLE_KAYIT_OLCUM || path.join(REPO,'kayit.py');
  const kayit=fs.readFileSync(kayitYolu,'utf8');
  ok('çekim akışı adımı yolu kendi konumundan türetiyor',
     /os\.path\.dirname\(os\.path\.abspath\(__file__\)\)/.test(kayit));
  ok('çekim akışı adımı ortam değişkenine saygı duyuyor',
     /os\.environ\.get\('SUFLE_TELEFON'\)/.test(kayit));
  /* Dosya yoksa AÇIKÇA durmalı: boş sayfayı ölçüp "kamera açılmadı" demek,
     olmayan bir ürün kusuru bildirmek olurdu. */
  ok('ölçülecek dosya yoksa açıkça duruyor', /ölçülecek dosya yok/.test(kayit));
}
