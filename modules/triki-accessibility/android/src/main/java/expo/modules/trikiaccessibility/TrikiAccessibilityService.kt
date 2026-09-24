package expo.modules.trikiaccessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

/** Performs gestures in the foreground app via the public dispatchGesture API. */
class TrikiAccessibilityService : AccessibilityService() {
  companion object {
    @Volatile
    var instance: TrikiAccessibilityService? = null
  }

  private val main = Handler(Looper.getMainLooper())

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
  }

  override fun onUnbind(intent: Intent?): Boolean {
    instance = null
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    instance = null
    super.onDestroy()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

  override fun onInterrupt() {}

  private fun px(fx: Double, fy: Double): Pair<Float, Float> {
    val m = resources.displayMetrics
    return Pair((fx * m.widthPixels).toFloat(), (fy * m.heightPixels).toFloat())
  }

  fun swipe(x1: Double, y1: Double, x2: Double, y2: Double, durationMs: Int) {
    val (ax, ay) = px(x1, y1)
    val (bx, by) = px(x2, y2)
    val path = Path().apply {
      moveTo(ax, ay)
      lineTo(bx, by)
    }
    val gesture = GestureDescription.Builder()
      .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(1, 2000).toLong()))
      .build()
    main.post { dispatchGesture(gesture, null, null) }
  }

  fun tap(x: Double, y: Double, count: Int) {
    val (ax, ay) = px(x, y)
    val builder = GestureDescription.Builder()
    for (i in 0 until count.coerceIn(1, 3)) {
      val path = Path().apply { moveTo(ax, ay) }
      builder.addStroke(GestureDescription.StrokeDescription(path, i * 110L, 40L))
    }
    val gesture = builder.build()
    main.post { dispatchGesture(gesture, null, null) }
  }

  fun global(name: String): Boolean {
    val action = when (name) {
      "back" -> GLOBAL_ACTION_BACK
      "home" -> GLOBAL_ACTION_HOME
      "recents" -> GLOBAL_ACTION_RECENTS
      else -> return false
    }
    main.post { performGlobalAction(action) }
    return true
  }
}
