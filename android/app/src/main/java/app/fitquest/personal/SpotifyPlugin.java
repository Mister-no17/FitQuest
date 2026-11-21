package app.fitquest.personal;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.spotify.android.appremote.api.ConnectionParams;
import com.spotify.android.appremote.api.Connector;
import com.spotify.android.appremote.api.SpotifyAppRemote;

@CapacitorPlugin(name = "Spotify")
public class SpotifyPlugin extends Plugin {
    private static final String CLIENT_ID = "33c7698e0b514f2a8f382c1c534d7b4d";
    private static final String REDIRECT_URI = "fitquest-personal://spotify-callback";
    private SpotifyAppRemote remote;

    @PluginMethod
    public void connect(PluginCall call) {
        if (remote != null && remote.isConnected()) {
            JSObject result = new JSObject();
            result.put("connected", true);
            call.resolve(result);
            return;
        }
        ConnectionParams params = new ConnectionParams.Builder(CLIENT_ID)
            .setRedirectUri(REDIRECT_URI)
            .showAuthView(true)
            .build();
        SpotifyAppRemote.connect(getContext(), params, new Connector.ConnectionListener() {
            @Override
            public void onConnected(SpotifyAppRemote appRemote) {
                remote = appRemote;
                JSObject result = new JSObject();
                result.put("connected", true);
                call.resolve(result);
            }

            @Override
            public void onFailure(Throwable error) {
                call.reject(error.getMessage() == null ? "Could not connect to Spotify." : error.getMessage(), asException(error));
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null || uri.isBlank()) {
            call.reject("A Spotify playlist URI is required.");
            return;
        }
        if (!requireConnection(call)) return;
        remote.getPlayerApi().play(uri)
            .setResultCallback(empty -> call.resolve())
            .setErrorCallback(error -> call.reject(error.getMessage(), asException(error)));
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (!requireConnection(call)) return;
        remote.getPlayerApi().pause()
            .setResultCallback(empty -> call.resolve())
            .setErrorCallback(error -> call.reject(error.getMessage(), asException(error)));
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!requireConnection(call)) return;
        remote.getPlayerApi().resume()
            .setResultCallback(empty -> call.resolve())
            .setErrorCallback(error -> call.reject(error.getMessage(), asException(error)));
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", remote != null && remote.isConnected());
        call.resolve(result);
    }

    private boolean requireConnection(PluginCall call) {
        if (remote == null || !remote.isConnected()) {
            call.reject("Connect Spotify first.");
            return false;
        }
        return true;
    }

    private Exception asException(Throwable error) {
        return error instanceof Exception ? (Exception) error : new Exception(error);
    }

    @Override
    protected void handleOnDestroy() {
        if (remote != null) SpotifyAppRemote.disconnect(remote);
        remote = null;
        super.handleOnDestroy();
    }
}
