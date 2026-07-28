package com.prooftrack.app;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge: web content renders behind the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Keep screen on while the app is foregrounded —
        // prevents the screen sleeping mid-photo during proof capture
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
