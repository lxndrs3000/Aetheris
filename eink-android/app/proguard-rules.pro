# Keep service, tile, and receiver entry points referenced from the manifest.
-keep class com.eink.mode.service.OverlayService { *; }
-keep class com.eink.mode.tile.EInkTileService { *; }
-keep class com.eink.mode.schedule.ScheduleReceiver { *; }
