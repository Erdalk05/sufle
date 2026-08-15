import UIKit
import WebKit

class VC: UIViewController {
  var web: WKWebView!
  override func viewDidLoad() {
    super.viewDidLoad()
    let cfg = WKWebViewConfiguration()
    cfg.allowsInlineMediaPlayback = true
    web = WKWebView(frame: view.bounds, configuration: cfg)
    web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(web)
    web.load(URLRequest(url: URL(string: "http://127.0.0.1:8899/")!))
  }
}

class AD: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(_ a: UIApplication, didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = VC()
    window?.makeKeyAndVisible()
    return true
  }
}

UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AD.self))
