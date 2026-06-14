package com.eink.mode.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.View
import com.eink.mode.data.EInkSettings
import kotlin.random.Random

/**
 * Full-screen, non-interactive view that paints the e-ink look in a single [onDraw] pass:
 * warm amber wash, bottom-edge frontlight bleed with soft hotspots, a tiled noise/halftone
 * "paper grime" texture (with a faint gray wash to crush contrast), and an optional global dim.
 *
 * It never intercepts touches — the host window uses FLAG_NOT_TOUCHABLE — so the layers below
 * stay fully usable.
 */
class OverlayView(context: Context) : View(context) {

    private var settings: EInkSettings = EInkSettings()

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val gradientPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val hotspotPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val noisePaint = Paint().apply { isFilterBitmap = false }

    // Small tile reused as a repeating shader so we don't allocate a screen-sized bitmap.
    private val noiseTile: Bitmap = buildNoiseTile()
    private val noiseShader = BitmapShader(noiseTile, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)

    init {
        // Let the warm/dim/noise layers composite over whatever is on screen below.
        setLayerType(LAYER_TYPE_HARDWARE, null)
        noisePaint.shader = noiseShader
    }

    fun update(newSettings: EInkSettings) {
        settings = newSettings
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        drawWarmWash(canvas, w, h)
        drawGrime(canvas, w, h)
        drawEdgeLight(canvas, w, h)
        drawDim(canvas, w, h)
    }

    /** Semi-transparent amber/red tint over the whole screen. */
    private fun drawWarmWash(canvas: Canvas, w: Float, h: Float) {
        val a = (settings.warmth * 150f).toInt().coerceIn(0, 200)
        if (a == 0) return
        // Warm amber; reduced blue/green is what kills the "screen glow" feel.
        fillPaint.shader = null
        fillPaint.color = Color.argb(a, 230, 120, 40)
        canvas.drawRect(0f, 0f, w, h, fillPaint)
    }

    /** Tiled noise plus a faint neutral-gray wash that lifts blacks toward "paper" gray. */
    private fun drawGrime(canvas: Canvas, w: Float, h: Float) {
        if (settings.grime <= 0f) return
        // Faint gray wash = a gentle contrast crush.
        val washAlpha = (settings.grime * 60f).toInt().coerceIn(0, 90)
        fillPaint.shader = null
        fillPaint.color = Color.argb(washAlpha, 128, 122, 110)
        canvas.drawRect(0f, 0f, w, h, fillPaint)

        // Speckled paper texture.
        noisePaint.alpha = (settings.grime * 70f).toInt().coerceIn(0, 110)
        canvas.drawRect(0f, 0f, w, h, noisePaint)
    }

    /** Warmer, brighter glow rising from the bottom edge with a few uneven hotspots. */
    private fun drawEdgeLight(canvas: Canvas, w: Float, h: Float) {
        val intensity = settings.edgeLight
        if (intensity <= 0f) return

        // Vertical bleed: warm at the bottom edge, fading to nothing partway up.
        val bleedTop = h * (1f - 0.28f * intensity)
        val edgeAlpha = (intensity * 120f).toInt().coerceIn(0, 160)
        gradientPaint.shader = LinearGradient(
            0f, h, 0f, bleedTop,
            Color.argb(edgeAlpha, 255, 170, 90),
            Color.argb(0, 255, 170, 90),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, bleedTop, w, h, gradientPaint)

        // A handful of soft, uneven LED hotspots, like an aging Paperwhite frontlight.
        val hotspotCount = 5
        val radius = w / hotspotCount * 0.9f
        val cy = h - radius * 0.15f
        for (i in 0 until hotspotCount) {
            // Deterministic jitter so hotspots stay put between frames but look irregular.
            val jitter = HOTSPOT_JITTER[i]
            val cx = w * ((i + 0.5f) / hotspotCount) + jitter * w * 0.04f
            val coreAlpha = (intensity * 90f * (0.7f + jitter * 0.3f)).toInt().coerceIn(0, 150)
            hotspotPaint.shader = RadialGradient(
                cx, cy, radius,
                Color.argb(coreAlpha, 255, 190, 110),
                Color.argb(0, 255, 190, 110),
                Shader.TileMode.CLAMP
            )
            canvas.drawCircle(cx, cy, radius, hotspotPaint)
        }
    }

    /** Optional extra neutral darkening on top of everything else. */
    private fun drawDim(canvas: Canvas, w: Float, h: Float) {
        val a = (settings.dim * 180f).toInt().coerceIn(0, 220)
        if (a == 0) return
        fillPaint.shader = null
        fillPaint.color = Color.argb(a, 0, 0, 0)
        canvas.drawRect(0f, 0f, w, h, fillPaint)
    }

    private fun buildNoiseTile(): Bitmap {
        val size = 96
        val pixels = IntArray(size * size)
        val rng = Random(42) // fixed seed → stable, non-shimmering texture
        for (i in pixels.indices) {
            val v = rng.nextInt(0, 256)
            // Slightly warm-gray grain rather than pure black/white.
            pixels[i] = Color.argb(255, v, (v * 0.96f).toInt(), (v * 0.9f).toInt())
        }
        return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
    }

    companion object {
        // Stable per-hotspot jitter factors in roughly -1..1.
        private val HOTSPOT_JITTER = floatArrayOf(-0.8f, 0.5f, -0.2f, 0.9f, -0.5f)
    }
}
