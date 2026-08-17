const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* KAYIT SÜRERKEN KAMERA/MİKROFON DEĞİŞTİRME
   openCam()'in İLK İŞİ mevcut akışın bütün izlerini durdurmak:
     if(stream) stream.getTracks().forEach(x=>x.stop());
   MediaRecorder tam da o izlerden kaydediyor. Kayıt sürerken çağrılırsa
   çekimin SESİ (kompozit kapalıysa görüntüsü de) o saniyede ölür. Kayıt
   devam eder, kullanıcı konuşmaya devam eder, sonuç sessiz çıkar.
   "Video izi öldü" gözcüsü de yakalamaz: o yalnız VİDEO izini dinliyor.

   Yedi çağrı yolu vardı, YALNIZ BİRİ korumalıydı (arka plandan dönüşteki
   yeniden bağlanma). Korumasızlar: mikrofon değiştirme, çözünürlük
   değiştirme, ön/arka kamera, ham ses, güvenli ses, mikrofon tazeleme,
   kamerayı yeniden aç.

   Tek tek düğme korumak yerine BOĞAZ NOKTASI korundu: openCam'in kendisi. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
const openCam = cikar(kod, /async function openCam\(\)\{[\s\S]*?\n\}/, 'openCam');

/* ---------- KORUMA GERÇEKTEN ÇALIŞIYOR MU ---------- */
function kos(kayitta){
  const iz=[];
  const f=new Function('__iz','__k', `
    const rec = __k ? {state:'recording'} : null;
    const toast=m=>__iz.push('toast:'+m);
    const m=k=>k;
    let stream={ getTracks:()=>[{stop:()=>__iz.push('IZLER DURDURULDU')}] };
    /* Korumadan sonrasına hiç gelinmemeli; gelinirse burada patlar ve
       testin çökmesi de bir sinyaldir. */
    const stopMeter=()=>__iz.push('devam-etti');
    /* Önizleme nöbetçisi (2026-08-17) kamera değişiminde durduruluyor:
       kareler MEŞRU olarak duruyor, donma sanılmasın. Simülasyonda sahte. */
    const onizIzleDurdur=()=>__iz.push('nöbetçi-durdu');
    ${openCam.replace(/\n {4}stopMeter\(\);[\s\S]*$/, '\n    stopMeter();\n    return true;\n  }catch(e){ return false; }\n}')}
    return openCam;
  `);
  return f(iz,kayitta)().then(r=>({iz,sonuc:r}));
}

(async () => {
{
  const {iz,sonuc} = await kos(true);
  ok('kayıt sürerken kamera yeniden AÇILMIYOR', sonuc === false);
  ok('kayıt sürerken izler DURDURULMUYOR (çekimin sesi ölmüyor)',
     !iz.includes('IZLER DURDURULDU'));
  ok('kayıt sürerken sebebi söyleniyor', iz.some(x=>/toast:camBusyRec/.test(x)));
  ok('kayıt sürerken hiç ilerlemiyor', !iz.includes('devam-etti'));
  /* Nöbetçi bile boğaz noktasının ARDINDA: kayıt sürerken hiçbir şeye
     dokunulmuyor. */
  ok('kayıt sürerken önizleme nöbetçisine de dokunulmuyor', !iz.includes('nöbetçi-durdu'));
}
{
  const {iz,sonuc} = await kos(false);
  ok('kayıt yokken kamera normal açılıyor', sonuc === true);
  ok('kayıt yokken eski akış temizleniyor', iz.includes('IZLER DURDURULDU'));
  ok('kayıt yokken gereksiz uyarı çıkmıyor', !iz.some(x=>/camBusyRec/.test(x)));
}

/* ---------- KORUMA DOĞRU YERDE Mİ ----------
   İzler durdurulduktan SONRA kontrol etmek hiçbir işe yaramaz.
   indexOf tuzağı: koruma HİÇ yoksa -1 döner ve "-1 < n" doğru çıkar,
   yani eksikliği "sırası doğru" diye geçirirdi. Varlığını ayrıca sın. */
ok('koruma openCam içinde var', openCam.includes("rec.state==='recording'"));
ok('koruma, izleri durdurmadan ÖNCE',
   openCam.includes("rec.state==='recording'") &&
   openCam.indexOf("rec.state==='recording'") < openCam.indexOf('getTracks().forEach(x=>x.stop())'));
ok('koruma false döndürüyor (çağıranlar başarısızlığı görebilsin)',
   /rec\.state==='recording'\)\{ toast\(m\('camBusyRec'\)\); return false; \}/.test(openCam));

/* ---------- HER ÇAĞRI YOLU ARTIK KORUNUYOR ----------
   Boğaz noktası korunduğu için tek tek düğmelerde guard aranmıyor;
   önemli olan hiçbir yolun openCam'i ATLAMAMASI. */
const yollar = [...kod.matchAll(/\bopenCam\(\)/g)].length;
ok('birden çok çağrı yolu var ve hepsi aynı kapıdan geçiyor ('+yollar+' çağrı)', yollar >= 5);
ok('kamerayı doğrudan açan başka bir yol yok (getUserMedia yalnız openCam içinde)',
   (kod.match(/getUserMedia\(/g)||[]).length === (openCam.match(/getUserMedia\(/g)||[]).length);

/* ---------- MESAJ ---------- */
ok('mesaj iki dilde tanımlı', (tel.match(/camBusyRec:'/g)||[]).length >= 2);
ok('mesaj ne yapılacağını söylüyor (önce kaydı durdur)',
   /camBusyRec:'[^']*durdur/.test(tel));

/* ---------- KOMŞU KORUMALAR BOZULMASIN ---------- */
ok('arka plandan dönüşteki yeniden bağlanma hâlâ kayıt korumalı',
   /visibilityState!=='visible'[\s\S]{0,200}?rec && rec\.state==='recording'\) return;/.test(kod));
ok('kayıt sürerken senaryo değiştirilemez korumasi duruyor',
   /rec && rec\.state==='recording'\)\{ toast\(m\('recBusy'\)\); return; \}/.test(kod));
})();
