package com.eink.mode

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.eink.mode.data.SettingsRepository
import com.eink.mode.grayscale.GrayscaleController
import com.eink.mode.ui.SettingsScreen
import com.eink.mode.ui.theme.EInkTheme

class MainActivity : ComponentActivity() {

    // Recomputed on every resume so the UI reflects permissions the user changed in Settings/ADB.
    private var canDrawOverlays by mutableStateOf(false)
    private var grayscaleGranted by mutableStateOf(false)

    private val overlayPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            refreshPermissions()
        }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* best-effort */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        refreshPermissions()
        maybeRequestNotificationPermission()

        val repo = SettingsRepository.get(this)
        setContent {
            EInkTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SettingsScreen(
                        repo = repo,
                        canDrawOverlays = canDrawOverlays,
                        grayscaleGranted = grayscaleGranted,
                        onRequestOverlayPermission = ::requestOverlayPermission,
                        onMasterToggle = { enabled ->
                            if (enabled) EInkController.enable(this) else EInkController.disable(this)
                        },
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshPermissions()
    }

    private fun refreshPermissions() {
        canDrawOverlays = Settings.canDrawOverlays(this)
        grayscaleGranted = GrayscaleController.hasPermission(this)
    }

    private fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName")
        )
        overlayPermissionLauncher.launch(intent)
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}
