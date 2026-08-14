const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const {REPO}=require('./kaynak');
const SUNUCU=path.join(REPO,'yerel-sunucu','iphone_server.py');
const kaynak=fs.readFileSync(SUNUCU,'utf8');

/* E10 — iPHONE HTTPS SUNUCUSU: SIFIR TESTİ VARDI.
   Mac sunucusu tests/29, 56 ve 57 ile sınanıyordu; telefonun kendi sunucusuna
   hiç dokunulmamıştı. Bakınca E9 ve tests/29ta Mac tarafında KAPATILAN İKİ
   KUSURUN İKİSİ DE burada duruyordu — düzeltme bir platformda yapılmış,
   diğerine taşınmamış (gecenin en sık deseni):

   1) ÖLÜ ADRESİ ÇALIŞIYORMUŞ GİBİ GÖSTERİYORDU. lan_ip() başarısız olunca
      127.0.0.1 dönüyor; o adres TELEFONDA telefonun kendisini gösterir.
      Banner "https://127.0.0.1:8443/" yazıyor ve QR olarak da bunu basıyordu:
      telefon QR okuyor, sayfa hiç açılmıyor, sebebi hiçbir yerde yazmıyor.
   2) PORT YEDEĞİ YOKTU. 8443 doluysa (ikinci bir kopya açıksa) Python yığın
      izi basıp çıkıyordu. Mac sunucusunda bu yedek zaten vardı.

   Bu test gerçek süreci başlatır ve HTTPS üzerinden konuşur — kaynak okumakla
   yetinmez. Sertifika kendinden imzalı olduğu için doğrulama kapatılıyor;
   test ettiğimiz şey TLS güveni değil, sunucunun davranışı. */

/* ---------- ORTAM: openssl var mı ---------- */
let opensslVar=true;
try{ execFileSync('openssl',['version'],{stdio:'ignore'}); }catch(e){ opensslVar=false; }
ok('openssl bulunuyor (sertifika üretimi için gerekli)', opensslVar);

const py = (() => { for(const c of ['python3','python']){ try{ execFileSync(c,['-c','1'],{stdio:'ignore'}); return c; }catch(e){} } return null; })();
ok('python bulunuyor', !!py);

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('ölü adres kuralı Mac ile AYNI', /def lan_yok\(ip\):[\s\S]*?ip\.startswith\("127\."\)[\s\S]*?"::1"[\s\S]*?"localhost"/.test(kaynak));
/* GEVŞEK DESEN TUZAĞI (CLAUDE.md): önce `if lan_yok...else...make_qr_ascii`
   arıyordum; ölü dalın İÇİNE QR eklenince de eşleşmeye devam etti, çünkü
   ilerideki else dalı deseni tamamlıyordu. Doğru iddia: ÖLÜ DALIN GÖVDESİNDE
   QR olmamalı. Bloğu önce kes, sonra içinde ara. */
const oluDal=(kaynak.match(/if lan_yok\(ip\):([\s\S]*?)\n    else:/)||[,''])[1];
ok('ölü adres dalı çıkarılabildi', oluDal.length>0);
ok('adres ölüyse QR ÜRETİLMİYOR', !/make_qr_ascii/.test(oluDal));
ok('adres ölüyse adres de basılmıyor', !/https:\/\/%s/.test(oluDal));
ok('çalışan durumda QR basılıyor',
   /else:[\s\S]*?make_qr_ascii\(url\)/.test(kaynak));
ok('adres ölüyse ne yapılacağı yazıyor', /Wi-Fi'ye bağlan ve sunucuyu yeniden başlat/.test(kaynak));
ok('port yedeği var', /for p in range\(ilk, ilk \+ 10\)/.test(kaynak));
ok('gerçek port bildiriliyor (info sabit porta bakmasın)', /PORT = p/.test(kaynak));
ok('tüm portlar doluysa sebebi söyleniyor', /tum portlar dolu|tüm portlar dolu/.test(kaynak));
ok('bağlanmadan önce banner basılmıyor',
   kaynak.indexOf('httpd = http.server.ThreadingHTTPServer') < kaynak.indexOf('iPHONE SUFLE'));

/* Depo GitHub Pages ile PUBLIC. Sertifika ve anahtar asla depoya girmemeli. */
{
  const gi=fs.readFileSync(path.join(REPO,'.gitignore'),'utf8');
  ok('.gitignore pem dosyalarını engelliyor', /\*\.pem/.test(gi));
  const izlenen=execFileSync('git',['ls-files'],{cwd:REPO,encoding:'utf8'});
  ok('depoda hiç pem dosyası yok', !/\.pem/.test(izlenen));
}

if(!opensslVar || !py) { console.log('· ortam eksik, canlı sunucu adımları atlandı'); return; }

/* ---------- CANLI: SUNUCUYU GERÇEKTEN BAŞLAT ---------- */
const os=require('os');
const gecici=fs.mkdtempSync(path.join(os.tmpdir(),'sufle-sunucu-'));
fs.copyFileSync(SUNUCU, path.join(gecici,'iphone_server.py'));
fs.writeFileSync(path.join(gecici,'index.html'),'<h1>SUFLE TEST SAYFASI</h1>');

const {spawn}=require('child_process');
function baslat(port, env){
  const kopya=path.join(gecici,'s'+port+'.py');
  fs.writeFileSync(kopya, kaynak.replace(/^PORT = \d+$/m,'PORT = '+port));
  fs.copyFileSync(path.join(gecici,'index.html'), path.join(gecici,'index.html'));
  return spawn(py,[kopya],{cwd:gecici, env:{...process.env,...(env||{})}, stdio:['ignore','pipe','pipe']});
}
function bekle(ms){ return new Promise(r=>setTimeout(r,ms)); }
function iste(port, yol){
  return new Promise((cb)=>{
    const https=require('https');
    const r=https.request({host:'127.0.0.1',port,path:yol,method:'GET',rejectUnauthorized:false,timeout:4000},
      res=>{ let g=''; res.on('data',d=>g+=d); res.on('end',()=>cb({kod:res.statusCode,govde:g,tip:res.headers['content-type']})); });
    r.on('error',e=>cb({hata:String(e.message)}));
    r.on('timeout',()=>{ r.destroy(); cb({hata:'zaman asimi'}); });
    r.end();
  });
}

/* Kapıda koşuyor: bir iddia patlarsa bile başlatılan süreçler ARKADA KALMASIN.
   Süreç sızdıran bir test, sonraki koşuda portu dolu bularak kendini yanıltır. */
const surecler=[];
process.on('exit',()=>{ surecler.forEach(s=>{ try{ s.kill(); }catch(e){} }); });
(async ()=>{
 try{
  const PORT=18443;
  const s1=baslat(PORT); surecler.push(s1);
  let cikti=''; s1.stdout.on('data',d=>cikti+=d); s1.stderr.on('data',d=>cikti+=d);
  await bekle(2500);

  const kok=await iste(PORT,'/');
  ok('HTTPS ile ana sayfa geliyor', kok.kod===200);
  ok('ana sayfa gerçekten index.html içeriği', /SUFLE TEST SAYFASI/.test(kok.govde||''));
  ok('ana sayfa HTML olarak sunuluyor', /text\/html/.test(kok.tip||''));

  const idx=await iste(PORT,'/index.html');
  ok('index.html yolu da aynı sayfayı veriyor', idx.kod===200 && /SUFLE TEST SAYFASI/.test(idx.govde||''));

  const info=await iste(PORT,'/info');
  ok('/info yanıt veriyor', info.kod===200);
  let j=null; try{ j=JSON.parse(info.govde); }catch(e){}
  ok('/info geçerli JSON', !!j);
  /* PORT YEDEĞİNİN ASIL SINAVI: /info DİNLENEN portu bildirmeli. Mac tarafında
     tam da burada hata vardı — yedek devreye giriyor, /info eski portu
     söylüyordu ve telefon boş bir porta gönderiliyordu. */
  ok('/info DİNLENEN portu bildiriyor (yedek devredeyken de)', j && j.port===PORT);
  ok('/info bir adres bildiriyor', j && typeof j.ip==='string' && j.ip.length>0);

  const yok=await iste(PORT,'/olmayan-yol');
  ok('bilinmeyen yol 404 veriyor', yok.kod===404);
  ok('404 gövdesi sızdırmıyor', (yok.govde||'').length<40);

  /* ---------- PORT YEDEĞİ: İKİNCİ KOPYA ---------- */
  const s2=baslat(PORT); surecler.push(s2);
  let c2=''; s2.stdout.on('data',d=>c2+=d); s2.stderr.on('data',d=>c2+=d);
  await bekle(2500);
  ok('ikinci kopya yığın izi basmıyor', !/Traceback/.test(c2));
  ok('ikinci kopya bir sonraki portu kullanıyor', /doluydu/.test(c2));
  const info2=await iste(PORT+1,'/info');
  ok('yedek port gerçekten dinleniyor', info2.kod===200);
  let j2=null; try{ j2=JSON.parse(info2.govde); }catch(e){}
  ok('yedek portta /info da doğru portu bildiriyor', j2 && j2.port===PORT+1);

  /* ---------- ÖLÜ ADRES: BANNER NE DİYOR ---------- */
  ok('normal durumda adres basılıyor', /https:\/\//.test(cikti));
  ok('normal durumda ölü adres uyarısı YOK', !/Wi-Fi adresi bulunamadı/.test(cikti));

  s1.kill(); s2.kill();
  await bekle(300);

  /* lan_ip() başarısız olduğunda ne yazıyor: fonksiyonu doğrudan sınıyoruz —
     ağı kesmek yerine kuralın kendisini koşturuyoruz. */
  const kural=execFileSync(py,['-c',
    'import sys;sys.path.insert(0,'+JSON.stringify(gecici)+');'+
    'import importlib.util as u;sp=u.spec_from_file_location("s",'+JSON.stringify(path.join(gecici,'s'+PORT+'.py'))+');'+
    'm=u.module_from_spec(sp);sp.loader.exec_module(m);'+
    'print([m.lan_yok(x) for x in ["127.0.0.1","::1","localhost","",None,"192.168.1.20","10.0.0.5"]])'
  ],{encoding:'utf8'}).trim();
  ok('ölü adresler doğru sınıflanıyor (ölçülen '+kural+')',
     kural==='[True, True, True, True, True, False, False]');

 }catch(e){
   ok('canlı sunucu adımları hatasız tamamlandı ('+e.message+')', false);
 } finally {
   surecler.forEach(s=>{ try{ s.kill(); }catch(_){} });
   try{ fs.rmSync(gecici,{recursive:true,force:true}); }catch(_){}
 }
})();
