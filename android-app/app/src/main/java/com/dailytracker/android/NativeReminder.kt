package com.dailytracker.android

data class NativeReminder(
    val id: String,
    val title: String,
    val type: String,
    val date: String,
    val time: String,
    val repeat: String,
    val notes: String,
    val completed: Boolean,
    val snoozeUntil: String?
)

