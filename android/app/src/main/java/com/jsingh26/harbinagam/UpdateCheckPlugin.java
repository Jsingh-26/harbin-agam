package com.jsingh26.harbinagam;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appdistribution.AppDistributionRelease;
import com.google.firebase.appdistribution.FirebaseAppDistribution;

/**
 * Bridge for the in-app "Check for updates" row. Uses the Firebase App
 * Distribution tester flow: sign-in (once), check, and start the update.
 * Degrades to status "unavailable" when Firebase is not configured
 * (no google-services.json), so unsigned/review builds never crash.
 */
@CapacitorPlugin(name = "UpdateCheck")
public class UpdateCheckPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        final FirebaseAppDistribution distribution;
        try {
            distribution = FirebaseAppDistribution.getInstance();
        } catch (IllegalStateException e) {
            JSObject ret = new JSObject();
            ret.put("status", "unavailable");
            call.resolve(ret);
            return;
        }

        // Testers must be signed in before checkForNewRelease can succeed;
        // sign-in is a no-op when the tester already signed in once.
        distribution.signInTester().addOnCompleteListener(signInTask -> {
            if (!signInTask.isSuccessful()) {
                JSObject ret = new JSObject();
                ret.put("status", "error");
                Exception e = signInTask.getException();
                ret.put("message", e != null && e.getMessage() != null ? e.getMessage() : "sign-in failed");
                call.resolve(ret);
                return;
            }
            distribution.checkForNewRelease().addOnCompleteListener(checkTask -> {
                if (!checkTask.isSuccessful()) {
                    JSObject ret = new JSObject();
                    ret.put("status", "error");
                    Exception e = checkTask.getException();
                    ret.put("message", e != null && e.getMessage() != null ? e.getMessage() : "check failed");
                    call.resolve(ret);
                    return;
                }
                AppDistributionRelease release = checkTask.getResult();
                if (release == null) {
                    JSObject ret = new JSObject();
                    ret.put("status", "latest");
                    call.resolve(ret);
                    return;
                }
                distribution.updateApp();
                JSObject ret = new JSObject();
                ret.put("status", "updating");
                ret.put("version", release.getDisplayVersion());
                call.resolve(ret);
            });
        });
    }
}
