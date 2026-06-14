package com.eink.mode.grayscale

import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings

/**
 * Drives the system-wide monochrome display via the accessibility daltonizer.
 *
 * An overlay can tint but cannot remove saturation, so true grayscale is the only real
 * desaturation path. It writes two Settings.Secure keys, which requires WRITE_SECURE_SETTINGS.
 * That permission is not grantable from a normal app install; the user grants it once over ADB:
 *
 *   adb shell pm grant com.eink.mode android.permission.WRITE_SECURE_SETTINGS
 *
 * All writes are guarded so a missing grant degrades gracefully instead of crashing.
 */
object GrayscaleController {

    // Hidden constants from Settings.Secure; safe to inline.
    private const val DALTONIZER_ENABLED = "accessibility_display_daltonizer_enabled"
    private const val DALTONIZER = "accessibility_display_daltonizer"
    private const val MODE_MONOCHROME = 0

    /** True if WRITE_SECURE_SETTINGS has been granted (typically via ADB). */
    fun hasPermission(context: Context): Boolean =
        context.checkSelfPermission(android.Manifest.permission.WRITE_SECURE_SETTINGS) ==
            PackageManager.PERMISSION_GRANTED

    /** Whether system monochrome is currently active. */
    fun isEnabled(context: Context): Boolean = runCatching {
        Settings.Secure.getInt(context.contentResolver, DALTONIZER_ENABLED, 0) == 1 &&
            Settings.Secure.getInt(context.contentResolver, DALTONIZER, -1) == MODE_MONOCHROME
    }.getOrDefault(false)

    /**
     * Enables or disables system monochrome.
     *
     * @return true if the change was applied, false if the permission is missing or the write failed.
     */
    fun setEnabled(context: Context, enabled: Boolean): Boolean {
        if (!hasPermission(context)) return false
        return runCatching {
            val resolver = context.contentResolver
            if (enabled) {
                Settings.Secure.putInt(resolver, DALTONIZER, MODE_MONOCHROME)
                Settings.Secure.putInt(resolver, DALTONIZER_ENABLED, 1)
            } else {
                Settings.Secure.putInt(resolver, DALTONIZER_ENABLED, 0)
            }
            true
        }.getOrDefault(false)
    }
}
