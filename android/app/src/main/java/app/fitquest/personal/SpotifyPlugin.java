package app.fitquest.personal;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.spotify.android.appremote.api.ConnectionParams;
import com.spotify.android.appremote.api.Connector;
import com.spotify.android.appremote.api.SpotifyAppRemote;
import com.spotify.android.appremote.api.ContentApi;
import com.spotify.protocol.types.ImageUri;
import com.spotify.protocol.types.ListItem;
import com.spotify.protocol.types.ListItems;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Spotify")
public class SpotifyPlugin extends Plugin {
    private static final String CLIENT_ID = "5e89981642fc4b46894ee8de4c291c34";
    private static final String REDIRECT_URI = "fitquest-personal://spotify-callback";
    private SpotifyAppRemote remote;
    private String libraryToken;
    private long libraryTokenExpiresAt;
    private String refreshToken;
    private String pkceVerifier;
    private String pkceState;
    private PluginCall pendingAuthorization;

    @PluginMethod
    public void authorizeLibrary(PluginCall call) {
        loadStoredTokens();
        if (libraryToken != null && System.currentTimeMillis() < libraryTokenExpiresAt - 60000) {
            JSObject result = new JSObject(); result.put("authorized", true); call.resolve(result); return;
        }
        try {
            byte[] verifierBytes = new byte[64], stateBytes = new byte[24]; new SecureRandom().nextBytes(verifierBytes); new SecureRandom().nextBytes(stateBytes);
            pkceVerifier = Base64.encodeToString(verifierBytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            pkceState = Base64.encodeToString(stateBytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            String challenge = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(pkceVerifier.getBytes(StandardCharsets.US_ASCII)), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            String url = "https://accounts.spotify.com/authorize?client_id=" + encode(CLIENT_ID) + "&response_type=code&redirect_uri=" + encode(REDIRECT_URI)
                + "&scope=" + encode("playlist-read-private playlist-read-collaborative") + "&code_challenge_method=S256&code_challenge=" + encode(challenge) + "&state=" + encode(pkceState);
            pendingAuthorization = call; call.setKeepAlive(true);
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception error) { call.reject("Could not start Spotify login.", asException(error)); }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        Uri data = intent.getData(); PluginCall call = pendingAuthorization;
        if (call == null || data == null || !"fitquest-personal".equals(data.getScheme()) || !"spotify-callback".equals(data.getHost())) return;
        String returnedState = data.getQueryParameter("state"), code = data.getQueryParameter("code"), error = data.getQueryParameter("error");
        if (error != null) { finishAuthorization(call); call.reject("Spotify login was not approved: " + error); return; }
        if (returnedState == null || !returnedState.equals(pkceState) || code == null) { finishAuthorization(call); call.reject("Spotify returned an invalid login response."); return; }
        new Thread(() -> {
            try {
                JSONObject token = requestToken("grant_type=authorization_code&code=" + encode(code) + "&redirect_uri=" + encode(REDIRECT_URI) + "&client_id=" + encode(CLIENT_ID) + "&code_verifier=" + encode(pkceVerifier));
                saveTokens(token); getActivity().runOnUiThread(() -> { finishAuthorization(call); JSObject output = new JSObject(); output.put("authorized", true); call.resolve(output); });
            } catch (Exception failure) { getActivity().runOnUiThread(() -> { finishAuthorization(call); call.reject(failure.getMessage() == null ? "Spotify login failed." : failure.getMessage(), asException(failure)); }); }
        }).start();
    }

    @PluginMethod
    public void library(PluginCall call) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                if (!ensureAccessToken()) { getActivity().runOnUiThread(() -> call.reject("SPOTIFY_AUTH_REQUIRED")); return; }
                connection = (HttpURLConnection) new URL("https://api.spotify.com/v1/me/playlists?limit=50").openConnection();
                connection.setRequestProperty("Authorization", "Bearer " + libraryToken);
                connection.setRequestProperty("Accept", "application/json");
                connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
                int status = connection.getResponseCode();
                if (status == 401) {
                    clearTokens();
                    getActivity().runOnUiThread(() -> call.reject("SPOTIFY_AUTH_REQUIRED")); return;
                }
                if (status < 200 || status >= 300) {
                    String detail = readResponse(connection, true); throw new Exception("Spotify returned " + status + (detail.isBlank() ? "." : ": " + detail));
                }
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

    private boolean ensureAccessToken() throws Exception {
        loadStoredTokens();
        if (libraryToken != null && System.currentTimeMillis() < libraryTokenExpiresAt - 60000) return true;
        if (refreshToken == null || refreshToken.isBlank()) return false;
        saveTokens(requestToken("grant_type=refresh_token&refresh_token=" + encode(refreshToken) + "&client_id=" + encode(CLIENT_ID)));
        return libraryToken != null;
    }

    private JSONObject requestToken(String form) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL("https://accounts.spotify.com/api/token").openConnection();
        try {
            connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            try (OutputStream output = connection.getOutputStream()) { output.write(form.getBytes(StandardCharsets.UTF_8)); }
            int status = connection.getResponseCode(); String body = readResponse(connection, status >= 400);
            if (status < 200 || status >= 300) {
                String message = body; try { message = new JSONObject(body).optString("error_description", body); } catch (Exception ignored) {}
                throw new Exception("Spotify login failed: " + message);
            }
            return new JSONObject(body);
        } finally { connection.disconnect(); }
    }

    private String readResponse(HttpURLConnection connection, boolean error) throws Exception {
        InputStream stream = error ? connection.getErrorStream() : connection.getInputStream(); if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
            String line; while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }

    private void saveTokens(JSONObject token) {
        libraryToken = token.optString("access_token", null); if (token.has("refresh_token")) refreshToken = token.optString("refresh_token", refreshToken);
        libraryTokenExpiresAt = System.currentTimeMillis() + Math.max(60, token.optLong("expires_in", 3600)) * 1000L;
        getContext().getSharedPreferences("fitquest_spotify", 0).edit().putString("access", libraryToken).putString("refresh", refreshToken).putLong("expires", libraryTokenExpiresAt).apply();
    }

    private void loadStoredTokens() {
        if (libraryToken != null) return; android.content.SharedPreferences prefs = getContext().getSharedPreferences("fitquest_spotify", 0);
        libraryToken = prefs.getString("access", null); refreshToken = prefs.getString("refresh", null); libraryTokenExpiresAt = prefs.getLong("expires", 0);
    }

    private void clearTokens() {
        libraryToken = null; refreshToken = null; libraryTokenExpiresAt = 0; getContext().getSharedPreferences("fitquest_spotify", 0).edit().clear().apply();
    }

    private void finishAuthorization(PluginCall call) { call.setKeepAlive(false); pendingAuthorization = null; pkceVerifier = null; pkceState = null; }
    private String encode(String value) { try { return URLEncoder.encode(value, "UTF-8"); } catch (Exception error) { throw new IllegalStateException(error); } }

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
