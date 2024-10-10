package com.androidutils.payloadEncryption

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(context: Context) {
  private val sharedPreferences: SharedPreferences = context.getSharedPreferences("MyPrefs", Context.MODE_PRIVATE)

  fun saveStringData(key: String, value: String){
    val editor = sharedPreferences.edit()
    editor.putString(key, value)
    editor.apply()
  }

  fun getStringData(key: String, defaultValue: String): String {
    return sharedPreferences.getString(key, defaultValue) ?: defaultValue
  }

  fun saveBoolData(key: String, value: Boolean){
    val editor = sharedPreferences.edit()
    editor.putBoolean(key, value)
    editor.apply()
  }

  fun getBoolData(key: String): Boolean {
    return sharedPreferences.getBoolean(key, false)
  }

  fun clearData(key: String): Boolean {
    return sharedPreferences.edit().remove(key).commit()
  }
}
