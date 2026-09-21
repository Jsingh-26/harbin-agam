package com.jsingh26.harbinagam;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor creates the Bridge inside super.onCreate() (via load()),
        // so plugins must be registered BEFORE it, not after.
        registerPlugin(UpdateCheckPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
