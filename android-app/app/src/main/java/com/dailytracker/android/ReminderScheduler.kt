package com.dailytracker.android

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object ReminderScheduler {
    private const val PREFS_NAME = "android_native_reminders"
    private const val KEY_REMINDERS_JSON = "reminders_json"
    private const val CHANNEL_ID = "daily_tracker_reminders"
    private val dateFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val timeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    fun syncFromJson(context: Context, rawJson: String) {
        val reminders = parseReminders(rawJson)
        cancelScheduledReminders(context, loadReminders(context))
        saveReminders(context, rawJson)
        scheduleAll(context, reminders)
    }

    fun rescheduleFromStorage(context: Context) {
        scheduleAll(context, loadReminders(context))
    }

    fun notifyNow(context: Context, reminder: NativeReminder) {
        createNotificationChannel(context)
        if (!hasNotificationPermission(context)) return

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("open_page", "reminders")
            putExtra("reminder_id", reminder.id)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            reminder.id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(reminder.title.ifBlank { "提醒" })
            .setContentText(reminder.notes.ifBlank { reminder.time })
            .setStyle(NotificationCompat.BigTextStyle().bigText(reminder.notes.ifBlank { reminder.time }))
            .setContentIntent(contentPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(reminder.id.hashCode(), notification)
    }

    fun scheduleNext(context: Context, reminder: NativeReminder) {
        if (reminder.completed) return
        createNotificationChannel(context)

        val triggerAtMillis = computeNextTriggerTime(reminder) ?: run {
            cancelReminder(context, reminder)
            return
        }

        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("reminder_json", reminderToJson(reminder).toString())
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminder.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    fun cancelReminder(context: Context, reminder: NativeReminder) {
        val intent = Intent(context, ReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminder.id.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pendingIntent?.let {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(it)
            it.cancel()
        }
        NotificationManagerCompat.from(context).cancel(reminder.id.hashCode())
    }

    private fun scheduleAll(context: Context, reminders: List<NativeReminder>) {
        reminders.forEach { scheduleNext(context, it) }
    }

    private fun loadReminders(context: Context): List<NativeReminder> {
        val rawJson = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_REMINDERS_JSON, "[]")
            ?: "[]"
        return parseReminders(rawJson)
    }

    private fun saveReminders(context: Context, rawJson: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_REMINDERS_JSON, rawJson)
            .apply()
    }

    private fun cancelScheduledReminders(context: Context, reminders: List<NativeReminder>) {
        reminders.forEach { cancelReminder(context, it) }
    }

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "健康日记提醒",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "活动、用药、睡眠等提醒通知"
        }

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    fun hasNotificationPermission(context: Context): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
    }

    private fun parseReminders(rawJson: String): List<NativeReminder> {
        val jsonArray = try {
            JSONArray(rawJson)
        } catch (_: Exception) {
            JSONArray()
        }

        return buildList {
            for (index in 0 until jsonArray.length()) {
                val item = jsonArray.optJSONObject(index) ?: continue
                val reminder = jsonToReminder(item) ?: continue
                add(reminder)
            }
        }
    }

    private fun jsonToReminder(json: JSONObject): NativeReminder? {
        val id = json.optString("id", "").trim()
        val date = json.optString("date", "").trim()
        val time = json.optString("time", "").trim()
        if (id.isBlank() || date.isBlank() || time.isBlank()) return null

        return NativeReminder(
            id = id,
            title = json.optString("title", ""),
            type = json.optString("type", "other"),
            date = date,
            time = time,
            repeat = normalizeRepeat(json.optString("repeat", "none")),
            notes = json.optString("notes", ""),
            completed = json.optBoolean("completed", false),
            snoozeUntil = json.optString("snoozeUntil", "").ifBlank { null }
        )
    }

    private fun reminderToJson(reminder: NativeReminder): JSONObject {
        return JSONObject().apply {
            put("id", reminder.id)
            put("title", reminder.title)
            put("type", reminder.type)
            put("date", reminder.date)
            put("time", reminder.time)
            put("repeat", reminder.repeat)
            put("notes", reminder.notes)
            put("completed", reminder.completed)
            put("snoozeUntil", reminder.snoozeUntil ?: JSONObject.NULL)
        }
    }

    private fun computeNextTriggerTime(reminder: NativeReminder): Long? {
        val now = Instant.now()
        reminder.snoozeUntil?.let {
            runCatching { Instant.parse(it) }
                .getOrNull()
                ?.takeIf { snoozeAt -> snoozeAt.isAfter(now) }
                ?.let { return it.toEpochMilli() }
        }

        val baseDate = runCatching { LocalDate.parse(reminder.date, dateFormatter) }.getOrNull() ?: return null
        val baseTime = runCatching { LocalTime.parse(reminder.time, timeFormatter) }.getOrNull() ?: return null
        var scheduled = LocalDateTime.of(baseDate, baseTime)
        val repeat = normalizeRepeat(reminder.repeat)
        val zoneId = ZoneId.systemDefault()

        if (repeat == "none") {
            val millis = scheduled.atZone(zoneId).toInstant().toEpochMilli()
            return millis.takeIf { it >= System.currentTimeMillis() }
        }

        val nowMillis = System.currentTimeMillis()
        var safetyCounter = 0
        while (scheduled.atZone(zoneId).toInstant().toEpochMilli() < nowMillis && safetyCounter < 512) {
            scheduled = when (repeat) {
                "daily" -> scheduled.plusDays(1)
                "weekly" -> scheduled.plusWeeks(1)
                "biweekly" -> scheduled.plusWeeks(2)
                "monthly" -> scheduled.plusMonths(1)
                else -> scheduled
            }
            safetyCounter += 1
        }

        return scheduled.atZone(zoneId).toInstant().toEpochMilli()
    }

    private fun normalizeRepeat(repeat: String?): String {
        return when (repeat?.trim()) {
            "daily", "weekly", "biweekly", "monthly" -> repeat.trim()
            else -> "none"
        }
    }
}
