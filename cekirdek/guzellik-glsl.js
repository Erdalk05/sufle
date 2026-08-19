/* GÜZELLİK (YÜZ YUMUŞATMA) GÖLGELENDİRİCİSİ — tek kaynak, iki kabuk.

   NEDEN ÇEKİRDEKTE: v9.33'te bu kod YALNIZ telefonda yazılıydı ve masaüstü
   sürüm notu "masaüstünde kompozit boru hattı yok" diyerek özelliği atlıyordu.
   Ölçüm o gerekçeyi çürüttü: Mac'te kırpma (varsayılan AÇIK) zaten WebGL
   boru hattını koşturuyor — yani eksik olan boru hattı değil, bu birkaç
   satırdı. Kopyalasaydım eşik ve yarıçap iki dosyada ayrı ayrı yaşar ve
   aynı çekim iki ekranda farklı yumuşarken kimse sebebini bulamazdı.

   YÖNTEM — DÜZ BULANIKLIK DEĞİL, KENAR KORUYAN YUMUŞATMA:
   8 komşu örneğin AĞIRLIĞI, merkeze göre PARLAKLIK FARKIYLA düşürülüyor
   (fakir adamın bilateral süzgeci). Ten gibi düşük kontrastlı alanlar
   yumuşuyor; göz, kaş, saç ve dudak sınırı olduğu gibi kalıyor. Düz
   bulanıklık bunların hepsini siler ve yüz hamurlaşır — "güzellik" değil
   "maske" olur.

   ÖRNEKLER ELLE AÇILDI: bazı mobil GPU'larda döngü içinde doku örneklemesi
   güvenilir derlenmiyor.

   ⚠️ KULLANAN KABUĞUN SORUMLULUĞU:
     · Piksel adımı değişkeni (px) kabukta tanımlı olmalı — telefonda
       keskinlik de kullanıyor, bu yüzden burada ikinci kez TANIMLANMIYOR;
       GLSL çift tanımı derlemeyi kırar ve boru hattı sessizce kurulmaz.
     · `bty` 0 iken fonksiyon İLK SATIRDA çıkıyor: kapalıyken tek fazladan
       doku okuması bile yapılmıyor. */
const GUZELLIK_GLSL =
  'uniform float bty;'+
  'float wsk(vec3 s,float l0){float d=abs(dot(s,vec3(0.299,0.587,0.114))-l0);'+
  'return 1.0-smoothstep(0.045,0.17,d);}'+
  'vec3 skinSoft(vec2 t,vec3 c0){'+
  'if(bty<=0.0) return c0;'+
  'float R=2.6;'+
  'vec2 a1=vec2(px.x*R,0.0), a2=vec2(0.0,px.y*R);'+
  'vec2 a3=vec2(px.x*R,px.y*R)*0.7071, a4=vec2(px.x*R,-px.y*R)*0.7071;'+
  'vec3 s1=texture2D(tex,t+a1).rgb, s2=texture2D(tex,t-a1).rgb;'+
  'vec3 s3=texture2D(tex,t+a2).rgb, s4=texture2D(tex,t-a2).rgb;'+
  'vec3 s5=texture2D(tex,t+a3).rgb, s6=texture2D(tex,t-a3).rgb;'+
  'vec3 s7=texture2D(tex,t+a4).rgb, s8=texture2D(tex,t-a4).rgb;'+
  'float l0=dot(c0,vec3(0.299,0.587,0.114));'+
  'float w1=wsk(s1,l0),w2=wsk(s2,l0),w3=wsk(s3,l0),w4=wsk(s4,l0);'+
  'float w5=wsk(s5,l0),w6=wsk(s6,l0),w7=wsk(s7,l0),w8=wsk(s8,l0);'+
  'float wt=1.0+w1+w2+w3+w4+w5+w6+w7+w8;'+
  'vec3 bl=(c0+s1*w1+s2*w2+s3*w3+s4*w4+s5*w5+s6*w6+s7*w7+s8*w8)/wt;'+
  'return mix(c0,bl,bty);}';
