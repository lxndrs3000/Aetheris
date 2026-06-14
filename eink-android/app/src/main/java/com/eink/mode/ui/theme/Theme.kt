package com.eink.mode.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Warm, paper-ish palette that nods to the app's own aesthetic.
private val Amber = Color(0xFFB5651D)
private val WarmDark = Color(0xFF1C1714)
private val WarmPaper = Color(0xFFF3E9DB)

private val DarkColors = darkColorScheme(
    primary = Amber,
    background = WarmDark,
    surface = Color(0xFF26201B),
)

private val LightColors = lightColorScheme(
    primary = Amber,
    background = WarmPaper,
    surface = Color(0xFFFBF4EA),
)

@Composable
fun EInkTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content
    )
}
