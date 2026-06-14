package com.eink.mode

import android.content.Context
import android.provider.Settings
import com.eink.mode.data.SettingsRepository
import com.eink.mode.service.OverlayService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Coordinates the master on/off state across the UI, the Quick Settings tile and the scheduler.
 *
 * Flipping `enabled` in DataStore is not enough on its own: enabling must also start the
 * foreground service (the service tears itself down when it observes `enabled == false`).
 */
object EInkController {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /** Whether the overlay permission needed to actually draw has been granted. */
    fun canDrawOverlays(context: Context): Boolean = Settings.canDrawOverlays(context)

    fun enable(context: Context) {
        val appContext = context.applicationContext
        scope.launch {
            SettingsRepository.get(appContext).setEnabled(true)
            OverlayService.start(appContext)
        }
    }

    fun disable(context: Context) {
        val appContext = context.applicationContext
        // Service observes this and stops itself + removes the overlay + releases grayscale.
        scope.launch { SettingsRepository.get(appContext).setEnabled(false) }
    }

    fun toggle(context: Context) {
        val appContext = context.applicationContext
        scope.launch {
            val current = SettingsRepository.get(appContext).settings.first().enabled
            if (current) disable(appContext) else enable(appContext)
        }
    }

    /** Re-launch the service after process death/boot if settings say it should be on. */
    fun syncOnStart(context: Context) {
        val appContext = context.applicationContext
        scope.launch {
            val settings = SettingsRepository.get(appContext).settings.first()
            if (settings.enabled && canDrawOverlays(appContext)) {
                OverlayService.start(appContext)
            }
        }
    }
}
