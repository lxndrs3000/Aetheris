package com.eink.mode.schedule

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.eink.mode.data.EInkSettings
import java.util.Calendar

/**
 * Schedules the daily auto-on / auto-off transitions via [AlarmManager].
 *
 * Two repeating daily alarms fire [ScheduleReceiver], which flips the master switch. Falls back
 * to inexact alarms when exact-alarm permission is unavailable — drifting a few minutes is fine
 * for a "warm up after 20:00" feature.
 */
object ScheduleManager {

    const val ACTION_TURN_ON = "com.eink.mode.action.TURN_ON"
    const val ACTION_TURN_OFF = "com.eink.mode.action.TURN_OFF"

    private const val REQ_ON = 100
    private const val REQ_OFF = 101

    fun apply(context: Context, settings: EInkSettings) {
        cancel(context)
        if (!settings.scheduleEnabled) return
        schedule(context, REQ_ON, ACTION_TURN_ON, settings.scheduleOnMinutes)
        schedule(context, REQ_OFF, ACTION_TURN_OFF, settings.scheduleOffMinutes)
    }

    fun cancel(context: Context) {
        val am = context.getSystemService(AlarmManager::class.java)
        am.cancel(pendingIntent(context, REQ_ON, ACTION_TURN_ON))
        am.cancel(pendingIntent(context, REQ_OFF, ACTION_TURN_OFF))
    }

    private fun schedule(context: Context, requestCode: Int, action: String, minutesOfDay: Int) {
        val am = context.getSystemService(AlarmManager::class.java)
        val triggerAt = nextTriggerMillis(minutesOfDay)
        val pi = pendingIntent(context, requestCode, action)
        // Repeat every 24h; setInexactRepeating survives Doze better and needs no special permission.
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, triggerAt, AlarmManager.INTERVAL_DAY, pi)
    }

    private fun nextTriggerMillis(minutesOfDay: Int): Long {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, minutesOfDay / 60)
            set(Calendar.MINUTE, minutesOfDay % 60)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (target.timeInMillis <= now.timeInMillis) {
            target.add(Calendar.DAY_OF_YEAR, 1)
        }
        return target.timeInMillis
    }

    private fun pendingIntent(context: Context, requestCode: Int, action: String): PendingIntent {
        val intent = Intent(context, ScheduleReceiver::class.java).setAction(action)
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}
