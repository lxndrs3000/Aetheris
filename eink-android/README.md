# E-Ink Mode (Android)

Make your phone feel like a cheap, old front-lit e-ink reader: warm, grey, grainy and
low-reward, so the phone is boring to use and less addictive. A single persistent foreground
service draws a full-screen overlay on top of every app, plus an optional system grayscale
toggle. The effect applies globally to whatever is on screen — there is no separate browser
or content viewer.

> Android only. iOS does not allow third-party apps to draw a system-wide overlay or force
> grayscale, so this cannot be ported there.

## Features

- **Warm wash** – semi-transparent amber/red tint over the whole screen, with an intensity slider.
- **Edge light bleed** – warmer, brighter glow along the bottom edge with a few soft, uneven LED
  hotspots, mimicking an old Kindle Paperwhite frontlight.
- **E-ink grime** – a tiled noise/halftone texture plus a slight contrast crush for a grainy,
  low-gray "paper" look.
- **Global dim** – optional extra darkening on top of the tint.
- **True grayscale** – desaturates the whole screen to mono (the strongest anti-addiction lever).
  Requires a one-time ADB grant; afterwards it toggles in-app.
- **Quick toggle + scheduling** – a Quick Settings tile to turn the whole effect on/off, plus an
  optional daily schedule (e.g. auto-on after 20:00, off in the morning).

### Known limitations

The overlay may not cover the status bar, navigation bar, or secure screens (PIN entry, some
keyboards) on certain Android versions.

## Build

```bash
cd eink-android
./gradlew assembleDebug
```

This requires the Android SDK (compileSdk 35). Point Gradle at it with a `local.properties`:

```
sdk.dir=/path/to/Android/sdk
```

Install on a connected device:

```bash
./gradlew installDebug
```

## One-time grayscale setup

An overlay can tint but cannot remove saturation, so true grayscale uses the system
accessibility daltonizer, which needs `WRITE_SECURE_SETTINGS`. Grant it once over ADB:

```bash
adb shell pm grant com.eink.mode android.permission.WRITE_SECURE_SETTINGS
```

After that, the in-app **System grayscale** toggle works without a computer. (The app shows this
command, with a copy button, when the permission is missing.)

## How it works (tech notes)

- **Overlay**: a foreground `Service` (`OverlayService`) holds a `WindowManager` view of type
  `TYPE_APPLICATION_OVERLAY` with `FLAG_NOT_TOUCHABLE | FLAG_NOT_FOCUSABLE`, laid out full-screen
  including the display cutout. Tint, edge bleed, noise and dim are rendered in a single `Canvas`
  pass in `OverlayView`.
- **Grayscale**: `GrayscaleController` sets `Settings.Secure` keys
  `accessibility_display_daltonizer_enabled = 1` and `accessibility_display_daltonizer = 0`
  (monochrome), guarded so a missing grant degrades gracefully.
- **Quick toggle**: `EInkTileService` (a `TileService`) flips the master switch; if overlay
  permission is missing it sends you to the app to grant it.
- **Scheduling**: `ScheduleManager` registers two daily `AlarmManager` alarms that fire
  `ScheduleReceiver`, which also re-arms everything after a reboot.
- **Persistence**: settings live in DataStore (`SettingsRepository`); the UI, tile, service and
  scheduler all observe the same stream, so changes apply live.

## Project layout

```
app/src/main/java/com/eink/mode/
  MainActivity.kt          Compose settings screen host + permission flows
  EInkApplication.kt       Restores service on launch, keeps the alarm schedule in sync
  EInkController.kt        Central enable/disable/toggle coordination
  data/                    EInkSettings + DataStore-backed SettingsRepository
  service/                 OverlayService (foreground) + OverlayView (rendering)
  grayscale/               GrayscaleController (system monochrome via Settings.Secure)
  tile/                    EInkTileService (Quick Settings tile)
  schedule/                ScheduleManager + ScheduleReceiver (AlarmManager + boot)
  ui/                      SettingsScreen + theme
```

## Out of scope

- Pixelating photos or degrading video in any app — the Android sandbox forbids this for
  third-party apps (and grayscale + warm dim already strips most of what makes feeds compelling).
- Any system-wide effect on iOS.
