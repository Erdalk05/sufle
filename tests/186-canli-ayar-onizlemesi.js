const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'),path=require('path'),vm=require('vm');
const REPO=path.join(__dirname,'..');
const yol=process.env.SUFLE_TELEFON || path.join(REPO,'index.html');
const src=fs.readFileSync(yol,'utf8');
const kontrastYolu=process.env.SUFLE_KONTRAST || path.join(REPO,'kontrast.py');
const kontrast=fs.readFileSync(kontrastYolu,'utf8');

/* v9.29: Kamera açıkken Ayarlar, canlı sahneyi kaybetmeden çalışan kontrollü
   cam panele dönüşür. Diğer sayfalar etkilenmez; veri/risk sekmesi daha opak,
   azaltılmış saydamlık tercihi ise tüm cam etkisini kapatır. */
ok('canlı önizleme rozeti Ayarlar başlığında',
   /id="canliAyarRozet"[^>]*data-i18n="liveSettings"/.test(src));
ok('rozet Türkçe', /liveSettings:'Canlı önizleme'/.test(src));
ok('rozet İngilizce', /liveSettings:'Live preview'/.test(src));
ok('rozet yalnız canlı ayar kipinde görünür',
   /body\.ayarCanli #canliAyarRozet\{display:inline-flex\}/.test(src));
/* Kuralın İÇERİĞİ ölçülüyor, yazım SIRASI değil: `-webkit-` öneki eklenince
   birebir metin iddiası ürün doğruyken kırıldı (v9.32). */
ok('kamera arkasındaki perde hafif tutulur',
   /body\.ayarCanli #backdrop\{[^}]*background:rgba\(0,0,0,\.10\)[^}]*\}/.test(src) &&
   /body\.ayarCanli #backdrop\{[^}]*(?<!-)backdrop-filter:none[^}]*\}/.test(src));
ok('canlı panel yüksekliği sahnenin üstünü açık bırakır',
   /body\.ayarCanli #sheet\.open\{[\s\S]*?max-height:68%;[\s\S]*?max-height:min\(68dvh,720px\)/.test(src));
ok('panel kontrollü cam yüzeydir',
   /body\.ayarCanli #sheet\.open\{[\s\S]*?rgba\(30,36,46,\.84\)[\s\S]*?blur\(24px\) saturate\(1\.28\)/.test(src));
ok('cam panelin sınırı ve yükseltisi görünür',
   /body\.ayarCanli #sheet\.open\{[\s\S]*?border-color:rgba\(255,255,255,\.20\)[\s\S]*?box-shadow:0 -18px 56px/.test(src));
ok('Diğer sekmesi daha opak perde kullanır',
   /body\.ayarCanli\.ayarDiger #backdrop\{background:rgba\(0,0,0,\.26\)\}/.test(src));
ok('Diğer sekmesi daha opak panel kullanır',
   /body\.ayarCanli\.ayarDiger #sheet\.open\{[\s\S]*?rgba\(26,30,39,\.96\)/.test(src));
ok('azaltılmış saydamlık tercihi desteklenir',
   /@media \(prefers-reduced-transparency: reduce\)/.test(src) &&
   /body\.ayarCanli #sheet\.open\{background:rgb\(20,24,31\);backdrop-filter:none/.test(src));
ok('yüksek kontrast mevcut opak yüzey kuralını korur',
   /body\.hicon \.sheet\{background:#000!important\}/.test(src));

const fn=(src.match(/function ayarCanliDurum\(id\)\{[\s\S]*?\n\}/)||[])[0];
ok('canlı ayar durum fonksiyonu ayrıştırıldı',!!fn);
function kos({cam=false,tab='read',id='#sheet'}={}){
  const sinif=new Set(cam?['cam']:[]);
  const body={classList:{contains:k=>sinif.has(k),toggle:(k,v)=>v?sinif.add(k):sinif.delete(k)}};
  const sekme={dataset:{tab}};
  const $=q=>q==='#sheet .tabs button.on'?sekme:null;
  vm.runInNewContext(fn+'; ayarCanliDurum('+JSON.stringify(id)+')',{body,$});
  return sinif;
}
ok('kamera + Ayarlar canlı kipi açar',kos({cam:true}).has('ayarCanli'));
ok('kamera kapalıysa cam panel açılmaz',!kos({cam:false}).has('ayarCanli'));
ok('başka çalışma sayfası cam panele dönüşmez',!kos({cam:true,id:'#takesSheet'}).has('ayarCanli'));
ok('Okuma sekmesi riskli sekme sayılmaz',!kos({cam:true,tab:'read'}).has('ayarDiger'));
ok('Görünüm sekmesi riskli sekme sayılmaz',!kos({cam:true,tab:'look'}).has('ayarDiger'));
ok('Kamera sekmesi riskli sekme sayılmaz',!kos({cam:true,tab:'cam'}).has('ayarDiger'));
ok('Diğer sekmesi daha opak kipi açar',kos({cam:true,tab:'more'}).has('ayarDiger'));
ok('kamera yokken Diğer de canlı kip açmaz',!kos({cam:false,tab:'more'}).has('ayarDiger'));
ok('Ayarlar açılırken durum kamera ve sayfadan türetilir',
   /classList\.add\('sheeting'\);\n\s*arkayiKilitle\(\);\n\s*ayarCanliDurum\(id\)/.test(src));
ok('sekme değişince saydamlık seviyesi anında tazelenir',
   /#tab-'\+b\.dataset\.tab\)\.classList\.add\('on'\);\n\s*ayarCanliDurum\('#sheet'\)/.test(src));
ok('kapanış iki canlı sınıfı da temizler',
   /classList\.remove\('sheeting'\); arkayiKilitle\(\); body\.classList\.remove\('ayarCanli','ayarDiger'\)/.test(src));
ok('canlı panel yalnız gerçek Ayarlar seçicisine bağlı',
   (src.match(/body\.ayarCanli #sheet\.open/g)||[]).length>=2 &&
   !/body\.ayarCanli \.sheet\.open/.test(src));
ok('çizilmiş arayüz kapısı kamera açık Ayarları ayrıca ölçer',
   /'telefon-canli-ayarlar', TELEFON, 430, 932, 3/.test(kontrast));
ok('çizim kapısı kamera akmadan Ayarları ölçmüş saymaz',
   /kamera canlı ayarlar için hazır olmadı/.test(kontrast));
ok('çizim kapısı canlı ayar sınıfını hedef durum olarak bekler',
   /document\.body\.classList\.contains\('ayarCanli'\)/.test(kontrast));
