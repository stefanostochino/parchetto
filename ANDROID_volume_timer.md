# SCHEDONE v5 – Volume del timer indipendente nell'app Android

La pagina web (index.html) è già pronta. Per rendere il volume dei segnali **del tutto indipendente** da suoneria e
multimediale, e udibile **anche in silenzioso/vibrazione**, l'app Android deve esporre un nuovo metodo nel ponte
JavaScript `Android` (quello che oggi ha già `vibrate()`, `setKeepScreenOn()`, `calendarInsert()`, `share()`…).

Finché il metodo non c'è, la pagina funziona come prima (audio sul volume multimediale) e nelle Impostazioni
compare l'avviso "serve aggiornare l'app Android". Appena il metodo esiste, la pagina lo usa da sola.

## Come funziona

1. La pagina genera il suono scelto (fischietto, gong, campanella, bip…) come file WAV (PCM 16 bit mono).
2. Chiama `Android.playTimerSound(wavBase64, volumePercentuale)` con il volume impostato nell'app (0–100).
3. Android lo suona sul **canale SVEGLIA** (`USAGE_ALARM`): non viene silenziato dalla modalità silenziosa né
   dalla vibrazione e non dipende dal volume della musica. Per la durata del suono imposta il volume sveglia al
   valore scelto nell'app, poi rimette quello di prima.

## Codice da aggiungere

Nella classe registrata con `webView.addJavascriptInterface(..., "Android")` (serve un `Context` chiamato `ctx`):

```java
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

// ---- Suoni del timer sul canale sveglia, con volume dell'app ----
private static final Object SND_LOCK = new Object();
private static int sndActive = 0;
private static int sndSavedVol = -1;

@JavascriptInterface
public void playTimerSound(String wavBase64, int volPct) {
    if (volPct <= 0 || wavBase64 == null) return;
    final byte[] wav = Base64.decode(wavBase64, Base64.DEFAULT);
    new Thread(() -> {
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        AudioTrack track = null;
        try {
            // header WAV standard da 44 byte (scritto dalla pagina)
            int sr = ByteBuffer.wrap(wav, 24, 4).order(ByteOrder.LITTLE_ENDIAN).getInt();
            int dataLen = wav.length - 44;
            if (dataLen <= 0) return;

            synchronized (SND_LOCK) {
                if (sndActive == 0) sndSavedVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                sndActive++;
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int target = Math.max(1, Math.round(max * Math.min(100, volPct) / 100f));
                try { am.setStreamVolume(AudioManager.STREAM_ALARM, target, 0); } catch (SecurityException ignored) {}
            }

            track = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sr)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setTransferMode(AudioTrack.MODE_STATIC)
                .setBufferSizeInBytes(dataLen)
                .build();
            track.write(wav, 44, dataLen);
            track.play();
            Thread.sleep((dataLen / 2) * 1000L / sr + 200);
        } catch (Exception ignored) {
        } finally {
            if (track != null) try { track.release(); } catch (Exception ignored) {}
            synchronized (SND_LOCK) {
                sndActive = Math.max(0, sndActive - 1);
                if (sndActive == 0 && sndSavedVol >= 0) {
                    try { am.setStreamVolume(AudioManager.STREAM_ALARM, sndSavedVol, 0); } catch (SecurityException ignored) {}
                    sndSavedVol = -1;
                }
            }
        }
    }).start();
}
```

Requisiti: `minSdkVersion` 23 o superiore (AudioTrack.Builder). Non servono permessi aggiuntivi.

## Note

- Con "Non disturbare" attivo, Android fa passare le sveglie solo se nelle impostazioni di Non disturbare sono
  consentite le sveglie (è così di default).
- Se nelle Impostazioni dell'app si spegne "Suona anche con il telefono in silenzioso", la pagina torna a usare
  il normale audio multimediale.
- Se l'app Android carica la pagina da internet (e non dai file interni), basta pubblicare la nuova index.html;
  se la carica dagli asset interni, va copiata la nuova index.html negli asset e ricompilata l'app.
