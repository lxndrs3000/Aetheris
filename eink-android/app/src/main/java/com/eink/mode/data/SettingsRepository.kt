package com.eink.mode.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "eink_settings")

/**
 * Single source of truth for [EInkSettings], backed by DataStore.
 *
 * Intended to be used as a process-wide singleton (see [SettingsRepository.get]) so the UI,
 * the overlay service, the tile and the scheduler all observe the same stream.
 */
class SettingsRepository private constructor(private val appContext: Context) {

    private object Keys {
        val ENABLED = booleanPreferencesKey("enabled")
        val WARMTH = floatPreferencesKey("warmth")
        val EDGE_LIGHT = floatPreferencesKey("edge_light")
        val GRIME = floatPreferencesKey("grime")
        val DIM = floatPreferencesKey("dim")
        val GRAYSCALE = booleanPreferencesKey("grayscale")
        val SCHEDULE_ENABLED = booleanPreferencesKey("schedule_enabled")
        val SCHEDULE_ON = intPreferencesKey("schedule_on_minutes")
        val SCHEDULE_OFF = intPreferencesKey("schedule_off_minutes")
    }

    val settings: Flow<EInkSettings> = appContext.dataStore.data.map { prefs ->
        val defaults = EInkSettings()
        EInkSettings(
            enabled = prefs[Keys.ENABLED] ?: defaults.enabled,
            warmth = prefs[Keys.WARMTH] ?: defaults.warmth,
            edgeLight = prefs[Keys.EDGE_LIGHT] ?: defaults.edgeLight,
            grime = prefs[Keys.GRIME] ?: defaults.grime,
            dim = prefs[Keys.DIM] ?: defaults.dim,
            grayscale = prefs[Keys.GRAYSCALE] ?: defaults.grayscale,
            scheduleEnabled = prefs[Keys.SCHEDULE_ENABLED] ?: defaults.scheduleEnabled,
            scheduleOnMinutes = prefs[Keys.SCHEDULE_ON] ?: defaults.scheduleOnMinutes,
            scheduleOffMinutes = prefs[Keys.SCHEDULE_OFF] ?: defaults.scheduleOffMinutes,
        )
    }

    suspend fun setEnabled(value: Boolean) = edit { it[Keys.ENABLED] = value }
    suspend fun setWarmth(value: Float) = edit { it[Keys.WARMTH] = value.coerceIn(0f, 1f) }
    suspend fun setEdgeLight(value: Float) = edit { it[Keys.EDGE_LIGHT] = value.coerceIn(0f, 1f) }
    suspend fun setGrime(value: Float) = edit { it[Keys.GRIME] = value.coerceIn(0f, 1f) }
    suspend fun setDim(value: Float) = edit { it[Keys.DIM] = value.coerceIn(0f, 1f) }
    suspend fun setGrayscale(value: Boolean) = edit { it[Keys.GRAYSCALE] = value }
    suspend fun setScheduleEnabled(value: Boolean) = edit { it[Keys.SCHEDULE_ENABLED] = value }
    suspend fun setScheduleOnMinutes(value: Int) = edit { it[Keys.SCHEDULE_ON] = value.coerceIn(0, 1439) }
    suspend fun setScheduleOffMinutes(value: Int) = edit { it[Keys.SCHEDULE_OFF] = value.coerceIn(0, 1439) }

    private suspend fun edit(
        block: suspend (androidx.datastore.preferences.core.MutablePreferences) -> Unit
    ) {
        appContext.dataStore.edit(block)
    }

    companion object {
        @Volatile
        private var instance: SettingsRepository? = null

        fun get(context: Context): SettingsRepository =
            instance ?: synchronized(this) {
                instance ?: SettingsRepository(context.applicationContext).also { instance = it }
            }
    }
}
