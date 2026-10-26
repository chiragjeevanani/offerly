# Order ring at full volume in the Android app

**For:** whoever builds the Offerly merchant / delivery APK (Flutter + `flutter_inappwebview`).

## The problem

The new-order ring is played by the web page, so Android plays it on the **media** stream. A merchant
who turns media volume down (or to zero) no longer hears new orders. A web page cannot change this;
only the app can.

## How it works now

The website already asks the app to ring. When a new order needs an answer it calls:

```js
window.flutter_inappwebview.callHandler('offerlyRing', 'start')   // order waiting
window.flutter_inappwebview.callHandler('offerlyRing', 'stop')    // accepted / rejected
```

If the handler returns `true`, the page stops its own sound and leaves the ringing to the app. If
there is no handler (older APK, or a browser), the page keeps ringing itself as before. Nothing breaks
if the app isn't updated.

The app should play the ring on the **alarm** stream (`USAGE_ALARM`). Alarm volume is separate from
media volume, and on most phones it plays even in silent mode.

## 1. Dart: register the handler

In the screen that creates the `InAppWebView`, inside `onWebViewCreated`:

```dart
import 'package:flutter/services.dart';

const _ring = MethodChannel('offerly/ring');

// in onWebViewCreated: (controller) { ... }
controller.addJavaScriptHandler(
  handlerName: 'offerlyRing',
  callback: (args) async {
    final action = args.isNotEmpty ? args.first.toString() : 'start';
    try {
      await _ring.invokeMethod(action == 'stop' ? 'stop' : 'start');
      return true; // tells the page the app is ringing
    } catch (_) {
      return false; // page falls back to its own sound
    }
  },
);
```

Also stop the ring if the WebView screen is closed (`dispose`): `_ring.invokeMethod('stop');`

## 2. Kotlin: play on the alarm stream

`android/app/src/main/kotlin/.../MainActivity.kt`:

```kotlin
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var player: MediaPlayer? = null
    private var savedAlarmVolume: Int? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "offerly/ring").setMethodCallHandler { call, result ->
            when (call.method) {
                "start" -> { startRing(); result.success(true) }
                "stop" -> { stopRing(); result.success(true) }
                else -> result.notImplemented()
            }
        }
    }

    private fun startRing() {
        if (player != null) return
        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        // Optional: push alarm volume to max while ringing, put it back afterwards.
        savedAlarmVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM)
        audio.setStreamVolume(AudioManager.STREAM_ALARM, audio.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0)

        // A bundled sound (res/raw/order_ring.mp3) is most reliable; the phone's alarm tone is the fallback.
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        player = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            setDataSource(this@MainActivity, uri)
            isLooping = true
            prepare()
            start()
        }
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        val pattern = longArrayOf(0, 600, 300, 600, 900)
        if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
        else @Suppress("DEPRECATION") vibrator.vibrate(pattern, 0)
    }

    private fun stopRing() {
        player?.run { stop(); release() }
        player = null
        (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).cancel()
        savedAlarmVolume?.let {
            (getSystemService(Context.AUDIO_SERVICE) as AudioManager).setStreamVolume(AudioManager.STREAM_ALARM, it, 0)
        }
        savedAlarmVolume = null
    }

    override fun onDestroy() { stopRing(); super.onDestroy() }
}
```

`AndroidManifest.xml` needs `<uses-permission android:name="android.permission.VIBRATE" />` (most likely
already there).

## 3. When the app is closed (push notifications)

The server sends order alerts as high-priority FCM pushes on channel **`offerly_default`**. Their
sound follows the notification volume. To make those loud as well, create a separate channel for order
alerts with alarm audio attributes, and tell us its id so the server can send order alerts on it:

```kotlin
// e.g. in MainActivity.onCreate (Android 8+)
val channel = NotificationChannel("offerly_orders", "New orders", NotificationManager.IMPORTANCE_HIGH).apply {
    setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
    )
    enableVibration(true)
    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
}
getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
```

Don't switch the server to `offerly_orders` until the APK that creates it is out. Pushes on a channel
the app hasn't created fall back to Android's default channel.

## Test checklist

1. Media volume at 0, alarm volume up. Place a delivery order: the store app rings loudly until Accept
   or Reject.
2. Delivery app online with an open order in the city: rings until Accept or Reject.
3. Accept: the ring stops immediately. Open another screen: no ring left behind.
4. Older APK without the handler still rings through the page (media volume), as today.
