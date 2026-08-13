const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* İKİ SÜRÜMLÜ SENARYO
   Aynı içeriğin ikinci dildeki (ya da ikinci anlatımdaki) hâli. İki ayrı
   senaryo tutulduğunda biri düzenlenip diğeri unutuluyordu.

   Uygulama TAKAS ile çalışıyor: aktif olan hep `text`, diğeri `text2`.
   Sebebi mimari — active().text kod tabanında altı yerden okunuyor; ikinci
   sürümü ayrı alandan okutmak o altı yeri de değiştirmeyi gerektirirdi.

   Takasın asıl tehlikesi: konum, bölüm çekim işaretleri, zorlanma haritası
   ve METİN DAMGASI da taşınmazsa damgaKontrol() takası "metin değişti"
   sanıp diğer sürümün bütün işaretlerini SİLER. Kullanıcı sürüm değiştirip
   geri dönünce çektiği bölümlerin işaretlerini kaybetmiş olur. */

const surumSrc = cikar(tel, /function surumDegistir\(\)\{[\s\S]*?\n\}/, 'surumDegistir');

function calistir(senaryo, {kayitta=false}={}){
  const iz=[];
  const kur=new Function('__s','__iz','__kayitta', `
    const s=__s;
    const rec = __kayitta ? {state:'recording'} : null;
    let maxPos=100000, voiceOn=false;
    const active=()=>s;
    const toast=x=>__iz.push('toast:'+x);
    const m=k=>k;
    const rememberPos=()=>__iz.push('konumYazildi');
    const pullEditor=()=>__iz.push('editorAlindi');
    const save=()=>__iz.push('kaydedildi');
    const fillEditor=()=>__iz.push('editorDolduruldu');
    const renderScripts=()=>{}, buildContent=()=>__iz.push('icerikKuruldu');
    const reset=()=>__iz.push('sifirlandi');
    const setPos=p=>__iz.push('konum:'+p);
    const syncVoicePtr=()=>{};
    const surumRozeti=()=>__iz.push('rozet');
    const $=()=>null;
    ${cikar(tel, /function ikinciSurumVar\(\)\{[^\n]*\}/, 'ikinciSurumVar')}
    ${surumSrc}
    surumDegistir();
  `);
  kur(senaryo, iz, kayitta);
  return {s:senaryo, iz};
}

/* ---------- TAKAS: HER ŞEY BERABER GİDİYOR MU ---------- */
{
  const s={ id:'a', text:'TÜRKÇE METİN', pos:120, shot:{0:true,1:true}, diff:{3:2}, mark:'tr-damga',
            text2:'ENGLISH TEXT', pos2:45, shot2:{0:true}, diff2:{1:1}, mark2:'en-damga' };
  const r=calistir(s);
  ok('aktif metin ikinci sürüme geçiyor', s.text === 'ENGLISH TEXT');
  ok('eski metin ikinci sürüme taşınıyor (kaybolmuyor)', s.text2 === 'TÜRKÇE METİN');
  ok('kaldığın yer sürümle birlikte geliyor', s.pos === 45);
  ok('eski konum saklanıyor', s.pos2 === 120);
  ok('bölüm çekim işaretleri sürümle geliyor', JSON.stringify(s.shot) === '{"0":true}');
  ok('eski sürümün işaretleri KAYBOLMUYOR', JSON.stringify(s.shot2) === '{"0":true,"1":true}');
  ok('zorlanma haritası da taşınıyor', JSON.stringify(s.diff) === '{"1":1}' && JSON.stringify(s.diff2) === '{"3":2}');
  /* Damga taşınmazsa damgaKontrol takası "metin değişti" sanıp işaretleri siler. */
  ok('METİN DAMGASI da taşınıyor (işaretleri koruyan şey bu)',
     s.mark === 'en-damga' && s.mark2 === 'tr-damga');
  ok('hangi sürümde olduğumuz işaretleniyor', s.surum2 === true);
  ok('değişiklik diske yazılıyor', r.iz.includes('kaydedildi'));
  /* indexOf TUZAĞI: çağrı hiç yoksa -1 döner ve "-1 < n" DOĞRU çıkar —
     yani eksikliği "sıra doğru" diye geçirir. Kasıtlı bozma turunda bu
     iddia hiç kırılmadı. Varlık ayrıca sınanmalı. */
  ok('editördeki değişiklikler takastan ÖNCE alınıyor',
     r.iz.includes('editorAlindi') &&
     r.iz.indexOf('editorAlindi') < r.iz.indexOf('kaydedildi'));
  ok('konum takastan ÖNCE yazılıyor',
     r.iz.includes('konumYazildi') &&
     r.iz.indexOf('konumYazildi') < r.iz.indexOf('kaydedildi'));
  ok('yeni sürümün konumuna gidiliyor', r.iz.includes('konum:45'));
  ok('kullanıcıya hangi sürümde olduğu söyleniyor',
     r.iz.some(x=>/^toast:verSwitched/.test(x)));
}

/* ---------- GERİ DÖNÜŞ: İKİ TAKAS BAŞA GETİRMELİ ---------- */
{
  const s={ id:'b', text:'BİR', pos:10, shot:{0:true}, diff:{}, mark:'m1',
            text2:'İKİ', pos2:20, shot2:{1:true}, diff2:{}, mark2:'m2' };
  calistir(s); calistir(s);
  ok('iki takas sonrası metin başa dönüyor', s.text === 'BİR' && s.text2 === 'İKİ');
  ok('iki takas sonrası konumlar başa dönüyor', s.pos === 10 && s.pos2 === 20);
  ok('iki takas sonrası işaretler başa dönüyor',
     JSON.stringify(s.shot) === '{"0":true}' && JSON.stringify(s.shot2) === '{"1":true}');
  ok('iki takas sonrası sürüm göstergesi 1\'e dönüyor', s.surum2 === false);
}

/* ---------- GERİYE DÖNÜK UYUMLULUK ----------
   text2/pos2/shot2 alanları 2026-08-13'te eklendi. ESKİ senaryolarda yok;
   undefined'a dokunmak senaryoyu açılmaz hâle getirirdi. */
{
  const eski={ id:'c', text:'Eski senaryo metni', pos:33, up:1 };   // 2. sürüm alanları YOK
  const r=calistir(eski);
  ok('ESKİ senaryoda takas çökmüyor', typeof eski.text === 'string');
  ok('eski senaryonun metni ikinci sürüme taşınıyor', eski.text2 === 'Eski senaryo metni');
  ok('boş ikinci sürüm boş metinle açılıyor (undefined değil)', eski.text === '');
  ok('eksik konum 0 sayılıyor', eski.pos === 0 && eski.pos2 === 33);
  ok('eksik işaret nesneleri boş nesne oluyor',
     JSON.stringify(eski.shot) === '{}' && JSON.stringify(eski.shot2) === '{}');
  ok('eski senaryoda da kaydediliyor', r.iz.includes('kaydedildi'));
}

/* ---------- KORUMALAR ---------- */
{
  const s={ id:'d', text:'metin', pos:0 };
  const r=calistir(s, {kayitta:true});
  ok('kayıt sürerken sürüm değişmiyor', s.text === 'metin' && s.text2 === undefined);
  ok('kayıt sürerken sebebi söyleniyor', r.iz.some(x=>/recBusy/.test(x)));
  ok('kayıt sürerken hiçbir şey kaydedilmiyor', !r.iz.includes('kaydedildi'));
}
{
  const bos={ id:'e', text:'   ', pos:0 };
  const r=calistir(bos);
  ok('iki sürüm de boşken uyarıyor', r.iz.some(x=>/verEmpty/.test(x)));
  ok('boşken takas yapılmıyor', !r.iz.includes('kaydedildi'));
}

/* ---------- ARAYÜZE BAĞLI MI ---------- */
ok('editörde sürüm düğmesi var', /id="verBtn"/.test(tel));
ok('düğme surumDegistir\'e bağlı', /\$\('#verBtn'\)\.onclick=surumDegistir/.test(tel));
ok('düğme adlandırılmış (ekran okuyucu)', /id="verBtn" aria-label="/.test(tel));
ok('rozet senaryo değişince de tazeleniyor (fillEditor)',
   /function fillEditor\(\)\{[^\n]*surumRozeti\(\)/.test(tel));
ok('metinler iki dilde tanımlı',
   (tel.match(/verSwitch:'/g)||[]).length >= 2 && (tel.match(/verEmpty:'/g)||[]).length >= 2);

/* Etiket DİL ADI değil sürüm numarası olmalı: uygulama metnin hangi dilde
   olduğunu bilmiyor, "TR/EN" yazmak yanlış bilgi verirdi. */
const rozetSrc = cikar(tel, /function surumRozeti\(\)\{[\s\S]*?\n\}/, 'surumRozeti');
ok('rozet sürüm numarası gösteriyor, dil adı değil',
   /'⇄ '\+\(s&&s\.surum2\?'2':'1'\)/.test(rozetSrc) && !/TR|EN/.test(rozetSrc));
