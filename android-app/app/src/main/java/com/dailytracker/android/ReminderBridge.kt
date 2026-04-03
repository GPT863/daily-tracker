package com.dailytracker.android

import android.webkit.JavascriptInterface

class ReminderBridge(
    private val activity: MainActivity
) {
    @JavascriptInterface
    fun syncReminders(rawJson: String?) {
        if (rawJson.isNullOrBlank()) {
            ReminderScheduler.syncFromJson(activity, "[]")
            return
        }
        ReminderScheduler.syncFromJson(activity, rawJson)
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        activity.runOnUiThread {
            activity.requestNativeNotificationPermission()
        }
    }

    @JavascriptInterface
    fun notifyReminder(rawJson: String?) {
        if (rawJson.isNullOrBlank()) return
        val reminder = runCatching {
            org.json.JSONObject(rawJson)
        }.getOrNull() ?: return

        val parsed = NativeReminder(
            id = reminder.optString("id", ""),
            title = reminder.optString("title", ""),
            type = reminder.optString("type", "other"),
            date = reminder.optString("date", ""),
            time = reminder.optString("time", ""),
            repeat = reminder.optString("repeat", "none"),
            notes = reminder.optString("notes", ""),
            completed = reminder.optBoolean("completed", false),
            snoozeUntil = reminder.optString("snoozeUntil", "").ifBlank { null }
        )
        ReminderScheduler.notifyNow(activity, parsed)
    }
}

