const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), cp=require('child_process');
const repo=path.resolve(__dirname,'..');
const yol=process.env.SUFLE_CANLI || path.join(repo,'canli.py');
const src=fs.readFileSync(yol,'utf8');

/* v9.27 yayın kapısı — canlı betik eski sürümü gördüğü hâlde diğer yüzeyler
   açıldığı için yanlış biçimde "temiz" diyebiliyordu. Saf karar fonksiyonunu
   gerçek Python kaynağından koşturuyoruz; testte kopya karar mantığı yok. */
ok('canlı betik okunabildi', src.length>1000);
ok('beklenen sürüm kanon index.html dosyasından okunuyor',
   /def beklenen_surum\(\):/.test(src) && /re\.search\(r"VER=/.test(src));
ok('tek ölçüm için saf sorun listesi var', /def olcum_sorunlari\(sonuc, beklenen\):/.test(src));
ok('ana akış kanon sürümü ölçümden önce okuyor', /beklenen = beklenen_surum\(\)/.test(src));
ok('ana akış gerçek sonucu sürüm kapısına veriyor', /olcum_sorunlari\(s, beklenen\)/.test(src));

const py=`
import json, runpy
m=runpy.run_path(${JSON.stringify(yol)})
f=m['olcum_sorunlari']
b={'surum':'9.27','suflePaneli':True,'metinVar':True,'tasma':False,'hatalar':0,'gizliDugme':0,'panolar':[('ayarlar','açıldı')]}
def d(**k):
 x=dict(b); x.update(k); return x
print(json.dumps([
 f(b,'9.27'),
 f(d(surum='9.26'),'9.27'),
 f(d(surum=None),'9.27'),
 f(d(hatalar=2),'9.27'),
 f(d(gizliDugme=1),'9.27'),
 f(d(panolar=[('ayarlar','AÇILMADI')]),'9.27')
], ensure_ascii=False))
`;
const r=cp.spawnSync('python3',['-c',py],{encoding:'utf8'});
ok('saf canlı kapı Python içinde koşturulabildi'+(r.stderr?' — '+r.stderr.trim():''), r.status===0);
let o=[]; try{o=JSON.parse(r.stdout)}catch(e){}
ok('doğru sürüm ve sağlam yüzey temiz geçiyor', Array.isArray(o[0]) && o[0].length===0);
ok('eski canlı sürüm kırmızı sebep üretiyor', (o[1]||[]).some(x=>/9\.26/.test(x)&&/9\.27/.test(x)));
ok('okunamayan sürüm kırmızı sebep üretiyor', (o[2]||[]).some(x=>/YOK/.test(x)));
ok('çalışma zamanı hatası artık sessiz geçmiyor', (o[3]||[]).some(x=>/2 çalışma zamanı/.test(x)));
ok('sıfır genişlikli görünür düğme artık sessiz geçmiyor', (o[4]||[]).some(x=>/1 sıfır genişlikli/.test(x)));
ok('açılmayan ana pano kırmızı sebep üretiyor', (o[5]||[]).some(x=>/açılmayan ana pano/.test(x)));
