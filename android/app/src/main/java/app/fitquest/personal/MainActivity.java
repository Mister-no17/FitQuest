package app.fitquest.personal;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SpotifyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
