#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iPhone Sufle — HTTPS sunucusu.
iOS Safari kameraya yalnızca HTTPS'te izin verir; bu yüzden kendinden imzalı
bir sertifika üretip telefona güvenli (https) sayfa sunarız.
Telefon: https://<mac-ip>:8443/  (ilk açılışta 'güvenmiyorum' uyarısına 'yine de aç' deyin)
"""
import http.server, ssl, socket, os, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "index.html")
CERT = os.path.join(HERE, "cert.pem")
KEY  = os.path.join(HERE, "key.pem")
PORT = 8443

def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception:
        return "127.0.0.1"

def ensure_cert(ip):
    if os.path.exists(CERT) and os.path.exists(KEY):
        return True
    cnf = os.path.join(HERE, "_openssl.cnf")
    with open(cnf, "w") as f:
        f.write(
            "[req]\ndistinguished_name=dn\nx509_extensions=v3\nprompt=no\n"
            "[dn]\nCN=iPhone Sufle\n"
            "[v3]\nsubjectAltName=IP:%s,DNS:localhost\n" % ip
        )
    try:
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:2048",
             "-keyout", KEY, "-out", CERT, "-days", "825", "-nodes",
             "-config", cnf, "-extensions", "v3"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print("Sertifika üretilemedi:", e)
        return False
    finally:
        try: os.remove(cnf)
        except Exception: pass

def make_qr_ascii(url):
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url); qr.make()
        qr.print_ascii(invert=True)
    except Exception:
        pass

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, ctype, body):
        if isinstance(body, str): body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try: self.wfile.write(body)
        except Exception: pass
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            try:
                with open(HTML, "rb") as f:
                    self._send(200, "text/html; charset=utf-8", f.read())
            except Exception:
                self._send(404, "text/plain", "index.html yok")
        elif self.path == "/info":
            self._send(200, "application/json", json.dumps({"ip": lan_ip(), "port": PORT}))
        else:
            self._send(404, "text/plain", "yok")

if __name__ == "__main__":
    ip = lan_ip()
    if not ensure_cert(ip):
        print("OpenSSL gerekli. Kurulu mu kontrol edin."); raise SystemExit(1)
    url = "https://%s:%d/" % (ip, PORT)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT, KEY)
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    print("=" * 50)
    print("  iPHONE SUFLE — HTTPS SUNUCU ÇALIŞIYOR")
    print("=" * 50)
    print("  Telefon Safari'de aç:")
    print("     " + url)
    print("  (İlk açılışta 'Bu Bağlantı Özel Değil' -> Ayrıntıları")
    print("   Göster -> Bu Siteyi Ziyaret Et deyin. Sonra kamera çalışır.)")
    print("=" * 50)
    print("  QR (telefon kamerasıyla okutun):\n")
    make_qr_ascii(url)
    print("\n  Kapatmak için: Ctrl + C")
    print("=" * 50)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nKapatıldı.")
