package com.jsingh26.harbinagam;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

/**
 * Native Android TextToSpeech bridge. WebView speechSynthesis proved
 * unreliable on the user's device (utterances silently dropped across four
 * builds); the platform TTS engine does not have the WebView failure modes.
 */
@CapacitorPlugin(name = "NativeTts")
public class NativeTtsPlugin extends Plugin {
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private volatile String initError = null;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                try {
                    Locale enIn = new Locale("en", "IN");
                    if (tts.isLanguageAvailable(enIn) >= TextToSpeech.LANG_AVAILABLE) {
                        tts.setLanguage(enIn);
                    } else {
                        tts.setLanguage(Locale.ENGLISH);
                    }
                    tts.setSpeechRate(0.9f);
                    ready = true;
                } catch (Exception e) {
                    initError = "language setup failed: " + e.getMessage();
                }
            } else {
                initError = "init failed with status " + status;
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("empty text");
            return;
        }
        if (!ready) {
            call.reject("native tts not ready" + (initError != null ? " (" + initError + ")" : " (still initialising)"));
            return;
        }
        Float rate = call.getFloat("rate", 0.9f);
        tts.setSpeechRate(rate != null ? rate : 0.9f);
        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
        String utteranceId = "ha-" + System.currentTimeMillis();
        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
        if (result == TextToSpeech.SUCCESS) {
            call.resolve();
        } else {
            call.reject("speak returned " + result);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("ready", ready);
        out.put("error", initError);
        String engine = null;
        if (ready) {
            try {
                engine = tts.getDefaultEngine();
            } catch (Exception ignored) {
                engine = null;
            }
        }
        out.put("engine", engine);
        call.resolve(out);
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.handleOnDestroy();
    }
}
