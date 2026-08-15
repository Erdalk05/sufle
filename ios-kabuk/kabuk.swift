import UIKit
import WebKit

/* SUFLE MAĞAZA KABUĞU — ÖLÇÜM SÜRÜMÜ.

   Amaç: uygulamayı App Store'a sokacak kabuğun EN RİSKLİ varsayımını sınamak.
   Varsayım şu: uygulama dosyası pakete gömülüp `file://` ile açılırsa,
   kamera/mikrofon izni ve kalıcı depolama ÇALIŞIR. Bu varsayım tutmazsa
   kabuğun mimarisi değişir (yerel HTTP sunucusu ya da özel şema gerekir),
   yani sonradan değil ŞİMDİ bilinmesi gereken bir şey.

   T51'in dersi burada da geçerli: aylarca ölçülmemiş bir iddia yüzünden
   mağaza kabuğu bloke kaldı. Bu sefer önce ölçüyoruz. */

/* Hangi sayfanın yükleneceği TEK YERDE: ölçüm sayfası mı, gerçek uygulama mı.
   Ölçüm bittiğinde burası "index" kalır ve kabuk gerçek ürünü açar. */
let BUNDLE_SAYFA = ProcessInfo.processInfo.environment["SUFLE_SAYFA"] ?? "index"

class ViewController: UIViewController, WKUIDelegate {
  var web: WKWebView!

  override func viewDidLoad() {
    super.viewDidLoad()
    let c = WKWebViewConfiguration()
    /* Sufle metni tam ekran akıyor: video satır içinde oynamalı, yoksa iOS
       kaydı kendi tam ekran oynatıcısına alır ve sufle görünmez olur. */
    c.allowsInlineMediaPlayback = true
    /* Kamera önizlemesi kullanıcı dokunuşu beklemeden başlamalı. */
    c.mediaTypesRequiringUserActionForPlayback = []
    /* Kalıcı depolama: senaryolar ve çekim arşivi buna bağlı. */
    c.websiteDataStore = WKWebsiteDataStore.default()

    web = WKWebView(frame: view.bounds, configuration: c)
    web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    web.uiDelegate = self
    web.scrollView.bounces = false
    view.addSubview(web)

    guard let u = Bundle.main.url(forResource: BUNDLE_SAYFA, withExtension: "html") else { return }
    web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent())
  }

  /* İZİN DİYALOĞU: bu temsilci yazılmazsa WKWebView kamera/mikrofon isteğini
     SESSİZCE reddeder ve uygulama "kamera açılmıyor" der. Ölçümün kendisi
     bu yüzden buraya bağlı. */
  func webView(_ w: WKWebView, requestMediaCapturePermissionFor o: WKSecurityOrigin,
               initiatedByFrame f: WKFrameInfo, type: WKMediaCaptureType,
               decisionHandler d: @escaping (WKPermissionDecision) -> Void) {
    d(.grant)
  }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(_ a: UIApplication,
                   didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = ViewController()
    window?.makeKeyAndVisible()
    return true
  }
}
