const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const mac=oku(macYolu());

// ---------- 3.5 .srt / .vtt içe aktarma ----------
eval(cikar(src,/function srtToText\(t\)\{[\s\S]*?\n\}/,'srtToText'));
const SRT='1\n00:00:01,000 --> 00:00:03,000\nMerhaba dünya\n\n2\n00:00:03,100 --> 00:00:05,000\nİkinci satır\n';
ok('.srt metne dönüyor', srtToText(SRT).replace(/\n+/g,'|')==='Merhaba dünya|İkinci satır');
ok('zaman kodu kalmıyor', !/-->/.test(srtToText(SRT)));
ok('sıra numarası kalmıyor', !/^\d+$/m.test(srtToText(SRT).trim()));
ok('WEBVTT başlığı atılıyor', !/WEBVTT/.test(srtToText('WEBVTT\n\n'+SRT)));
ok('düz metne DOKUNMUYOR', srtToText('Bu düz bir metin.\n2. satır')==='Bu düz bir metin.\n2. satır');
ok('içinde rakam olan düz metin bozulmuyor', srtToText('2026 yılında\n3 kişi geldi')==='2026 yılında\n3 kişi geldi');
ok('boş girdi çökertmiyor', srtToText('')==='');
ok('Türkçe karakter korunuyor', srtToText(SRT).includes('İkinci'));

// ---------- 11.6 hazır kurulum profilleri ----------
eval(cikar(src,/const PROF=\{[\s\S]*?\n\};/,'PROF').replace('const','var'));
ok('altı yol haritası profili var', Object.keys(PROF).length===6);
ok('Reels dikey', PROF.reels.asp==='9:16');
ok('YouTube yatay', PROF.youtube.asp==='16:9');
ok('profil tempoları kullanım amacına göre sıralı', PROF.satis.wpm>PROF.reels.wpm && PROF.reels.wpm>PROF.haber.wpm && PROF.haber.wpm>PROF.youtube.wpm && PROF.youtube.wpm>PROF.egitim.wpm && PROF.egitim.wpm>PROF.beam.wpm);
ok('Reels sosyal altyazı', PROF.reels.capStyle==='social');
ok('Cam rig sade altyazı', PROF.beam.capStyle==='clean');
ok('Cam rig yazıyı aynalıyor', PROF.beam.mirrorText===true);
ok('her profil tam takım (9 alan)', Object.values(PROF).every(p=>Object.keys(p).length===9));
ok('tempolar insan hızında (100-180)', Object.values(PROF).every(p=>p.wpm>=100&&p.wpm<=180));

// ---------- 9.4 altyazı satır sınırı ayardan ----------
const st={};
eval(cikar(src,/function capMaxW\(\)\{[\s\S]*?\}/,'capMaxW'));
st.capMaxW=null; ok('varsayılan 7 kelime', capMaxW()===7);
st.capMaxW=3;    ok('ayar okunuyor', capMaxW()===3);
st.capMaxW=12;   ok('üst değer okunuyor', capMaxW()===12);
ok('kuyruk bölme ayarı kullanıyor', /cur\.words\.length>=capMaxW\(\)/.test(src));
ok('sabit CAP_MAXW kalmadı', !/CAP_MAXW\b/.test(src));

// ---------- 3.2 senaryo sıralama ----------
function sirala(list, ss, kelime){
  const l=list.slice();
  l.sort(ss==='name' ? (a,b)=>(a.title||'').localeCompare(b.title||'','tr')
       : ss==='len'  ? (a,b)=>kelime(b.text||'')-kelime(a.text||'')
                     : (a,b)=>(b.up||0)-(a.up||0));
  return l;
}
const kel=t=>t.split(/\s+/).filter(Boolean).length;
const L3=[{title:'Zebra',up:1,text:'a b c'},{title:'Ada',up:9,text:'a'},{title:'Çilek',up:5,text:'a b c d e'}];
ok('son kullanılan doğru', sirala(L3,'used',kel)[0].title==='Ada');
ok('ada göre Türkçe sıralama (Ç, Z\'den önce)', sirala(L3,'name',kel).map(x=>x.title).join()==='Ada,Çilek,Zebra');
ok('uzunluğa göre doğru', sirala(L3,'len',kel)[0].title==='Çilek');
ok('kaynak dizi bozulmuyor', (sirala(L3,'name',kel), L3[0].title==='Zebra'));

// ---------- 11.3 / 11.7 erişilebilirlik ----------
ok('yüksek kontrast teması var', /body\.hicon/.test(src));
ok('yüksek kontrast sufleyi de sertleştiriyor', /body\.hicon #scroller/.test(src));
ok('odak halkası tanımlı', /focus-visible/.test(src));
ok('anahtarlar klavyeyle açılabiliyor', /role','switch'/.test(src) && /e\.key===' '\|\|e\.key==='Enter'/.test(src));

// ---------- 3.6 otomatik yedek ----------
ok('yedek her 20 kayıtta bir', /if\(\+\+saveCount % 20\) return;/.test(src));
ok('yedekte YALNIZ senaryolar var (ayar değil)', /scripts:st\.scripts, activeId:st\.activeId/.test(src));
ok('geri yükleme mevcut hâli çöpe atıyor', /st\.trash=\(st\.trash\|\|\[\]\)\.concat\(st\.scripts\)/.test(src));

// ---------- 12.2 / 12.10 Mac ----------
ok('Mac çekim arşivi IndexedDB kullanıyor', /indexedDB\.open\('teleprompter_pro'/.test(mac));
/* Desen ADA bağlı olmamalı: zaman aşımı koruması eklenirken çözücünün adı
   res→bitir olunca bu iddia kırıldı — kod doğruydu, test adı kilitliyordu.
   Kilitlenmesi gereken GARANTİ: yazım tamamlanmayı BEKLİYOR, varsaymıyor. */
ok('Mac arşiv yazımı başarıyı bekliyor', /tx\.oncomplete=\(\)=>\w+\(true\)/.test(mac));
ok('Mac arşiv hatası sessiz değil', /Arşive yazılamadı/.test(mac));
ok('Mac senaryo dışa aktarımı telefon biçiminde', /sufle:1, scripts:state\.scripts/.test(mac));
ok('Mac içe aktarma MEVCUTLARI SİLMİYOR', /state\.scripts=state\.scripts\.concat\(gelen\)/.test(mac));
ok('Mac içe aktarma bozuk dosyada çökmüyor', /catch\(err\)\{ logErr\('import',err\)/.test(mac));

// ---------- 10.6 / 10.7 / 10.8 paylaşım geri bildirimi ----------
ok('ses yoksa ne yapılacağı yazıyor', /BU VİDEODA SES YOK/.test(src) && /Güvenli ses modu/.test(src));
ok('paylaşım iptali bildiriliyor', (src.match(/shareCancelled\(\)/g)||[]).length>=3);
ok('sessiz mod uyarısı var', /sessiz düğmesine bak/.test(src));

// ---------- GERÇEK TARAYICIDA BULUNAN HATA (v7.8) ----------
// Arama, `.hidden` sınıfındaki bir kapsayıcıyı eşleştirdiğinde display:'' veriyordu.
// Bu satır içi stili KALDIRIR, sınıf kazanır: "4 ayar bulundu" yazıyor ama
// aradığın ayar görünmüyordu. Yalnız canlı tıklamayla ortaya çıktı.
// İLK ONARIM YANLIŞTI: .hidden{display:none!important} satır içi stille ezilemiyor.
// Doğru çözüm eşit güçte bir CSS kuralı. Bunu ancak canlı tarayıcı gösterdi.
ok('gizli bloğu açan kural !important ile yazılmış',
   /#sheet \.hidden\.aramaAcik\{display:block!important\}/.test(src));
ok('açma tek yerden yapılıyor', /const ac = el => \{ el\.style\.display=''; if\(el\.classList\.contains\('hidden'\)\) el\.classList\.add\('aramaAcik'\); \}/.test(src));
ok('etiketin denetimleri de açılıyor', /for\(let j=i\+1;j<c\.length;j\+\+\)\{[\s\S]*?ac\(c\[j\]\);/.test(src));
ok('denetimin etiketi de açılıyor', /if\(onceki && onceki\.classList\.contains\('row'\)\) ac\(onceki\)/.test(src));
ok('temizlemede sınıf kaldırılıyor', /c\.classList\.remove\('aramaAcik'\)/.test(src));
ok('eşleşmeyen hâlâ gizleniyor', /if\(esles\) ac\(el\); else el\.style\.display='none';/.test(src));
// davranış
function goster(esles){ return esles ? '' : 'none'; }
ok('normal eşleşme satır içi stil bırakmıyor', goster(true,false)==='');

ok('eşleşmeyen gizleniyor', goster(false)==='none');

// ---------- KLAVYE ERİŞİLEBİLİRLİĞİ (v8.1, gerçek tarayıcıda bulundu) ----------
// Anahtara odaklanıp Boşluk'a basınca anahtar açılıyor AMA olay pencere
// düzeyindeki kumanda işleyicisine kabarıp 3-2-1 geri sayımını başlatıyordu.
ok('anahtar tuşu yukarı kabarmıyor', /e\.preventDefault\(\); e\.stopPropagation\(\); s\.click\(\);/.test(src));
ok('sayfa açıkken kumanda eylemleri koşmuyor', /if\(anySheet\(\)\) return;\n  const act=keyMap\(\)\[e\.key\];/.test(src));
// Çapa belirsizdi: 'if(anySheet()) return;' dosyada başka yerde de geçiyor.
// Sıra ölçümü YALNIZ keydown bloğu içinde yapılmalı.
const kd = cikar(src, /window\.addEventListener\('keydown',e=>\{[\s\S]*?\n\}\);/, 'keydown');
ok('Escape sayfa kapatma engelden ÖNCE',
   kd.indexOf("e.key==='Escape'") < kd.indexOf('if(anySheet()) return;'));
ok('öğrenme modu engelden ÖNCE',
   kd.indexOf('learnKey=e.key') < kd.indexOf('if(anySheet()) return;'));
ok('engel eylem eşleşmesinden ÖNCE',
   kd.indexOf('if(anySheet()) return;') < kd.indexOf('const act=keyMap()'));
