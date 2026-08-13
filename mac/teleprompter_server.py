#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teleprompter Pro — yerel sunucu.
Bu Mac gösterimi:  http://localhost:8080/
Telefon kumanda:   http://<lan-ip>:8080/remote
Sadece Python standart kütüphanesi (QR için isteğe bağlı 'qrcode').
"""
import http.server, socketserver, threading, queue, json, os, socket
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "Teleprompter Pro.html")
PORT = 8080

clients = []          # SSE kuyrukları
lock = threading.Lock()

def broadcast(obj):
    data = json.dumps(obj)
    with lock:
        for q in list(clients):
            q.put(data)

REMOTE_PAGE = """<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Sufle Kumanda</title>
<style>
 *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
 body{background:#0a0a0c;color:#e8e8ee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
   min-height:100vh;display:flex;flex-direction:column;padding:18px;gap:14px}
 h1{font-size:17px;text-align:center;font-weight:800}h1 b{color:#00C853}
 .big{display:grid;grid-template-columns:1fr 1fr;gap:12px}
 button{font-family:inherit;border:none;border-radius:16px;color:#fff;font-weight:700;
   font-size:18px;padding:22px 0;background:#1c1c22;border:1px solid #2a2a32;cursor:pointer}
 button:active{filter:brightness(1.3)}
 .play{grid-column:1/-1;background:#00C853;color:#04210f;font-size:22px;padding:28px 0}
 .rec{background:#e53935}
 .row{display:flex;gap:12px}.row button{flex:1}
 .field{background:#141418;border:1px solid #2a2a32;border-radius:14px;padding:14px}
 .field label{font-size:13px;color:#8a8a96;display:flex;justify-content:space-between;margin-bottom:8px}
 .field .v{color:#00C853;font-weight:800}
 input[type=range]{width:100%;accent-color:#00C853;height:30px}
 .hint{text-align:center;font-size:12px;color:#555;margin-top:auto}
</style></head><body>
 <h1>Teleprompter <b>Pro</b> · Kumanda</h1>
 <button class="play" data-cmd='{"type":"toggle"}'>▶︎ / ⏸ Başlat / Durdur</button>
 <div class="big">
   <button data-cmd='{"type":"reset"}'>⟲ Başa Sar</button>
   <button data-cmd='{"type":"voice"}'>🎤 Sesle</button>
   <button class="rec" data-cmd='{"type":"rec"}'>● Kayıt</button>
   <button data-cmd='{"type":"cam"}'>📷 Kamera</button>
 </div>
 <div class="row">
   <button data-cmd='{"type":"slower"}'>− Yavaş</button>
   <button data-cmd='{"type":"faster"}'>+ Hızlı</button>
 </div>
 <div class="row">
   <button data-cmd='{"type":"prevLine"}'>↑ Satır</button>
   <button data-cmd='{"type":"nextLine"}'>↓ Satır</button>
 </div>
 <div class="field">
   <label>Hız — WPM <span class="v" id="sv">140</span></label>
   <input type="range" id="speed" min="0" max="320" step="5" value="140">
 </div>
 <div class="field">
   <label>Yazı Boyutu <span class="v" id="fv">64</span></label>
   <input type="range" id="font" min="24" max="160" value="64">
 </div>
 <div class="hint" id="st">Aynı Wi-Fi ağında olmalısınız.</div>
<script>
 function send(o){fetch('/cmd',{method:'POST',body:JSON.stringify(o)}).catch(()=>{});}
 document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>send(JSON.parse(b.dataset.cmd)));
 const sp=document.getElementById('speed'),fo=document.getElementById('font');
 sp.oninput=()=>{document.getElementById('sv').textContent=sp.value;send({type:'speed',value:+sp.value});};
 fo.oninput=()=>{document.getElementById('fv').textContent=fo.value;send({type:'font',value:+fo.value});};
 // bağlantı gerçekten kurulu mu: sessizce kopmuş kumanda en can sıkıcı hâli
 setInterval(()=>{ fetch('/info').then(r=>r.json())
   .then(()=>document.getElementById('st').textContent='✅ Bağlı')
   .catch(()=>document.getElementById('st').textContent='⚠️ Bağlantı koptu — Mac uyandı mı?'); },4000);
</script></body></html>"""

def make_qr(data):
    if not data:
        return None
    try:
        import qrcode, io
        img = qrcode.make(data)
        buf = io.BytesIO(); img.save(buf, format="PNG"); return buf.getvalue()
    except Exception:
        return None

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, ctype, body, headers=None):
        if isinstance(body, str): body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        if headers:
            for k, v in headers.items(): self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try: self.wfile.write(body)
        except Exception: pass

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        if p.path in ("/", "/index.html"):
            try:
                with open(HTML, "rb") as f:
                    self._send(200, "text/html; charset=utf-8", f.read())
            except Exception:
                self._send(404, "text/plain; charset=utf-8", "Teleprompter Pro.html bulunamadı")
        elif p.path == "/remote":
            self._send(200, "text/html; charset=utf-8", REMOTE_PAGE)
        elif p.path == "/info":
            self._send(200, "application/json",
                       json.dumps({"ip": lan_ip(), "port": PORT}))
        elif p.path == "/qr":
            qs = urllib.parse.parse_qs(p.query)
            png = make_qr(qs.get("d", [""])[0])
            if png: self._send(200, "image/png", png)
            else: self._send(404, "text/plain", "qr yok")
        elif p.path == "/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            q = queue.Queue()
            with lock: clients.append(q)
            try:
                self.wfile.write(b": baglandi\n\n"); self.wfile.flush()
                while True:
                    try:
                        data = q.get(timeout=15)
                        self.wfile.write(("data: " + data + "\n\n").encode("utf-8"))
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
            except Exception:
                pass
            finally:
                with lock:
                    if q in clients: clients.remove(q)
        else:
            self._send(404, "text/plain", "yok")

    def do_POST(self):
        p = urllib.parse.urlparse(self.path)
        if p.path == "/cmd":
            n = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(n) if n else b"{}"
            try: obj = json.loads(raw.decode("utf-8"))
            except Exception: obj = {}
            broadcast(obj)
            self._send(200, "application/json", '{"ok":true}')
        else:
            self._send(404, "text/plain", "yok")

def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception:
        return "127.0.0.1"

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    # ÖNCE BAĞLAN, SONRA YAZDIR.
    # Eskiden banner bağlanmadan önce basılıyordu ve /info sabit PORT'u
    # döndürüyordu. 8080 doluysa sunucu 8081'e düşüyor ama HEM banner HEM
    # /info hâlâ 8080 diyordu. Mac arayüzü QR adresini /info'daki porttan
    # kuruyor (setupRemote), yani telefon boş bir porta gönderiliyor ve
    # kumanda sessizce çalışmıyordu — üstelik port yedeği tam da bu durum
    # için eklenmişti. GERÇEK KOŞUYLA ÖLÇÜLDÜ: 8080 meşgulken sunucu 8081'i
    # dinliyor, /info {"port": 8080} döndürüyordu.
    ilk = PORT
    srv = None
    for p in range(ilk, ilk + 10):
        try:
            srv = ThreadingServer(("0.0.0.0", p), Handler)
            PORT = p          # ← /info ve QR artık GERÇEK portu bildiriyor
            break
        except OSError:
            continue
    if srv is None:
        print("  ! %d-%d arası tüm portlar dolu. Açık Teleprompter sunucusu var mı diye bak." % (ilk, ilk + 9))
        raise SystemExit(1)

    ip = lan_ip()
    print("=" * 48)
    print("  TELEPROMPTER PRO — SUNUCU ÇALIŞIYOR")
    print("=" * 48)
    if PORT != ilk:
        print("  ! %d doluydu, %d kullanılıyor." % (ilk, PORT))
    print("  Bu Mac (gösterim):  http://localhost:%d/" % PORT)
    print("  Telefon (kumanda):  http://%s:%d/remote" % (ip, PORT))
    print("  Kapatmak için: Ctrl + C")
    print("=" * 48)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu kapatıldı.")
