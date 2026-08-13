const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* ÇOK UZUN TEK KELİME NEREDE TAŞAR — DÖRT YÜZEY AYRI AYRI ÖLÇÜLDÜ.
   Gerçek senaryolarda bu bir URL oluyor: "https://ornek.com/cok/uzun/bir/adres".
   Boşluk içermediği için satır sarması onu bölemez ve her yüzeyde ayrı davranır.

   SONUÇ (hipotez büyük ölçüde çürüdü):
     · sufle          — CSS word-wrap:break-word ile kırılıyor ✓
     · senaryo listesi — başlık üç noktayla kısaltılıyor ✓
     · gömülü altyazı  — wrapLines içindeki pushWord harf harf bölüyor ✓ (ölçüldü)
     · .srt dosyası    — 42 karakter sınırını aşan tek kelime bölünmüyor;
                         oynatıcılar kendi sardığı için kırılma değil, kayıtlı sınır. */

/* ---------- SUFLE: CSS kırıyor ---------- */
const scroller=(tel.match(/#scroller\{[^}]*\}/)||[''])[0];
ok('sufle uzun kelimeyi kırıyor (word-wrap)', /word-wrap:break-word/.test(scroller));
ok('sufle normal sarma kullanıyor', /white-space:normal/.test(scroller));

/* ---------- SENARYO LİSTESİ: başlık kısaltılıyor ---------- */
const baslik=(tel.match(/\.listitem \.t\{[^}]*\}/)||[''])[0];
ok('liste başlığı taşmıyor (ellipsis)', /text-overflow:ellipsis/.test(baslik));
ok('liste başlığı tek satırda', /white-space:nowrap/.test(baslik));
ok('liste başlığı gizleniyor', /overflow:hidden/.test(baslik));

/* ---------- GÖMÜLÜ ALTYAZI: gerçekten harf harf bölüyor mu ---------- */
const wrap=new Function(cikar(kod,/function wrapLines\([\s\S]*?\n\}/,'wrapLines')+'; return wrapLines;')();
const olc=s=>s.length;                       // 1 karakter = 1 birim
{
  const uzun='https://ornek.com/cok/uzun/bir/adres/daha/da/uzun/olsun';
  const satirlar=wrap(olc, uzun, 20);
  ok('uzun kelime birden çok satıra bölünüyor', satirlar.length>1);
  ok('hiçbir satır sınırı aşmıyor', satirlar.every(s=>olc(s)<=20));
  ok('bölünen parçalar birleşince kelime aynı kalıyor', satirlar.join('')===uzun);
}
{
  const normal='bu normal bir cümle burada duruyor';
  const satirlar=wrap(olc, normal, 20);
  ok('normal metin kelime sınırından bölünüyor', satirlar.every(s=>!/\S$/.test(s)===false));
  ok('normal metinde satırlar sınırı aşmıyor', satirlar.every(s=>olc(s)<=20));
  ok('normal metinde kelime ortadan kesilmiyor',
     satirlar.join(' ').replace(/\s+/g,' ')===normal);
}
{
  ok('boş metin çökertmiyor', Array.isArray(wrap(olc,'',20)));
  ok('tek kısa kelime tek satır', wrap(olc,'merhaba',20).length===1);
  /* Sınırdan bir karakter uzun kelime de bölünmeli. */
  const t='a'.repeat(21);
  ok('sınırı bir aşan kelime de bölünüyor', wrap(olc,t,20).length===2);
}

/* ---------- .srt: sınır aşan tek kelime ne oluyor ---------- */
const bc=cikar(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues');
ok('kuyruk karakter sınırına bakıyor', /cur\.chars\+1\+w\.s\.length>CAP_MAXCH/.test(bc));
ok('sınır aşılınca YENİ kuyruk açılıyor (kelime ortadan kesilmiyor)',
   /if\(brk\)\{ cues\.push\(cur\); cur=\{start:w\.t/.test(bc));
/* Bu, sınırı aşan TEK kelimenin kendi kuyruğunda kalması demek: bölünmüyor.
   Oynatıcılar uzun satırı kendileri sarar; kırılma değil, bilinçli sınır. */
ok('karakter sınırı 42 olarak tanımlı', /const CAP_MAXCH=42/.test(kod));

/* ---------- DÜZENLEYİCİ ---------- */
const ta=(tel.match(/textarea\{[^}]*\}/)||[''])[0];
ok('düzenleyici tam genişlikte (yatay taşma yok)', /width:100%/.test(ta));

/* ---------- KELİME SAYIMI UZUN KELİMEDE BOZULMUYOR ---------- */
{
  const cw=new Function(cikar(kod,/function countWords\([\s\S]*?\n\}/,'countWords')+'; return countWords;')();
  ok('uzun URL tek kelime sayılıyor', cw('https://ornek.com/cok/uzun/adres')===1);
  ok('normal cümle doğru sayılıyor', cw('bu bir deneme cümlesidir')===4);
}
