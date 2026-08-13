const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* İKİNCİ SÜRÜM BÜTÜN TAŞIMA YOLLARINDA HAYATTA KALIYOR MU
   İki sürümlü senaryo (⇄) dün eklendi: aynı senaryonun ikinci dildeki hâli
   text2/pos2/shot2/diff2/mark2/surum2 alanlarında duruyor. Bu depoda en verimli
   hata sınıflarından biri şu: YENİ ALAN eklenir, o alanı bilmeyen ESKİ YOLLAR
   veriyi sessizce düşürür. Senaryoyu kopyalayan/taşıyan her yol denetlendi.

   ÇÜRÜYEN ÜÇ HİPOTEZ (kayda geçsin, tekrar aranmasın):
   · Otomatik yedek — st.scripts'i olduğu gibi yazıyor, taşıyor.
   · JSON dışa/içe aktarma — aynı şekilde bütün diziyi taşıyor.
   · Silinen senaryoyu geri getirme — derin kopya alıyor, taşıyor.

   İKİ GERÇEK KUSUR:
   · Arama yalnız açık sürümün metnine bakıyordu; aradığın cümle kapalı
     sürümdeyse senaryo listede HİÇ çıkmıyordu.
   · Çoğaltma (⧉) alan alan kopyalıyordu: yalnız text taşınıyor, ikinci sürüm
     sessizce düşüyordu. Tek dokunuşla senaryonun yarısı gidiyor ve kullanıcı
     bunu ancak ⇄ ile geçmeye çalışınca fark ediyordu. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
const ALANLAR = ['text2','pos2','shot2','diff2','mark2','surum2'];

/* İki sürümlü, gerçekçi bir senaryo nesnesi */
const SENARYO = {
  id:'abc', title:'Tanıtım', text:'merhaba dünya', pos:12, shot:{0:true}, diff:{3:2}, mark:'x',
  text2:'hello world', pos2:34, shot2:{1:true}, diff2:{5:1}, mark2:'y', surum2:false,
  up:1000, fav:true
};

/* ---------- ÇOĞALTMA (⧉) ---------- */
const rs = cikar(kod, /function renderScripts\(\)\{[\s\S]*?\n\}/, 'renderScripts');
ok('çoğaltma alan alan DEĞİL, nesnenin tamamını kopyalıyor',
   /Object\.assign\(JSON\.parse\(JSON\.stringify\(s\)\)/.test(rs));

/* Çıkarım çökerse ADI OLAN iddia görülsün: aşağıdaki alan kontrollerinin
   hepsi tek bir yığın iziyle kaybolmasın. */
function cogalt(kaynak){
  /* Desen kopyalamanın BİÇİMİNE bağlı olmasın: "st.scripts.unshift(c)" satırına
     kadar olan her şeyi al. Aksi hâlde kopyalama biçimi değişince test kodu
     bulamayıp ÇÖKÜYOR ve alan kontrolleri hiç koşmuyor. */
  const mm = rs.match(/const c=[\s\S]*?;(?=\s*\n?\s*st\.scripts\.unshift\(c\))/);
  ok('çoğaltma kodu bulunabiliyor', !!mm);
  const dup = mm ? mm[0] : 'const c={};';
  return new Function('__s', `
    const s=__s;
    const uid=()=>'yeni';
    const Date={now:()=>9999};
    ${dup}
    return c;
  `)(kaynak);
}
{
  const c = cogalt(SENARYO);
  for(const a of ALANLAR)
    ok('çoğaltmada "'+a+'" taşınıyor', JSON.stringify(c[a]) === JSON.stringify(SENARYO[a]));
  ok('çoğaltmada açık sürümün metni de taşınıyor', c.text === SENARYO.text);
  ok('çoğaltmada bölüm işaretleri taşınıyor', JSON.stringify(c.shot) === JSON.stringify(SENARYO.shot));
  ok('çoğaltma YENİ kimlik alıyor (özgün üzerine yazmıyor)', c.id === 'yeni' && c.id !== SENARYO.id);
  ok('çoğaltma başlıktan ayırt ediliyor', c.title === 'Tanıtım ·');
  ok('çoğaltma tarihi tazeleniyor (listede üste gelsin)', c.up === 9999);
}
{
  /* DERİN kopya olmalı: sığ kopyada iki senaryo aynı nesneyi paylaşır ve
     birinde bölüm işaretlemek diğerini de değiştirir. */
  const c = cogalt(SENARYO);
  c.shot2[1]=false; c.diff[3]=99;
  ok('çoğaltma DERİN kopya (özgün senaryo etkilenmiyor)',
     SENARYO.shot2[1] === true && SENARYO.diff[3] === 2);
}
{
  /* Tek sürümlü eski senaryoda ikinci sürüm alanları HİÇ YOK — bozulmamalı. */
  const eski = {id:'e', title:'Eski', text:'yalnız bir sürüm', up:5};
  const c = cogalt(eski);
  ok('tek sürümlü eski senaryo da çoğaltılabiliyor', c.text === 'yalnız bir sürüm');
  ok('olmayan alan uydurulmuyor', !('text2' in c));
}

/* ---------- ARAMA ---------- */
function ara(sorgu, liste){
  const parca = cikar(rs, /let list=q \? st\.scripts\.filter\([\s\S]*?st\.scripts\.slice\(\);/, 'arama');
  return new Function('__q','__l', `
    const q=__q;
    const st={scripts:__l};
    const norm=s=>String(s||'').toLocaleLowerCase('tr');
    ${parca}
    return list;
  `)(sorgu, liste);
}
const LISTE=[SENARYO, {id:'z', title:'Başka', text:'bambaşka metin', up:2}];
{
  ok('açık sürümün metninde aranıyor', ara('dünya',LISTE).length === 1);
  ok('KAPALI sürümün metninde de aranıyor', ara('hello',LISTE).length === 1);
  ok('kapalı sürümde bulunan senaryo doğru olan', (ara('world',LISTE)[0]||{}).id === 'abc');
  ok('başlıkta aranmaya devam ediyor', (ara('tanıtım',LISTE)[0]||{}).id === 'abc');
  ok('eşleşmeyen sorgu boş dönüyor', ara('kesinlikleyok',LISTE).length === 0);
  ok('boş sorguda tüm liste dönüyor', ara('',LISTE).length === 2);
  ok('ikinci sürümü olmayan senaryo çökertmiyor', ara('bambaşka',LISTE).length === 1);
}

/* ---------- ÇÜRÜYEN HİPOTEZLERİ KİLİTLE ----------
   Bu üç yol bugün doğru çalışıyor ÇÜNKÜ nesnenin tamamını taşıyorlar. Biri
   ileride "alan alan" yazıma dönerse aynı veri kaybı geri gelir. */
const ab = cikar(kod, /function autoBackup\(\)\{[\s\S]*?\n\}/, 'autoBackup');
ok('otomatik yedek senaryoları OLDUĞU GİBİ yazıyor', /scripts:st\.scripts/.test(ab));
const rb = cikar(kod, /function restoreBackup\(\)\{[\s\S]*?\n\}/, 'restoreBackup');
ok('yedekten dönüş senaryo dizisini olduğu gibi geri koyuyor', /st\.scripts=b\.scripts/.test(rb));
const exp = cikar(kod, /\$\('#expBtn'\)\.onclick=\(\)=>\{[\s\S]*?\n\};/, 'dışa aktarma');
ok('dışa aktarma senaryoları olduğu gibi yazıyor', /scripts:st\.scripts/.test(exp));
const imp = cikar(kod, /\$\('#impFile'\)\.onchange=e=>\{[\s\S]*?\n\};/, 'içe aktarma');
ok('içe aktarma senaryo dizisini olduğu gibi alıyor', /st\.scripts=j\.scripts/.test(imp));
ok('silinen senaryo DERİN kopyayla çöpe atılıyor',
   /st\.trash=\(st\.trash\|\|\[\]\)\.concat\(\[JSON\.parse\(JSON\.stringify\(gone\)\)\]\)/.test(kod));

/* ---------- SÜRÜM TAKASI BOZULMADI ----------
   mark/mark2 takas edilmezse bölüm işaretleri siliniyordu — o koruma dursun. */
const sd = cikar(kod, /function surumDegistir\(\)\{[\s\S]*?\n\}/, 'surumDegistir');
for(const [a,b] of [['text','text2'],['pos','pos2'],['shot','shot2'],['diff','diff2'],['mark','mark2']])
  ok('takasta "'+a+'" ↔ "'+b+'" ikisi de yer değiştiriyor',
     new RegExp('s\\.'+a+'=s\\.'+b).test(sd) && new RegExp('s\\.'+b+'=').test(sd));
ok('takas kayıt sürerken engelleniyor', /rec\.state==='recording'/.test(sd));
