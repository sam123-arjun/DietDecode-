#pragma once

// ==============================================================
// DietDecode ESP32 Firmware Configuration - Placeholder Template
// Copy this file to "secrets.h" and fill in your actual credentials.
// "secrets.h" is gitignored and will NEVER be committed to git.
// DO NOT put real credentials in this file.
// ==============================================================

// 1. Wi-Fi Configuration (2.4 GHz networks only — ESP32 does not support 5 GHz)
#define WIFI_SSID "Arjun"
#define WIFI_PASSWORD "20032004"

// 2. Firebase Web API Key
//    Firebase Console → Project Settings → General → Web API Key
#define FIREBASE_API_KEY "AIzaSyC4boAb6gnjoVOeYBNKcJ34sI-e864yrHg"

// 3. Dedicated Device Authentication Account
//    Firebase Console → Authentication → Users → Add user
//    Use a dedicated account (e.g. device-01@yourdomain.internal), NOT your
//    personal account.
#define FIREBASE_DEVICE_EMAIL "device-01@your-project.internal"
#define FIREBASE_DEVICE_PASSWORD "123456"
