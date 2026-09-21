package com.jsingh26.harbinagam;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appdistribution.FirebaseAppDistribution;
import com.google.firebase.appdistribution.FirebaseAppDistributionException;
import com.google.firebase.appdistribution.UpdateStatus;
import com.google.firebase.appdistribution.UpdateTask;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bridge for the in-app "Check for updates" row. Uses the recommended
 * all-in-one App Distribution flow, updateIfNewReleaseAvailable(): it
 * signs the tester in once (browser), checks for a newer release, and
 * shows the native update dialog when one exists. Status is reported
 * back through progress events so the WebView always gets an answer.
 * Degrades to "unavailable" when Firebase is not configured.
 */
@CapacitorPlugin(name = "UpdateCheck")
public class UpdateCheckPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        final AtomicBoolean answered = new AtomicBoolean(false);
        final FirebaseAppDistribution distribution;
        try {
            distribution = FirebaseAppDistribution.getInstance();
        } catch (Throwable e) {
            answer(call, answered, "unavailable", null);
            return;
        }
        try {
            UpdateTask task = distribution.updateIfNewReleaseAvailable();
            task.addOnProgressListener(progress -> {
                UpdateStatus s = progress.getUpdateStatus();
                if (s == null) return;
                switch (s) {
                    case NEW_RELEASE_NOT_AVAILABLE:
                        answer(call, answered, "latest", null);
                        break;
                    case NEW_RELEASE_CHECK_FAILED:
                        answer(call, answered, "error", "release check failed");
                        break;
                    case DOWNLOAD_FAILED:
                    case INSTALL_FAILED:
                        answer(call, answered, "error", s.name().toLowerCase().replace('_', ' '));
                        break;
                    case UPDATE_CANCELED:
                    case INSTALL_CANCELED:
                        answer(call, answered, "canceled", null);
                        break;
                    case DOWNLOADED:
                    case REDIRECTED_TO_PLAY:
                        answer(call, answered, "updating", null);
                        break;
                    default:
                        break; // PENDING / DOWNLOADING: the native dialog shows progress
                }
            });
            task.addOnCompleteListener(t -> {
                if (!t.isSuccessful()) {
                    answer(call, answered, "error", describe(t.getException()));
                } else {
                    answer(call, answered, "done", null);
                }
            });
        } catch (Throwable t) {
            answer(call, answered, "error", describe(t));
        }
    }

    private void answer(PluginCall call, AtomicBoolean answered, String status, String message) {
        if (!answered.compareAndSet(false, true)) return;
        JSObject ret = new JSObject();
        ret.put("status", status);
        if (message != null) ret.put("message", message);
        call.resolve(ret);
    }

    private String describe(Throwable e) {
        if (e == null) return "unknown error";
        if (e instanceof FirebaseAppDistributionException) {
            FirebaseAppDistributionException fe = (FirebaseAppDistributionException) e;
            String code = fe.getErrorCode() != null ? fe.getErrorCode().name() : "ERROR";
            String msg = fe.getMessage() != null ? fe.getMessage() : code;
            return code + ": " + msg;
        }
        return e.getClass().getSimpleName() + (e.getMessage() != null ? ": " + e.getMessage() : "");
    }
}
