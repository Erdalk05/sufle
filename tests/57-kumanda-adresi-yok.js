const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {REPO, macYolu, oku, cikar}=require('./kaynak');
const sunucu=fs.readFileSync(path.join(REPO,'mac','teleprompter_server.py'),'utf8');
const mac=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* LAN ADRESİ BULUNAMAYINCA ÖLÜ ADRES ÇALIŞIYORMUŞ GİBİ BİLDİRİLİYORDU
   lan_ip() başarısız olunca "127.0.0.1" dönüyor. Bu adres TELEFON İÇİN ÖLÜDÜR:
   telefonda 127.0.0.1 telefonun kendisini gösterir, Mac'i değil.

   İki yerde de sessizdi:
   · Sunucu banner'ı  →  "Telefon (kumanda): http://127.0.0.1:8080/remote"
     yani çalışmayacak bir adresi normal bir adres gibi yazıyordu.
   · Mac sayfası      →  /info'dan 127.0.0.1 gelince location.host'a düşüyor
     (localhost) ve QR'a onu basıyordu. Telefon QR'ı okuyor, kendine bağlanmaya
     çalışıyor, sayfa hiç açılmıyor ve sebebi HİÇBİR YERDE yazmıyor.

   Aynı sınıf daha önce port yedeğinde de çıkmıştı (tests/29): mekanizma var,
   bildirilen değer yanlış. */

/* ---------- SUNUCU: ölü adres ayırt ediliyor mu ---------- */
ok('ulaşılamaz adresi ayırt eden yardımcı var', /def lan_yok\(ip\):/.test(sunucu));
{
  const {execFileSync}=require('child_process');
  let python=null;
  for(const c of ['python3','python']){
    try{ execFileSync(c,['-c','1'],{stdio:'ignore'}); python=c; break; }catch(e){}
  }
  if(python){
    const kod=`
import importlib.util,sys
spec=importlib.util.spec_from_file_location("srv", ${JSON.stringify(path.join(REPO,'mac','teleprompter_server.py'))})
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
for ip in ["127.0.0.1","127.1.2.3","::1","localhost","",None,"192.168.1.42","10.0.0.7"]:
    print(repr(ip), m.lan_yok(ip))
`;
    const cikti=execFileSync(python,['-c',kod],{encoding:'utf8'});
    const sonuc={};
    cikti.trim().split('\n').forEach(l=>{ const [a,b]=l.split(/\s+(?=True|False)/); sonuc[a]=b==='True'; });
    ok('127.0.0.1 ulaşılamaz sayılıyor', sonuc["'127.0.0.1'"] === true);
    ok('127.x.x.x tümü ulaşılamaz sayılıyor', sonuc["'127.1.2.3'"] === true);
    ok('::1 ulaşılamaz sayılıyor', sonuc["'::1'"] === true);
    ok('localhost ulaşılamaz sayılıyor', sonuc["'localhost'"] === true);
    ok('boş adres ulaşılamaz sayılıyor', sonuc["''"] === true && sonuc["None"] === true);
    ok('gerçek LAN adresi ulaşılabilir sayılıyor',
       sonuc["'192.168.1.42'"] === false && sonuc["'10.0.0.7'"] === false);
  } else {
    console.log('… Python yok, lan_yok ölçümü atlandı');
  }
}
ok('banner ölü adresi normal adres gibi yazmıyor',
   /if lan_yok\(ip\):[\s\S]{0,200}?Wi-Fi adresi bulunamadı/.test(sunucu));
ok('banner ne yapılacağını söylüyor',
   /Mac'i Wi-Fi'ye bağla ve sunucuyu yeniden başlat/.test(sunucu));
ok('gerçek adres varken eski davranış duruyor',
   /else:\s*\n\s*print\("  Telefon \(kumanda\):  http:\/\/%s:%d\/remote" % \(ip, PORT\)\)/.test(sunucu));

/* ---------- MAC SAYFASI: çalışmayacak QR gösterilmiyor ---------- */
const kur=cikar(mac,/const yerelMi = [\s\S]*?img\.src='\/qr\?d='\+encodeURIComponent\(url\);/,'QR kurulumu');
ok('adres yerel mi diye bakılıyor', /const yerelMi = /.test(kur));
ok('yerelse QR gizleniyor', /if\(yerelMi\)\{[\s\S]{0,200}?img\.style\.display='none';/.test(kur));
ok('yerelse adres yerine sebep yazılıyor', /Wi-Fi adresi bulunamadı/.test(kur));
ok('yerelse kullanıcıya bildiriliyor', /toast\(/.test(kur));
ok('yerelse QR üretimine hiç gidilmiyor',
   kur.indexOf('return;') < kur.indexOf("img.src='/qr"));
{
  const f=new Function('host',"return /^(localhost|127\\.|\\[?::1\\]?)/i.test(host);");
  ok('localhost yakalanıyor', f('localhost:8080') === true);
  ok('127.0.0.1 yakalanıyor', f('127.0.0.1:8080') === true);
  ok('IPv6 yerel adres yakalanıyor', f('[::1]:8080') === true);
  ok('gerçek LAN adresi geçiyor', f('192.168.1.42:8080') === false);
  ok('10.x ağı da geçiyor', f('10.0.0.7:8080') === false);
  /* 127 ile BAŞLAMAYAN ama içinde 127 geçen adres yanlışlıkla elenmemeli. */
  ok('içinde 127 geçen gerçek adres elenmiyor', f('192.168.127.5:8080') === false);
}

/* ---------- ESKİ DAVRANIŞ KORUNDU ---------- */
ok('gerçek adreste QR hâlâ üretiliyor', /img\.src='\/qr\?d='\+encodeURIComponent\(url\)/.test(kur));
ok('gerçek adreste adres metni hâlâ yazılıyor', /\$\('#remoteUrl'\)\.textContent=host\+'\/remote'/.test(kur));
ok('port yedeği düzeltmesi duruyor (/info gerçek portu bildiriyor)',
   /PORT = p          # ← \/info ve QR artık GERÇEK portu bildiriyor/.test(sunucu));
