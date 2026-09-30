import UIKit
import Capacitor
import GoogleSignIn

/// iOS/iPadOS 27 exige el ciclo de vida UIScene: sin él la app no arranca.
/// Con escenas, las URLs y user activities llegan aquí en lugar de al AppDelegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }

        // Algunos plugins buscan la ventana en el AppDelegate.
        (UIApplication.shared.delegate as? AppDelegate)?.window = window

        if let context = connectionOptions.urlContexts.first {
            open(context)
        }
        if let userActivity = connectionOptions.userActivities.first {
            continueActivity(userActivity)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach(open)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        continueActivity(userActivity)
    }

    private func open(_ context: UIOpenURLContext) {
        if GIDSignIn.sharedInstance.handle(context.url) {
            return
        }
        var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
        options[.sourceApplication] = context.options.sourceApplication
        options[.annotation] = context.options.annotation
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: options)
    }

    private func continueActivity(_ userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
