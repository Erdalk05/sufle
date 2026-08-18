const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* v9.27 — Dil seçimi yalnız giriş ekranında kalınca uygulamaya girdikten sonra
   bulunamıyordu. Bu test görünür ikinci girişi, iki girişin aynı davranışa
   bağlanmasını, kalıcılığı ve ekran okuyucu durumunu birlikte kilitler. */
const intro=(tel.match(/<div id="langSwitch"[\s\S]*?<\/div>/)||[])[0]||'';
const ayar=(tel.match(/<div id="sheetLang">[\s\S]*?<\/div>\s*<\/div>/)||[])[0]||'';
const apply=(kod.match(/function applyLang\(\)\{[\s\S]*?\n\}/)||[])[0]||'';
const olay=(kod.match(/\$\$\('\[data-lang\]'\)\.forEach\(b=>b\.onclick=[^\n]+/)||[])[0]||'';

ok('giriş ekranındaki TR/EN seçimi korunuyor',
   /data-lang="tr"/.test(intro) && /data-lang="en"/.test(intro));
ok('ayarlar içinde sürekli görünür dil seçimi var', !!ayar);
ok('ayar seçimi Türkçe ve English adlarını açıkça yazıyor',
   />Türkçe<\/button>/.test(ayar) && />English<\/button>/.test(ayar));
ok('ayar dil grubu yerelleştirilebilir erişilebilir ada sahip',
   /role="group"/.test(ayar) && /data-i18n-aria="mLangLabel"/.test(ayar));
ok('dil düğmeleri basılı durumunu ekran okuyucuya bildiriyor',
   (tel.match(/aria-pressed="(?:true|false)"/g)||[]).length>=4);
ok('dil uygulandığında bütün dil düğmeleri birlikte güncelleniyor',
   /\$\$\('\[data-lang\]'\)/.test(apply));
ok('seçili dil görsel ve erişilebilir durumla birlikte yazılıyor',
   /classList\.toggle\('on',secili\)/.test(apply) &&
   /setAttribute\('aria-pressed',String\(secili\)\)/.test(apply));
ok('yerelleştirilmiş aria etiketi uygulama zamanında yenileniyor',
   /\$\$\('\[data-i18n-aria\]'\)/.test(apply));
ok('iki dil girişi de aynı olay bağını kullanıyor', /\[data-lang\]/.test(olay));
ok('dil tercihi yerel duruma kaydedilip hemen uygulanıyor',
   /st\.lang=L; save\(\); applyLang\(\)/.test(olay));
