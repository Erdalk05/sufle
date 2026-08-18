const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const repo=path.resolve(__dirname,'..');
const yol=process.env.SUFLE_KAPI || path.join(repo,'kapi.sh');
const sh=fs.readFileSync(yol,'utf8');

/* Uygulama yayımlandıktan sonra yalnız test/araç/belge değiştiğinde sürümü
   yapay olarak artırmak doğru değil; normal kapıyı gevşetmek de yayın
   güvenliğini bozar. Ayrı kip yalnız VER ve cache son yayınla birebir aynıysa
   geçebilir. Bu test iki yolun birbirine karışmasını engeller. */
ok('yayın sonrası kip açık bir komut satırı bayrağıdır',
   /--yayin-sonrasi/.test(sh) && /YAYIN_SONRASI=0/.test(sh));
ok('bayrak verilince kip açılıyor ve argüman tüketiliyor',
   /YAYIN_SONRASI=1; shift/.test(sh));
ok('bilinmeyen argüman sessizce kabul edilmiyor',
   /Kullanım: \.\/kapi\.sh \[--yayin-sonrasi\]/.test(sh) && /exit 2/.test(sh));
ok('kip sürüm denetimine açık ortam değişkeniyle aktarılıyor',
   /export SUFLE_YAYIN_SONRASI="\$YAYIN_SONRASI"/.test(sh));
ok('Python sürüm kapısı yayın sonrası kipini okuyor',
   /post = os\.environ\.get\('SUFLE_YAYIN_SONRASI'\) == '1'/.test(sh));
ok('aynı sürüm yalnız yayın sonrası kipinde ve aynı cache ile geçiyor',
   /if post and int\(cache\) == int\(prev\[1\]\):/.test(sh));
ok('normal yayın öncesi kapı aynı sürümde hâlâ kırmızı',
   /VER artmamış[^\n]+sys\.exit\(1\)/.test(sh));
ok('yayın sonrası kip yeni sürümü gizleyemiyor',
   /if post:\n\s+print\("  ✗ --yayin-sonrasi yalnız canlı sürüm/.test(sh));
ok('yayın sonrası geçiş başarıyla ve adıyla raporlanıyor',
   /✓ yayın sonrası araç\/belge kapısı/.test(sh) && /sys\.exit\(0\)/.test(sh));
