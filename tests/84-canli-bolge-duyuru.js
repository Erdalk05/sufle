const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* K6 — TOASTLAR EKRAN OKUYUCUYA DUYURULUYOR MU: DUYURULMUYORDU.

   `toast()` bu uygulamanın kullanıcıya SEBEP söylediği tek kanal — kaynakta
   154 çağrı yeri var. Bu gece kapattığım kusurların çoğunun çözümü de bir
   toast metniydi: kamera izni nereden açılır, depo dolunca ne silinir,
   fener neden söndü, tetik kelimesi neden tanınmıyor, çekim arşive yazıldı.
   `#toast` öğesinde `aria-live` ya da `role="status"` YOKTU; yani ekran
   okuyucu kullanan biri bu açıklamaların HİÇBİRİNİ duymuyordu. Uygulamanın
   "her şeyin sebebini söyle" tasarımı o kullanıcı için hiç yoktu.
   Mac tarafında ise dosyanın TAMAMINDA tek bir `aria-live` bile yoktu.

   Neden çalışır: toast `opacity:0` ile gizleniyor, `display:none` ile değil.
   Gizli ama erişilebilirlik ağacında; içeriği değişince canlı bölge duyurur.
   (display:none olsaydı bu düzeltme sessizce etkisiz kalırdı — aşağıda
   ölçülüyor, çünkü bu tam da "uygulanmış görünen ama uygulanmayan" tuzağı.)

   Kapsama iki yüzey daha eklendi: kumanda tanı paneli (kullanıcı hiçbir şey
   yapmadan 6 sn sonra yazıyor) ve kayıt durumu etiketi (kayıt başlarken toast
   yok, yalnız bu etiket değişiyor). */

const oz=(src,id)=>{ const m=src.match(new RegExp('<[^>]*id="'+id+'"[^>]*>')); return m&&m[0]; };

/* ---------- TELEFON ---------- */
{
  const t=oz(tel,'toast');
  ok('toast öğesi bulundu', !!t);
  if(t){
    ok('toast canlı bölge (aria-live)', /aria-live="polite"/.test(t));
    ok('toast durum rolü taşıyor', /role="status"/.test(t));
    /* aria-atomic: mesaj tek parça okunsun; yoksa yalnız DEĞİŞEN kelimeler
       okunur ve cümle anlamsız duyulur. */
    ok('toast bütün olarak okunuyor (aria-atomic)', /aria-atomic="true"/.test(t));
  }
}
{
  /* ÖLÇÜM: gizleme yöntemi. display:none olsaydı düzeltme etkisiz kalırdı. */
  const css=(tel.match(/\.toast\{[^}]*\}/)||[''])[0];
  ok('toast CSS bulundu', css.length>0);
  ok('toast opacity ile gizleniyor', /opacity:0/.test(css));
  ok('toast display:none ile gizlenmiyor (yoksa duyuru olmaz)', !/display:none/.test(css));
  ok('görünür hâli tanımlı', /\.toast\.on\{opacity:1/.test(tel));
}
{
  const d=oz(tel,'remoteDiag');
  ok('kumanda tanı paneli bulundu', !!d);
  if(d){
    ok('tanı paneli canlı bölge', /aria-live="polite"/.test(d));
    ok('tanı paneli durum rolü taşıyor', /role="status"/.test(d));
  }
  const r=oz(tel,'recLbl');
  ok('kayıt durumu etiketi bulundu', !!r);
  if(r) ok('kayıt durumu duyuruluyor', /aria-live="polite"/.test(r) && /role="status"/.test(r));
}
{
  /* Kanalın gerçekten kullanıldığının kanıtı: çok sayıda çağrı yeri.
     Sayı düşerse mesajlar başka bir yola kaymış demektir, o yol da
     duyurulmalı — bu yüzden ölçüyoruz. */
  const cagri=(kod.match(/\btoast\(/g)||[]).length;
  ok('toast gerçekten ana kanal ('+cagri+' çağrı yeri)', cagri>100);
  ok('toast metni içeriğe yazılıyor', /function toast\(msg\)\{ const el=\$\('#toast'\); el\.textContent=msg/.test(kod));
}

/* ---------- MAC ---------- */
{
  const t=oz(mac,'toast');
  ok('Mac toast öğesi bulundu', !!t);
  if(t){
    ok('Mac toast canlı bölge', /aria-live="polite"/.test(t));
    ok('Mac toast durum rolü taşıyor', /role="status"/.test(t));
    ok('Mac toast bütün olarak okunuyor', /aria-atomic="true"/.test(t));
  }
  const macCss=(mac.match(/\.toast\{[^}]*\}/)||[''])[0];
  ok('Mac toast da opacity ile gizleniyor', /opacity:0/.test(macCss) && !/display:none/.test(macCss));
  ok('Mac tarafında artık canlı bölge var', (mac.match(/aria-live/g)||[]).length>=1);
}

/* ---------- AŞIRIYA KAÇMADIK MI ----------
   Her yeri canlı bölge yapmak da erişilebilirlik kusurudur: ekran okuyucu
   sürekli konuşur ve kullanıcı hiçbir şey anlamaz. Sayı sınırlı kalmalı. */
{
  const n=(tel.match(/aria-live/g)||[]).length;
  ok('telefonda canlı bölge sayısı ölçülü ('+n+' adet)', n>=3 && n<=6);
  /* Sürekli değişen sayaçlar canlı bölge OLMAMALI: süre sayacı saniyede bir
     değişiyor, duyurulursa ekran okuyucu başka hiçbir şey söyleyemez. */
  const sayac=oz(tel,'recTime');
  ok('süre sayacı bulundu', !!sayac);
  if(sayac) ok('süre sayacı canlı bölge DEĞİL (sürekli konuşurdu)', !/aria-live/.test(sayac));
  const hud=oz(tel,'hud');
  if(hud) ok('gösterge paneli canlı bölge değil', !/aria-live/.test(hud));
}

/* ---------- ESKİ ERİŞİLEBİLİRLİK KAZANIMLARI DURUYOR MU ---------- */
ok('simge düğmelerinin adı duruyor (aria-label)', (tel.match(/aria-label="/g)||[]).length>10);
ok('anahtarlar durumunu söylüyor (aria-checked)', /setAttribute\('aria-checked'/.test(kod));
ok('Mac tarafında da etiketler duruyor', (mac.match(/aria-label="/g)||[]).length>5);
