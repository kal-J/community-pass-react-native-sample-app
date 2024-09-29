package com.cpreactbridgera

import android.util.Base64
import com.facebook.react.bridge.*
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import java.security.KeyPairGenerator
import java.security.spec.MGF1ParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource

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
            // Create the OAEPParameterSpec
            val oaepParams = OAEPParameterSpec(
                "SHA-256",
                "MGF1",
                MGF1ParameterSpec.SHA256,
                PSource.PSpecified.DEFAULT
            )
            cipher.init(Cipher.ENCRYPT_MODE, generatePublicKey, oaepParams)
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