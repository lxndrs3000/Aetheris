package com.eink.mode.schedule

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.eink.mode.EInkController
import com.eink.mode.data.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Handles scheduled on/off alarms and re-arms everything after a reboot.
 */
class ScheduleReceiver : BroadcastReceiver() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onReceive(context: Context, intent: Intent) {
        val appContext = context.applicationContext
        when (intent.action) {
            ScheduleManager.ACTION_TURN_ON -> EInkController.enable(appContext)
            ScheduleManager.ACTION_TURN_OFF -> EInkController.disable(appContext)
            Intent.ACTION_BOOT_COMPLETED -> {
                // Alarms and the foreground service do not survive a reboot — restore both.
                val pending = goAsync()
                scope.launch {
                    try {
                        val settings = SettingsRepository.get(appContext).settings.first()
                        ScheduleManager.apply(appContext, settings)
                        EInkController.syncOnStart(appContext)
                    } finally {
                        pending.finish()
                    }
                }
            }
        }
    }
}
