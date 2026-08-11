#!/usr/bin/env node
/* Tüm regresyon testlerini koşturur.  Kullanım:  node tests/kos.js
   Çıkış kodu 0 = hepsi geçti, 1 = en az bir hata.

   Bu testlerin ayırıcı özelliği: mantığı kopyalamıyorlar, gerçek kaynak
   dosyadan regex ile ÇIKARIP koşuyorlar. Kod değişince test de değişir;
   kopya test kod değiştiğinde sessizce yalan söyler. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dizin = __dirname;
const dosyalar = fs.readdirSync(dizin)
  .filter(f => /^\d\d-.*\.js$/.test(f))
  .sort();

let toplam = 0, hata = 0, kirik = [];
for (const f of dosyalar) {
  let cikti = '';
  let ok = true;
  try {
    cikti = execFileSync(process.execPath, [path.join(dizin, f)], { encoding: 'utf8' });
  } catch (e) {
    ok = false;
    cikti = (e.stdout || '') + (e.stderr || '');
  }
  const gecen = (cikti.match(/✓/g) || []).length;
  const kalan = (cikti.match(/✗/g) || []).length;
  toplam += gecen; hata += kalan;
  const durum = ok && !kalan ? '✓' : '✗';
  console.log(`${durum} ${f.padEnd(34)} ${String(gecen).padStart(3)} test`);
  if (!ok || kalan) {
    kirik.push(f);
    cikti.split('\n').filter(l => l.includes('✗') || l.includes('Error')).forEach(l => console.log('    ' + l.trim()));
  }
}
console.log('─'.repeat(52));
console.log(`${toplam} test geçti, ${hata} hata` + (kirik.length ? ` — kırık: ${kirik.join(', ')}` : ''));
process.exit(hata || kirik.length ? 1 : 0);
