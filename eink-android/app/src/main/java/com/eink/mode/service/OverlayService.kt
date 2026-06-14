package com.eink.mode.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.eink.mode.MainActivity
import com.eink.mode.R
import com.eink.mode.data.EInkSettings
import com.eink.mode.data.SettingsRepository
import com.eink.mode.grayscale.GrayscaleController
import com.eink.mode.tile.EInkTileService
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch

/**
 * Persistent foreground service that owns the WindowManager overlay and keeps it in sync with
 * [SettingsRepository]. While `enabled` is true it shows the overlay and (if permitted) drives
 * system grayscale; when `enabled` flips to false it tears everything down and stops itself.
 */
class OverlayService : LifecycleService() {

    private lateinit var windowManager: WindowManager
    private var overlayView: OverlayView? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        startInForeground()

        val repo = SettingsRepository.get(this)
        lifecycleScope.launch {
            repo.settings.distinctUntilChanged().collect { settings ->
                applySettings(settings)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        // Restart if killed so the effect survives memory pressure while enabled.
        return START_STICKY
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    private fun applySettings(settings: EInkSettings) {
        if (!settings.enabled) {
            stopEffect()
            return
        }
        if (!Settings.canDrawOverlays(this)) {
            // Permission was revoked; we can't draw. Bail out cleanly.
            stopEffect()
            return
        }
        ensureOverlay()
        overlayView?.update(settings)
        GrayscaleController.setEnabled(this, settings.grayscale)
    }

    private fun ensureOverlay() {
        if (overlayView != null) return
        val view = OverlayView(this)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            // Extend under the display cutout so the wash reaches every edge it can.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            }
        }
        runCatching { windowManager.addView(view, params) }
            .onSuccess { overlayView = view }
    }

    private fun stopEffect() {
        removeOverlay()
        // Always release grayscale so the screen returns to colour when the effect is off.
        GrayscaleController.setEnabled(this, false)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        EInkTileService.requestUpdate(this)
    }

    private fun removeOverlay() {
        overlayView?.let { view ->
            runCatching { windowManager.removeView(view) }
            overlayView = null
        }
    }

    override fun onDestroy() {
        removeOverlay()
        super.onDestroy()
    }

    private fun startInForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notif_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply { setShowBadge(false) }
        manager.createNotificationChannel(channel)

        val openApp = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text))
            .setSmallIcon(R.drawable.ic_tile)
            .setContentIntent(openApp)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    companion object {
        private const val CHANNEL_ID = "eink_overlay"
        private const val NOTIF_ID = 1001

        /** Start the service if it isn't already running. Safe to call repeatedly. */
        fun start(context: Context) {
            val intent = Intent(context, OverlayService::class.java)
            context.startForegroundService(intent)
        }
    }
}
