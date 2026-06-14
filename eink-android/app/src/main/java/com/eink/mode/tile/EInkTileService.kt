package com.eink.mode.tile

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.eink.mode.EInkController
import com.eink.mode.data.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Quick Settings tile that turns the whole e-ink effect on/off without opening the app.
 *
 * If the overlay permission is missing, tapping the tile bounces the user to the app so they
 * can grant it rather than silently doing nothing.
 */
class EInkTileService : TileService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onStartListening() {
        super.onStartListening()
        refreshTile()
    }

    override fun onClick() {
        super.onClick()
        val context = applicationContext
        if (!EInkController.canDrawOverlays(context)) {
            // Can't draw yet — send the user to the app to grant overlay permission.
            val intent = Intent(context, com.eink.mode.MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivityAndCollapse(intent)
            return
        }
        EInkController.toggle(context)
        // The toggle is async; reflect the new state shortly after.
        refreshTile()
    }

    private fun refreshTile() {
        val context = applicationContext
        scope.launch {
            val enabled = SettingsRepository.get(context).settings.first().enabled
            qsTile?.apply {
                state = if (enabled) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
                updateTile()
            }
        }
    }

    companion object {
        /** Ask the system to re-render the tile (e.g. after the service stops itself). */
        fun requestUpdate(context: Context) {
            runCatching {
                requestListeningState(
                    context,
                    ComponentName(context, EInkTileService::class.java)
                )
            }
        }
    }
}
