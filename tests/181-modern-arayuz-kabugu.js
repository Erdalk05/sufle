const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,repoOku}=require('./kaynak');
const tel=oku(telefonYolu());
const css=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const jet=repoOku('cekirdek/jetonlar.css','SUFLE_JETON');

/* v9.26 — davranışa dokunmadan modern ürün kabuğu. Bu test estetik bir
   tercihi değil, kullanıcıya görünen sistemin dört yapısal kararını kilitler:
   katmanlı marka zemini, tek parça kontrol iskelesi, okunur sınırlar ve
   ana/ikincil eylem ayrımı. */

ok('giriş zemini tek renk değil, katmanlı marka ışığı taşıyor',
   /#intro\{[^}]*radial-gradient[\s\S]*radial-gradient[\s\S]*linear-gradient/.test(css));
ok('çekim kontrolleri tek parça cam iskelede',
   /#bar\{[^}]*border-radius:28px 28px 0 0[^}]*backdrop-filter:blur\(20px\)/.test(css));
ok('kontrol iskelesinin yüzey sınırı ve yükseltisi var',
   /#bar\{[^}]*border-top:1px solid[^}]*box-shadow:/.test(css));
ok('yardımcı kontroller artık kopuk düz disk değil, ortak cam yüzey dili kullanıyor',
   /\.cbtn\{[^}]*border:1px solid[^}]*background:rgba\(255,255,255,.065\)[^}]*box-shadow:var\(--el-1\)/.test(css));
ok('ana eylem hem yükseklik hem yükselti ile açıkça birincil',
   /\.big\{[^}]*linear-gradient[^}]*min-height:56px[^}]*box-shadow:/.test(css));
ok('ikincil eylem tonal ve en az 48 px',
   /\.ghostbig\{[^}]*background:rgba\(255,255,255,.065\)[^}]*min-height:48px/.test(css));
ok('ayar yüzeyi düz levha değil, katmanlı yüzey',
   /\.sheet\{[^}]*linear-gradient\(180deg[^}]*border:1px solid/.test(css));
ok('ayar sekmeleri ortak bir yüzey içinde gruplanıyor',
   /\.tabs\{[^}]*backdrop-filter:blur\(14px\)[^}]*border-radius:14px/.test(css));
ok('erişilebilir kontrol sınırı eski düşük kontrast değerine dönmedi',
   /--s-line:#667085/.test(jet));
ok('44 px dokunma hedefi korunuyor', /--tap:44px/.test(jet));
