package com.eink.mode

import android.app.Application
import com.eink.mode.data.SettingsRepository
import com.eink.mode.schedule.ScheduleManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.launch

class EInkApplication : Application() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        // If settings say the effect should be on, make sure the service is running.
        EInkController.syncOnStart(this)

        // Keep the AlarmManager schedule in sync with the persisted schedule settings.
        val repo = SettingsRepository.get(this)
        scope.launch {
            repo.settings
                .distinctUntilChangedBy {
                    Triple(it.scheduleEnabled, it.scheduleOnMinutes, it.scheduleOffMinutes)
                }
                .collect { settings -> ScheduleManager.apply(this@EInkApplication, settings) }
        }
    }
}
