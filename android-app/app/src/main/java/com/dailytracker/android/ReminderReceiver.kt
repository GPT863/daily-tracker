package com.dailytracker.android

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val rawJson = intent.getStringExtra("reminder_json") ?: return
        val reminderJson = runCatching { JSONObject(rawJson) }.getOrNull() ?: return
        val reminder = NativeReminder(
            id = reminderJson.optString("id", ""),
            title = reminderJson.optString("title", ""),
            type = reminderJson.optString("type", "other"),
            date = reminderJson.optString("date", ""),
            time = reminderJson.optString("time", ""),
            repeat = reminderJson.optString("repeat", "none"),
            notes = reminderJson.optString("notes", ""),
            completed = reminderJson.optBoolean("completed", false),
            snoozeUntil = reminderJson.optString("snoozeUntil", "").ifBlank { null }
        )

        ReminderScheduler.notifyNow(context, reminder)
        if (reminder.repeat != "none" && !reminder.completed) {
            ReminderScheduler.scheduleNext(
                context,
                reminder.copy(snoozeUntil = null)
            )
        }
    }
}

