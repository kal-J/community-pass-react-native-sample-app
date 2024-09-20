package com.cpreactbridgera

import android.util.Base64
import com.facebook.react.bridge.*
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher

class RSAEncryptionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "RSAEncryption"

    @ReactMethod
    fun encryptRSA(str: String, key: String, promise: Promise) {
        try {
            if (str.isEmpty()) {
                promise.reject("ERROR", "Input string is empty")
                return
            }
            val generatePublicKey = generatePublicKey(key)
            val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
            cipher.init(Cipher.ENCRYPT_MODE, generatePublicKey)
            val bytes = str.toByteArray(StandardCharsets.UTF_8)
            val encrypted = Base64.encodeToString(cipher.doFinal(bytes), Base64.DEFAULT)
            promise.resolve(encrypted)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    private fun generatePublicKey(str: String): PublicKey {
        val decode = Base64.decode(str, Base64.DEFAULT)
        return KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(decode))
    }
}