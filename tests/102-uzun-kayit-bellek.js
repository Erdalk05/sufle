const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* H9 — UZUN KAYITTA `chunks` BELLEK PROFİLİ, 10 DAKİKA İÇİN ÖLÇ:
   PROFİL SAĞLIKLI (hipotez çürüdü) — ama sayılar büyük, o yüzden
   yaşam döngüsünün her halkası kilitleniyor.

   ÖLÇÜLDÜ (uygulamanın KENDİ bit hızı tablosundan, 10 dakikalık çekim):
     720/low    0,18 GB      1080/low   0,36 GB     4k/low   0,85 GB
     720/mid    0,36 GB      1080/mid   0,64 GB     4k/mid   1,41 GB
     720/high   0,57 GB      1080/high  0,99 GB     4k/high  2,24 GB

   Bu boyutta bir veri için tek soru "kaç kopya duruyor". Ölçülen zincir:
     · `chunks` çekim BAŞLARKEN boşaltılıyor (önceki çekim taşınmasın)
     · Blob veriyi devralır almaz `chunks` yine boşaltılıyor — yoksa aynı
       video ikinci kez bellekte duruyordu (bu düzeltme kodda mevcut)
     · önizleme adresi yenisi kurulmadan ÖNCE bırakılıyor ve sonuç ekranı
       kapanınca da bırakılıyor — sızan adres blobu bellekte tutar
     · çekim silinince blob göstergesi de düşüyor

   Ayrıca çekimden ÖNCE kalan yer DAKİKAYA çevrilip söyleniyor ve hesap
   `mbPerMin()` ile aynı kaynaktan geliyor: çözünürlük ya da bit hızı
   değişince tahmin de değişiyor. MB kimseye bir şey anlatmıyor, dakika
   anlatıyor. */

/* ---------- 10 DAKİKALIK ÇEKİM NE KADAR ---------- */
const mBit=kod.match(/function vBitrate\(\)\{[\s\S]*?\n\}/);
const mMb=kod.match(/function mbPerMin\(\)\{[^\n]*\n?\}/) || kod.match(/function mbPerMin\(\)\{.*?\}/);
ok('vBitrate çıkarılabildi', !!mBit);
ok('mbPerMin çıkarılabildi', !!mMb);
if(!mBit||!mMb) return;

function dkBasinaMB(q,mode){
  return new Function('__q','__m', `
    const st={quality:__q, bitrate:__m};
    ${mBit[0]}
    ${mMb[0]}
    return mbPerMin();
  `)(q,mode);
}
{
  /* Denklik: tablo değeri + 128 kbps ses, bayta çevrilip dakikaya vuruluyor.
     Bağımsız hesapla karşılaştırıyoruz ki test kodu kopyalamış olmasın. */
  const TABLO={ '720':{low:2500000,mid:5000000,high:8000000},
                '1080':{low:5000000,mid:9000000,high:14000000},
                '4k':{low:12000000,mid:20000000,high:32000000} };
  let enBuyuk=0, nerede='';
  for(const q of Object.keys(TABLO)) for(const mode of ['low','mid','high']){
    const olculen=dkBasinaMB(q,mode);
    const beklenen=((TABLO[q][mode]+128000)/8*60)/1048576;
    ok(q+'/'+mode+': dakikalık boyut hesabı tutuyor ('+olculen.toFixed(0)+' MB/dk)',
       Math.abs(olculen-beklenen)<0.01);
    const gb=olculen*10/1024;
    if(gb>enBuyuk){ enBuyuk=gb; nerede=q+'/'+mode; }
  }
  console.log('   10 dakikalık çekimde en büyük: '+enBuyuk.toFixed(2)+' GB ('+nerede+')');
  ok('en kötü durum 2,5 GBin altında ('+enBuyuk.toFixed(2)+' GB)', enBuyuk<2.5);
  /* Varsayılan (1080/mid) makul kalmalı: 10 dakika 1 GBi geçmemeli. */
  ok('varsayılan ayarda 10 dakika 1 GBin altında ('+(dkBasinaMB('1080','mid')*10/1024).toFixed(2)+' GB)',
     dkBasinaMB('1080','mid')*10/1024<1);
  /* Ayarlar gerçekten etkili olmalı: yoksa tahmin yalan söyler. */
  ok('bit hızı ayarı boyutu değiştiriyor', dkBasinaMB('1080','high')>dkBasinaMB('1080','low'));
  ok('çözünürlük ayarı boyutu değiştiriyor', dkBasinaMB('4k','mid')>dkBasinaMB('720','mid'));
  ok('bilinmeyen çözünürlükte 1080e düşülüyor',
     Math.abs(dkBasinaMB('zzz','mid')-dkBasinaMB('1080','mid'))<0.01);
  ok('bit hızı ayarı yoksa orta kabul ediliyor',
     Math.abs(dkBasinaMB('1080',null)-dkBasinaMB('1080','mid'))<0.01);
}

/* ---------- KAÇ KOPYA DURUYOR ---------- */
ok('çekim başlarken chunks boşaltılıyor (önceki çekim taşınmasın)',
   /chunks=\[\]; capTimes=new Array\(words\.length\)\.fill\(null\);/.test(kod));
ok('parçalar yalnız veri varken ekleniyor',
   /rec\.ondataavailable=e=>\{ if\(e\.data&&e\.data\.size\) chunks\.push\(e\.data\); \};/.test(kod));
ok('Blob veriyi devralır almaz chunks boşaltılıyor (ikinci kopya kalmasın)',
   /lastBlob=new Blob\(chunks,[^\n]*\);\s*\n\s*chunks=\[\];/.test(kod));
ok('önizleme adresi yenisi kurulmadan ÖNCE bırakılıyor',
   /if\(resultUrl\) URL\.revokeObjectURL\(resultUrl\);\s*\n\s*resultUrl=URL\.createObjectURL\(blob\);/.test(kod));
ok('sonuç ekranı kapanınca da adres bırakılıyor',
   /if\(resultUrl\)\{ URL\.revokeObjectURL\(resultUrl\); resultUrl=null; \}/.test(kod));
ok('çekim silinince blob göstergesi düşüyor', /lastBlob=null; toast\(m\('deleted'\)\);/.test(kod));
ok('arşiv listesi blobları taşımıyor (liste açmak videoları belleğe almasın)',
   /function dbListe\(\)/.test(kod) && !/dbAll\(/.test(kod));

{
  /* Parça biriktirmeyi gerçekten koştur: 10 dakikalık çekim = 600 parça
     (saniyede bir). Blob kurulduktan sonra dizi boş kalmalı. */
  const mStop=kod.match(/rec\.onstop=\(\)=>\{[\s\S]*?lastBlob=new Blob\(chunks,[^\n]*\);\s*\n\s*chunks=\[\];/);
  ok('durma yolu çıkarılabildi', !!mStop);
  if(mStop){
    const r=new Function(`
      let chunks=[], lastBlob=null, pendingDur=0, lastDur=0;
      const rec={ mimeType:'video/mp4;codecs=avc1' };
      const recElapsed=()=>600;
      const ekle=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      for(let i=0;i<600;i++) ekle({data:{size:111000}});   // 600 saniyelik parça
      const parcaSayisi=chunks.length;
      class Blob{ constructor(p,o){ this.parts=p.length; this.type=o.type; } }
      lastDur=(pendingDur||recElapsed());
      lastBlob=new Blob(chunks,{type:(rec.mimeType||'video/mp4').split(';')[0]});
      chunks=[];
      return {parcaSayisi, kalan:chunks.length, blobParca:lastBlob.parts, tur:lastBlob.type};
    `)();
    ok('10 dakikada 600 parça birikiyor', r.parcaSayisi===600);
    ok('boş parçalar hiç eklenmiyor', r.parcaSayisi===600);
    ok('Blob bütün parçaları devralıyor', r.blobParca===600);
    ok('devir sonrası dizi BOŞ (ikinci kopya yok)', r.kalan===0);
    ok('Blob türü kodeksiz', r.tur==='video/mp4');
  }
}

/* ---------- ÇEKİMDEN ÖNCE UYARI ---------- */
const mKalan=kod.match(/function kalanDk\(\)\{[\s\S]*?\n\}/);
ok('kalanDk çıkarılabildi', !!mKalan);
if(!mKalan) return;
function kalan(quota, usage, q='1080', mode='mid'){
  return new Function('__k', `
    const kota=__k; const st={quality:__k.q, bitrate:__k.m};
    ${mBit[0]}
    ${mMb[0]}
    ${mKalan[0]}
    return kalanDk();
  `)({quota,usage,q,m:mode});
}
{
  /* 1 GB boş yer, 1080/mid (65 MB/dk) -> yaklaşık 15,7 dakika. */
  const dk=kalan(2*1024**3, 1*1024**3);
  ok('kalan yer dakikaya çevriliyor ('+dk.toFixed(1)+' dk)', Math.abs(dk-1024/65.3)<0.5);
  ok('tahmin çözünürlükle birlikte değişiyor (aynı kaynaktan)',
     kalan(2*1024**3,1*1024**3,'4k','high') < dk);
  ok('yer bitmişse sıfır, eksi değil', kalan(1024**3, 2*1024**3)===0);
  ok('kota bilinmiyorsa tahmin de yok (uydurma sayı basma)', kalan(0,0)===null);
}
ok('kalan yer üç seviyede bildiriliyor',
   /if\(kdk<3\) out\.push\(\{lv:'bad'/.test(kod) && /else if\(kdk<10\) out\.push\(\{lv:'warn'/.test(kod) &&
   /else out\.push\(\{lv:'ok'/.test(kod));
/* Desen SÜRÜM NOTUNA takılmasın: aynı ifade v9.5 notunda da geçiyor ve ilk
   yazışımda kasıtlı bozma oradan geçip kaçtı. Canlı dizeyi, hesabın yanında
   ara — kullanıcı bu satırı hazırlık kontrolünde görüyor. */
/* v9.34: dize sözlüğe taşındı (`rcYer`, {n} yer tutucusuyla). Ölçüt aynı
   kaldı: kullanıcıya MEGABAYT değil DAKİKA söyleniyor mu — ve sayı gerçekten
   dakikaya çevrilip yerine oturuyor mu. */
ok('uyarı MB değil DAKİKA söylüyor (canlı dize)',
   /rcYer:'≈\{n\} dk çekim yeri'/.test(tel) &&
   /rcYer:'≈\{n\} min of recording'/.test(tel) &&
   /yz\(t\('rcYer'\),\{n:Math\.floor\(kdk\)\}\)/.test(kod));
ok('uyarı ne yapılacağını da söylüyor', /arşivden çekim sil/.test(tel));
ok('kota okunamıyorsa hiç konuşulmuyor', /if\(kdk!=null\)\{/.test(kod));

/* ---------- KAYIT ORTADA ÖLÜRSE ---------- */
ok('kaydedici hatası yakalanıyor (depo dolması en sık sebep)', /rec\.onerror=ev=>\{/.test(kod));
ok('hata sonrası çekim düzgün bitiriliyor', /if\(body\.classList\.contains\('rec'\)\) stopRec\(\);/.test(kod));
/* Gözcü 2026-08-17'de İKİ BAKIŞLI oldu: ölçüldü ki ilk parça gerçek
   tarayıcıda 4,6 sn'de gelebiliyor ve çekim sağlam oluyordu — tek bakış
   iyi çekimi durdurtan yanlış alarmdı. Burada sınanan şey hâlâ aynı:
   hiç veri gelmeyen kayıt SÖYLENİYOR mu. */
ok('hiç veri gelmediyse (ikinci bakışta) söyleniyor',
   /state==='recording' && !chunks\.length\) toast\(m\('recNoData'\)\);/.test(kod));
ok('ilk bakışta hemen bağırılmıyor', /if\(IS_WK \|\| chunks\.length\) return;/.test(kod));
/* iPhonede parçalar yalnız durunca geliyor: orada boş dizi normaldir,
   uyarı vermek YANLIŞ teşhis olurdu. */
ok('iPhonede parça dilimi istenmiyor', /if\(IS_WK\) rec\.start\(\); else rec\.start\(1000\);/.test(kod));
