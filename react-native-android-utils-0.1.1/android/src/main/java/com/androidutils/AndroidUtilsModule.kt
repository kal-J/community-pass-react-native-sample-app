package com.androidutils

import android.util.Log
import com.androidutils.payloadEncryption.AESCipherWrap
import com.androidutils.payloadEncryption.ClientSecurePayloadProducer
import com.androidutils.payloadEncryption.CompassEncodedKeySpec
import com.androidutils.payloadEncryption.PreferencesManager
import com.androidutils.payloadEncryption.RSACipherWrap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap

class AndroidUtilsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  private val rsaCipherWrap: RSACipherWrap by lazy { RSACipherWrap() }
  private val aesCipherWrap: AESCipherWrap by lazy { AESCipherWrap() }
  private val preferencesManager: PreferencesManager by lazy { PreferencesManager(context = reactContext) }
  private val clientSecurePayloadProducer: ClientSecurePayloadProducer by lazy { ClientSecurePayloadProducer() }

  @ReactMethod
  fun generateRsaKeyPair(promise: Promise){
    val rsaKeyPair = rsaCipherWrap.generateKeyPair()
    val publicKey = CompassEncodedKeySpec.encodeToString(rsaKeyPair.public)

    val resultMap = Arguments.createMap().apply {
      putString("publicKey", publicKey)
    }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun generateAesKey(promise: Promise){
    val aesSecretKey =  aesCipherWrap.generateAESKey()
    val aesStringKey = aesCipherWrap.aesSecreteKeyToString(aesSecretKey)

    val resultMap = Arguments.createMap().apply {
      putString("aesSecretKey", aesStringKey)
    }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun saveStringData(key: String, value: String, promise: Promise){
    preferencesManager.saveStringData(key, value)
    val resultMap = Arguments.createMap().apply { putBoolean("success", true) }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun saveBoolData(key: String, value: Boolean, promise: Promise){
    preferencesManager.saveBoolData(key, value)
    val resultMap = Arguments.createMap().apply { putBoolean("success", true) }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun getStringData(key: String, promise: Promise){
    val value = preferencesManager.getStringData(key = key, "")
    val resultMap = Arguments.createMap().apply { putString("data", value) }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun getBoolData(key: String, promise: Promise){
    val value = preferencesManager.getBoolData(key = key)
    val resultMap = Arguments.createMap().apply { putBoolean("data", value) }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun clearData(key: String, promise: Promise){
    val value = preferencesManager.clearData(key = key)
    val resultMap = Arguments.createMap().apply { putBoolean("success", value) }
    promise.resolve(resultMap)
  }

  @ReactMethod
  fun prepareRequestPayload(payload: ReadableMap, promise: Promise){
    if(!(payload.hasKey("cmt") && payload.hasKey("bridgeRaPublicKey"))) {
      val resultMap = Arguments.createMap().apply {
        putInt("code", 0)
        putString("message", "Missing  parameter")
      }
      promise.reject("error", resultMap)
    } else {
      val cmt = payload.getString("cmt") ?: ""
      val bridgeRaPublicKey = payload.getString("bridgeRaPublicKey") ?: ""
      val response = clientSecurePayloadProducer.prepareRequestPayload(cmt, bridgeRaPublicKey)
      val resultMap = Arguments.createMap().apply {
        putString("requestData", response)
      }
      promise.resolve(resultMap)
    }
  }

  @ReactMethod
  fun parseResponsePayload(cmtPayload: String, promise: Promise){
    val response = clientSecurePayloadProducer.parseResponsePayload(cmtPayload)
    val resultMap = Arguments.createMap().apply {
      putString("responseData", response)
    }
    promise.resolve(resultMap)
  }

  companion object {
    const val NAME = "AndroidUtils"
  }
}
