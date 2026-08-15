/* E.4 · PROVA RAPORU — ORTAK ÇEKİRDEK.
   İki kabuk da aynı hesabı kullanır. Kopyalansaydı biri düzeltilip diğeri
   unutulurdu; bu depoda en pahalı hata sınıfı tam olarak budur.
   Çizim (provaYaz) kabuğa özeldir — DOM'ları farklı.

   Rakip matrisinde bu satır BOŞ: on bir üründen hiçbirinde çekimden sonra
   "nasıl okudum" cevabı yok. Sunucu da yapay zekâ da gerekmiyor — veri zaten
   cihazda: `cekimAltyazi` her kelimenin okuma çizgisinden geçtiği anı taşıyor
   (altyazı bundan üretiliyor).

   DÜRÜSTLÜK SINIRI: damgalar çizgiyi KİMİN sürdüğünü ölçer. Sesle takip
   açıkken konuşmacıyı, kapalıyken suflenin sabit akışını. Kapalıyken "gerçek
   hız" kullanıcının kendi WPM ayarıdır ve rapor ona kendi ayarını geri söyler
   — bu yüzden o durumda hız ve duraklama YAZILMIYOR, sebebi söyleniyor.

   DOLGU KELİME (şey/yani/ııı) BİLEREK YOK: onu ölçmek için konuşmanın
   METNİNİ saklamak gerekir. Tanıma metni bugün hiçbir yere yazılmıyor ve
   gizlilik metnimiz "konuşmanız cihazda tutulmaz" diyor. Ölçemediğimiz şeyi
   ölçüyormuş gibi göstermek yerine yazmıyoruz. */
const PROVA_DURAKLAMA=1.2;   // sn — bundan uzun boşluk kullanıcıya duraklama gibi gelir
function provaRapor(kaynak, sesle){
  if(!Array.isArray(kaynak)) return null;
  const okunan=kaynak.filter(w=>w.t!=null);
  /* Az kelimeyle istatistik yanıltır: 8 kelimelik bir çekimde tek duraklama
     "hızın çok değişken" der. Eşiğin altında rapor GÖSTERİLMİYOR. */
  if(okunan.length<12) return null;
  const bas=okunan[0].t, son=okunan[okunan.length-1].t, sure=son-bas;
  if(!(sure>1)) return null;
  const r={kelime:okunan.length, sure, sesle,
           okunmayan:kaynak.length-okunan.length};
  r.wpm=Math.round(okunan.length/sure*60);

  /* Duraklamalar: ardışık iki kelime damgası arasındaki boşluk. */
  const dur=[];
  for(let i=1;i<okunan.length;i++){
    const d=okunan[i].t-okunan[i-1].t;
    if(d>=PROVA_DURAKLAMA) dur.push({sn:d, sonra:okunan[i-1].s, t:okunan[i-1].t});
  }
  dur.sort((a,b)=>b.sn-a.sn);
  r.duraklama=dur.length;
  r.duraklamaToplam=dur.reduce((a,b)=>a+b.sn,0);
  r.enUzun=dur[0]||null;

  /* Tempo tutarlılığı: 10 saniyelik pencerelerde hız. Tek bir ortalama,
     "başta yavaş sonda koşuyor" durumunu tümden gizler. */
  const P=10, kova={};
  okunan.forEach(w=>{ const k=Math.floor((w.t-bas)/P); kova[k]=(kova[k]||0)+1; });
  const anahtar=Object.keys(kova).map(Number).sort((a,b)=>a-b);
  /* Son pencere yarım kalmış olabilir. İlk yazımda onu tümden atıyordum ve
     19,75 saniyelik bir çekimde ikinci pencere %97 dolu olmasına rağmen
     düşüyordu — tempo hiç raporlanmıyordu (test yakaladı). Artık pencere
     GERÇEK süresiyle oranlanıyor; yalnız yarıdan kısa kalan son parça
     atılıyor, çünkü 1-2 saniyelik bir kuyruk uçuk bir hız üretir. */
  const hizlar=anahtar.map(k=>{
    const span=Math.min(sure,(k+1)*P)-k*P;
    return span>=P*0.5 ? Math.round(kova[k]/span*60) : null;
  }).filter(v=>v!=null);
  if(hizlar.length>=2){
    r.enYavas=Math.min(...hizlar); r.enHizli=Math.max(...hizlar);
    r.pencere=hizlar.length;
  }
  return r;
}
