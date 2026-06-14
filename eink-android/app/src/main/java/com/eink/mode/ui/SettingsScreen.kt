package com.eink.mode.ui

import android.app.TimePickerDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eink.mode.data.EInkSettings
import com.eink.mode.data.SettingsRepository
import kotlinx.coroutines.launch
import java.util.Locale

private const val ADB_COMMAND =
    "adb shell pm grant com.eink.mode android.permission.WRITE_SECURE_SETTINGS"

/**
 * The single settings screen. Reads the persisted [EInkSettings] stream and writes changes back
 * through [SettingsRepository]; the running [com.eink.mode.service.OverlayService] picks up every
 * change live.
 */
@Composable
fun SettingsScreen(
    repo: SettingsRepository,
    canDrawOverlays: Boolean,
    grayscaleGranted: Boolean,
    onRequestOverlayPermission: () -> Unit,
    onMasterToggle: (Boolean) -> Unit,
) {
    val settings by repo.settings.collectAsState(initial = EInkSettings())
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "E-Ink Mode",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Make your phone feel like a cheap, warm, grainy e-ink reader — boring on purpose.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
        )

        MasterCard(
            enabled = settings.enabled,
            canDrawOverlays = canDrawOverlays,
            onToggle = onMasterToggle,
            onRequestOverlayPermission = onRequestOverlayPermission,
        )

        SectionCard(title = "Look") {
            LabeledSlider("Warm wash", settings.warmth) { v ->
                scope.launch { repo.setWarmth(v) }
            }
            LabeledSlider("Edge light bleed", settings.edgeLight) { v ->
                scope.launch { repo.setEdgeLight(v) }
            }
            LabeledSlider("E-ink grime", settings.grime) { v ->
                scope.launch { repo.setGrime(v) }
            }
            LabeledSlider("Global dim", settings.dim) { v ->
                scope.launch { repo.setDim(v) }
            }
        }

        GrayscaleCard(
            grayscaleOn = settings.grayscale,
            granted = grayscaleGranted,
            onToggle = { v -> scope.launch { repo.setGrayscale(v) } },
        )

        ScheduleCard(
            settings = settings,
            onEnabledChange = { v -> scope.launch { repo.setScheduleEnabled(v) } },
            onOnTimeChange = { m -> scope.launch { repo.setScheduleOnMinutes(m) } },
            onOffTimeChange = { m -> scope.launch { repo.setScheduleOffMinutes(m) } },
        )

        LimitationsCard()
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun MasterCard(
    enabled: Boolean,
    canDrawOverlays: Boolean,
    onToggle: (Boolean) -> Unit,
    onRequestOverlayPermission: () -> Unit,
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Enable E-Ink Mode", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                Switch(checked = enabled, onCheckedChange = onToggle, enabled = canDrawOverlays)
            }
            if (!canDrawOverlays) {
                Text(
                    "Needs permission to draw over other apps.",
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp
                )
                Button(onClick = onRequestOverlayPermission) {
                    Text("Grant overlay permission")
                }
            } else {
                Text(
                    "Tip: add the \"E-Ink\" Quick Settings tile to toggle this from anywhere.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}

@Composable
private fun GrayscaleCard(
    grayscaleOn: Boolean,
    granted: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    val context = LocalContextCompat()
    SectionCard(title = "True grayscale") {
        Text(
            "Desaturates the whole screen to mono — the strongest anti-addiction lever.",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
        )
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("System grayscale", fontSize = 16.sp)
            Switch(checked = grayscaleOn, onCheckedChange = onToggle, enabled = granted)
        }
        if (!granted) {
            Text(
                "One-time setup: grayscale needs WRITE_SECURE_SETTINGS, which can only be granted over ADB. Connect your phone to a computer and run:",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.error
            )
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background)) {
                Text(
                    ADB_COMMAND,
                    modifier = Modifier.padding(12.dp),
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp
                )
            }
            OutlinedButton(onClick = { copyToClipboard(context, ADB_COMMAND) }) {
                Text("Copy command")
            }
            Text(
                "After granting, reopen the app — the toggle above will switch on.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun ScheduleCard(
    settings: EInkSettings,
    onEnabledChange: (Boolean) -> Unit,
    onOnTimeChange: (Int) -> Unit,
    onOffTimeChange: (Int) -> Unit,
) {
    val context = LocalContextCompat()
    SectionCard(title = "Schedule") {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Auto on/off daily", fontSize = 16.sp)
            Switch(checked = settings.scheduleEnabled, onCheckedChange = onEnabledChange)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Turn on at", fontSize = 16.sp)
            OutlinedButton(
                enabled = settings.scheduleEnabled,
                onClick = { showTimePicker(context, settings.scheduleOnMinutes, onOnTimeChange) }
            ) { Text(formatMinutes(settings.scheduleOnMinutes)) }
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Turn off at", fontSize = 16.sp)
            OutlinedButton(
                enabled = settings.scheduleEnabled,
                onClick = { showTimePicker(context, settings.scheduleOffMinutes, onOffTimeChange) }
            ) { Text(formatMinutes(settings.scheduleOffMinutes)) }
        }
    }
}

@Composable
private fun LimitationsCard() {
    SectionCard(title = "Known limitations") {
        Text(
            "The overlay may not cover the status bar, navigation bar, or secure screens " +
                "(PIN entry, some keyboards) on certain Android versions.",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
        )
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
            content()
        }
    }
}

@Composable
private fun LabeledSlider(label: String, value: Float, onChange: (Float) -> Unit) {
    Column {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, fontSize = 15.sp)
            Text("${(value * 100).toInt()}%", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
        }
        Slider(value = value, onValueChange = onChange, valueRange = 0f..1f)
    }
}

// --- small platform helpers -------------------------------------------------

@Composable
private fun LocalContextCompat(): Context =
    androidx.compose.ui.platform.LocalContext.current

private fun formatMinutes(minutes: Int): String =
    String.format(Locale.getDefault(), "%02d:%02d", minutes / 60, minutes % 60)

private fun showTimePicker(context: Context, current: Int, onPicked: (Int) -> Unit) {
    TimePickerDialog(
        context,
        { _, hour, minute -> onPicked(hour * 60 + minute) },
        current / 60,
        current % 60,
        true
    ).show()
}

private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("adb command", text))
    Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
}
