package com.eink.mode.data

/**
 * All user-tunable state for the e-ink effect. Persisted via [SettingsRepository].
 *
 * Intensity-style values are normalised 0f..1f so the UI can drive them with plain sliders
 * and the overlay can map them to alpha/scale however it likes.
 */
data class EInkSettings(
    /** Master switch for the overlay foreground service. */
    val enabled: Boolean = false,
    /** Strength of the amber/red warm wash. */
    val warmth: Float = 0.45f,
    /** Strength of the warmer bottom-edge frontlight bleed. */
    val edgeLight: Float = 0.5f,
    /** Strength of the tiled noise / halftone "paper grime" texture. */
    val grime: Float = 0.4f,
    /** Extra neutral darkening layered on top of the tint. */
    val dim: Float = 0.2f,
    /** Whether the app should drive system monochrome (needs WRITE_SECURE_SETTINGS). */
    val grayscale: Boolean = false,
    /** Whether the daily on/off schedule is active. */
    val scheduleEnabled: Boolean = false,
    /** Minutes past midnight to auto-enable (default 20:00). */
    val scheduleOnMinutes: Int = 20 * 60,
    /** Minutes past midnight to auto-disable (default 07:00). */
    val scheduleOffMinutes: Int = 7 * 60,
)
