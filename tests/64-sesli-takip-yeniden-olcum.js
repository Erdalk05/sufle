const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* SESLİ TAKİP, GECE YAPILAN KONUM DÜZELTMELERİNİ GERİ ALIYORDU
   A5/A4/Y1'de düzeltilen şey şuydu: düzen değişince (döndürme, yazı boyutu,
   harf aralığı…) okunan KELİME korunmalı, piksel değil.

   Ama sesli takibin hedefi de PİKSEL:
     vTarget = wordTops[wi] - eyeOff()
   ve easeLoop her karede pos'u vTarget'a doğru çekiyor. Yeniden ölçümden sonra
   wordTops değişiyor, eski vTarget BAŞKA bir kelimeyi gösteriyor — yani takip
   döngüsü, az önce düzelttiğimiz konumu hemen geri bozuyordu. Düzeltme sesli
   takip AÇIKKEN işe yaramıyordu ve bu, düzeltmenin en çok gerektiği durum.

   İKİNCİ BOŞLUK: normWords YALNIZCA takip başlarken kuruluyordu (buildNorm tek
   çağrı). Senaryo ya da sürüm değişince — hatta biyonik okuma açılınca —
   buildContent DOM'u baştan kuruyor ama liste ESKİ metinden kalıyordu:
   ekranda yeni metin, eşleştirmede eski metin. Kullanıcı okuduğu hâlde sufle
   onu bulamıyor. */

const yo=cikar(kod,/function yenidenOlc\(\)\{[\s\S]*?\n\}/,'yenidenOlc');
const bc=cikar(kod,/function buildContent\(\)\{[\s\S]*?\n\}/,'buildContent');

/* ---------- YENİDEN ÖLÇÜMDEN SONRA HEDEF TAZELENİYOR ---------- */
ok('yeniden ölçümden sonra sesli takip hedefi kuruluyor', /if\(voiceOn\) syncVoicePtr\(\);/.test(yo));
ok('hedef tazeleme konum düzeltildikten SONRA',
   yo.indexOf('setPos(Math.max(0, Math.min(maxPos, wordTops[i]-eyeOff())))') < yo.indexOf('if(voiceOn) syncVoicePtr()'));
ok('takip kapalıyken boşuna çağrılmıyor', /if\(voiceOn\) syncVoicePtr\(\)/.test(yo));

/* syncVoicePtr gerçekten hedefi ve işaretçiyi yeni düzene göre kuruyor mu */
const sp=cikar(kod,/function syncVoicePtr\(\)\{[\s\S]*?\n\}/,'syncVoicePtr');
ok('hedef güncel konuma çekiliyor', /vTarget=pos;/.test(sp));
ok('son duyulan kelimeler temizleniyor (eski eşleşme sürüklenmesin)', /recent\.length=0/.test(sp));
ok('işaretçi konumdan yeniden hesaplanıyor', /wordTops\[mid\]<=y/.test(sp));

/* Hedefin PİKSEL olduğu — düzeltmenin gerekçesi. Değişirse gerekçe de değişir. */
ok('sesli takip hedefi piksel olarak hesaplanıyor', /vTarget=Math\.max\(0,wordTops\[wi\]-eyeOff\(\)\)/.test(kod));
ok('akış döngüsü pos ile hedef farkını kapatıyor', /const d=vTarget-pos;/.test(kod));

/* ---------- SAYIYLA: TAZELENMEZSE NE OLUR ---------- */
{
  const EYE=200, N=300;
  const tops=(k,lh)=>Array.from({length:N},(_,i)=>EYE+Math.floor(i/k)*lh+lh/2);
  const ESKI=tops(8,60), YENI=tops(6,84);          // yazı boyutu büyüdü
  const K=150;
  const eskiHedef=Math.max(0,ESKI[K]-EYE);          // ölçümden önceki vTarget
  const dogruPos=Math.max(0,YENI[K]-EYE);           // düzeltmenin koyduğu konum
  ok('yeniden ölçümden sonra eski hedef yeni konumdan uzak',
     Math.abs(eskiHedef-dogruPos) > 100);
  /* easeLoop farkı kapatacağı için sufle geri kayardı. */
  const yakin=(t,y)=>{let lo=0,hi=t.length-1,i=-1;while(lo<=hi){const m=(lo+hi)>>1;if(t[m]<=y){i=m;lo=m+1}else hi=m-1}
                      const j=i+1;if(j<t.length&&Math.abs(t[j]-y)<(i>=0?Math.abs(y-t[i]):Infinity))return j;return i;};
  const kayanKelime=yakin(YENI, eskiHedef+EYE);
  ok('eski hedefe kayınca başka kelimeye gidilirdi ('+kayanKelime+'. kelime)', kayanKelime !== K);
  ok('sapma göz ardı edilemez (>20 kelime)', Math.abs(kayanKelime-K) > 20);
}

/* ---------- İÇERİK YENİDEN KURULUNCA KELİME LİSTESİ TAZELENİYOR ---------- */
ok('içerik yeniden kurulunca normalleştirilmiş liste tazeleniyor', /if\(voiceOn\) buildNorm\(\);/.test(bc));
ok('tazeleme kelimeler toplandıktan SONRA',
   bc.indexOf('words=[...scroller.querySelectorAll') < bc.indexOf('if(voiceOn) buildNorm()'));
ok('takip kapalıyken boşuna kurulmuyor', /if\(voiceOn\) buildNorm\(\)/.test(bc));
ok('liste kelimelerin GÜNCEL metninden kuruluyor',
   /normWords=words\.map\(/.test(cikar(kod,/function buildNorm\(\)\{[\s\S]*?\n\}/,'buildNorm')));

/* Bu boşluğun tetikleyicileri: sürüm değiştirme, senaryo seçme, biyonik. */
ok('sürüm değiştirme içeriği yeniden kuruyor',
   /buildContent\(\)/.test(cikar(kod,/function surumDegistir\(\)\{[\s\S]*?\n\}/,'surumDegistir')));
ok('senaryo seçme içeriği yeniden kuruyor',
   /buildContent\(\)/.test(cikar(kod,/function selectScript\(id\)\{[\s\S]*?\n\}/,'selectScript')));
ok('biyonik okuma içeriği yeniden kuruyor',
   /buildContent\(\);/.test(cikar(kod,/const k=s\.dataset\.t;[\s\S]*?\n\}\);/,'anahtarlar')));

/* ---------- TAKİP BAŞLANGICI BOZULMADI ---------- */
ok('takip başlarken hâlâ ölçüp liste kuruyor',
   /measure\(\); buildNorm\(\); vTarget=pos;/.test(kod));
ok('elle sardıktan sonra hâlâ yeniden eşleniyor',
   /if\(voiceOn\) syncVoicePtr\(\);                                          \/\/ takip yeni konumdan devam etsin/.test(kod));
