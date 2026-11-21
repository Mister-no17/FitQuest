package app.fitquest.personal;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.spotify.android.appremote.api.ConnectionParams;
import com.spotify.android.appremote.api.Connector;
import com.spotify.android.appremote.api.SpotifyAppRemote;
import com.spotify.android.appremote.api.ContentApi;
import com.spotify.protocol.types.ImageUri;
import com.spotify.protocol.types.ListItem;
import com.spotify.protocol.types.ListItems;
import com.spotify.sdk.android.auth.AuthorizationClient;
import com.spotify.sdk.android.auth.AuthorizationRequest;
import com.spotify.sdk.android.auth.AuthorizationResponse;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Spotify")
public class SpotifyPlugin extends Plugin {
    private static final String CLIENT_ID = "33c7698e0b514f2a8f382c1c534d7b4d";
    private static final String REDIRECT_URI = "fitquest-personal://spotify-callback";
    private SpotifyAppRemote remote;
    private String libraryToken;
    private long libraryTokenExpiresAt;

    @PluginMethod
    public void authorizeLibrary(PluginCall call) {
        if (libraryToken != null && System.currentTimeMillis() < libraryTokenExpiresAt - 60000) {
            JSObject result = new JSObject(); result.put("authorized", true); call.resolve(result); return;
        }
        AuthorizationRequest request = new AuthorizationRequest.Builder(
            CLIENT_ID, AuthorizationResponse.Type.TOKEN, REDIRECT_URI
        ).setScopes(new String[]{"playlist-read-private", "playlist-read-collaborative"})
         .setShowDialog(false).build();
        Intent intent = AuthorizationClient.createLoginActivityIntent(getActivity(), request);
        startActivityForResult(call, intent, "handleLibraryAuthorization");
    }

    @ActivityCallback
    private void handleLibraryAuthorization(PluginCall call, ActivityResult result) {
        if (call == null) return;
        AuthorizationResponse response = AuthorizationClient.getResponse(result.getResultCode(), result.getData());
        if (response.getType() == AuthorizationResponse.Type.TOKEN && response.getAccessToken() != null) {
            libraryToken = response.getAccessToken();
            libraryTokenExpiresAt = System.currentTimeMillis() + Math.max(60, response.getExpiresIn()) * 1000L;
            JSObject output = new JSObject(); output.put("authorized", true); call.resolve(output); return;
        }
        String message = response.getError();
        call.reject(message == null || message.isBlank() ? "Spotify access was not granted." : message);
    }

    @PluginMethod
    public void library(PluginCall call) {
        if (libraryToken == null || System.currentTimeMillis() >= libraryTokenExpiresAt) {
            call.reject("SPOTIFY_AUTH_REQUIRED"); return;
        }
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL("https://api.spotify.com/v1/me/playlists?limit=50").openConnection();
                connection.setRequestProperty("Authorization", "Bearer " + libraryToken);
                connection.setRequestProperty("Accept", "application/json");
                connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
                int status = connection.getResponseCode();
                if (status == 401) {
                    libraryToken = null;
                    getActivity().runOnUiThread(() -> call.reject("SPOTIFY_AUTH_REQUIRED")); return;
                }
                if (status < 200 || status >= 300) throw new Exception("Spotify returned error " + status + ".");
                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    String line; while ((line = reader.readLine()) != null) body.append(line);
                }
                JSONArray items = new JSONObject(body.toString()).getJSONArray("items"), output = new JSONArray();
                for (int i = 0; i < items.length(); i++) {
                    JSONObject playlist = items.optJSONObject(i); if (playlist == null) continue;
                    JSONObject row = new JSONObject(); row.put("id", playlist.optString("id")); row.put("uri", playlist.optString("uri"));
                    row.put("title", playlist.optString("name", "Playlist"));
                    JSONObject owner = playlist.optJSONObject("owner"); row.put("subtitle", owner == null ? "Spotify playlist" : owner.optString("display_name", "Spotify playlist"));
                    JSONArray images = playlist.optJSONArray("images"); row.put("imageUri", images != null && images.length() > 0 ? images.getJSONObject(0).optString("url") : "");
                    row.put("playable", true); row.put("hasChildren", false); output.put(row);
                }
                JSObject response = new JSObject(); response.put("items", output);
                getActivity().runOnUiThread(() -> call.resolve(response));
            } catch (Exception error) {
                getActivity().runOnUiThread(() -> call.reject(error.getMessage() == null ? "Could not load Spotify playlists." : error.getMessage(), asException(error)));
            } finally { if (connection != null) connection.disconnect(); }
        }).start();
    }

    @PluginMethod
    public void openPlaylist(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null || uri.isBlank()) { call.reject("A Spotify playlist is required."); return; }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri)); intent.setPackage("com.spotify.music"); intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (intent.resolveActivity(getContext().getPackageManager()) == null) { call.reject("Spotify is not installed on this phone."); return; }
        getContext().startActivity(intent); call.resolve();
    }

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
        AtomicBoolean finished = new AtomicBoolean(false);
        Handler timeoutHandler = new Handler(Looper.getMainLooper());
        Runnable timeout = () -> {
            if (finished.compareAndSet(false, true)) {
                call.reject("Spotify did not respond within 12 seconds. Open Spotify, make sure you are logged in, then return to FitQuest and retry.");
            }
        };
        timeoutHandler.postDelayed(timeout, 12000);
        SpotifyAppRemote.connect(getContext(), params, new Connector.ConnectionListener() {
            @Override
            public void onConnected(SpotifyAppRemote appRemote) {
                if (!finished.compareAndSet(false, true)) {
                    SpotifyAppRemote.disconnect(appRemote);
                    return;
                }
                timeoutHandler.removeCallbacks(timeout);
                remote = appRemote;
                JSObject result = new JSObject();
                result.put("connected", true);
                call.resolve(result);
            }

            @Override
            public void onFailure(Throwable error) {
                if (!finished.compareAndSet(false, true)) return;
                timeoutHandler.removeCallbacks(timeout);
                call.reject(error.getMessage() == null ? "Could not connect to Spotify." : error.getMessage(), asException(error));
            }
        });
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        Intent intent = getContext().getPackageManager().getLaunchIntentForPackage("com.spotify.music");
        if (intent == null) {
            call.reject("Spotify is not installed on this phone.");
            return;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
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

    @PluginMethod
    public void browse(PluginCall call) {
        if (!requireConnection(call)) return;
        String uri = call.getString("uri");
        if (uri == null || uri.isBlank()) {
            remote.getContentApi().getRecommendedContentItems(ContentApi.ContentType.DEFAULT)
                .setResultCallback(items -> resolveItems(call, items))
                .setErrorCallback(error -> call.reject(error.getMessage(), asException(error)));
            return;
        }
        ListItem parent = new ListItem(
            call.getString("id", uri), uri,
            new ImageUri(call.getString("imageUri", "")),
            call.getString("title", "Spotify"), call.getString("subtitle", ""),
            call.getBoolean("playable", false), call.getBoolean("hasChildren", true)
        );
        remote.getContentApi().getChildrenOfItem(parent, 50, 0)
            .setResultCallback(items -> resolveItems(call, items))
            .setErrorCallback(error -> call.reject(error.getMessage(), asException(error)));
    }

    private void resolveItems(PluginCall call, ListItems items) {
        JSArray output = new JSArray();
        for (ListItem item : items.items) {
            JSObject row = new JSObject();
            row.put("id", item.id); row.put("uri", item.uri);
            row.put("imageUri", item.imageUri == null ? "" : item.imageUri.raw);
            row.put("title", item.title); row.put("subtitle", item.subtitle);
            row.put("playable", item.playable); row.put("hasChildren", item.hasChildren);
            output.put(row);
        }
        JSObject result = new JSObject(); result.put("items", output); call.resolve(result);
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
