package expo.modules.trikiaccessibility

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.KeyEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TrikiAccessibilityModule : Module() {
  private fun serviceEnabled(ctx: Context): Boolean {
    if (TrikiAccessibilityService.instance != null) return true
    val expected = ComponentName(ctx, TrikiAccessibilityService::class.java).flattenToString()
    val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      ?: return false
    return enabled.split(':').any { it.equals(expected, ignoreCase = true) }
  }

  override fun definition() = ModuleDefinition {
    Name("TrikiAccessibility")

    Function("isServiceEnabled") {
      val ctx = appContext.reactContext ?: return@Function false
      serviceEnabled(ctx)
    }

    Function("openAccessibilitySettings") {
      val ctx = appContext.reactContext ?: return@Function false
      // the ":settings:" extras make many Android versions scroll to and highlight our entry
      val component = ComponentName(ctx, TrikiAccessibilityService::class.java).flattenToString()
      val args = Bundle().apply { putString(":settings:fragment_args_key", component) }
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        .putExtra(":settings:fragment_args_key", component)
        .putExtra(":settings:show_fragment_args", args)
      ctx.startActivity(intent)
      true
    }

    Function("openAppSettings") {
      val ctx = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
      true
    }

    Function("swipe") { x1: Double, y1: Double, x2: Double, y2: Double, durationMs: Int ->
      val s = TrikiAccessibilityService.instance ?: return@Function false
      s.swipe(x1, y1, x2, y2, durationMs)
      true
    }

    Function("tap") { x: Double, y: Double, count: Int ->
      val s = TrikiAccessibilityService.instance ?: return@Function false
      s.tap(x, y, count)
      true
    }

    Function("globalAction") { name: String ->
      TrikiAccessibilityService.instance?.global(name) ?: false
    }

    Function("adjustVolume") { direction: Int ->
      val ctx = appContext.reactContext ?: return@Function false
      val audio = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val adj = when {
        direction > 0 -> AudioManager.ADJUST_RAISE
        direction < 0 -> AudioManager.ADJUST_LOWER
        else -> AudioManager.ADJUST_TOGGLE_MUTE
      }
      audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, adj, AudioManager.FLAG_SHOW_UI)
      true
    }

    Function("mediaKey") { keyCode: Int ->
      val ctx = appContext.reactContext ?: return@Function false
      val audio = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audio.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
      audio.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, keyCode))
      true
    }

    Function("startKeepAlive") { title: String, text: String ->
      val ctx = appContext.reactContext ?: return@Function false
      val intent = Intent(ctx, TrikiKeepAliveService::class.java)
        .putExtra(TrikiKeepAliveService.EXTRA_TITLE, title)
        .putExtra(TrikiKeepAliveService.EXTRA_TEXT, text)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(intent) else ctx.startService(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("stopKeepAlive") {
      val ctx = appContext.reactContext ?: return@Function false
      ctx.stopService(Intent(ctx, TrikiKeepAliveService::class.java))
    }
  }
}
