package com.androidutils.payloadEncryption

import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyFactory
import java.security.NoSuchAlgorithmException
import java.security.PublicKey
import java.security.spec.InvalidKeySpecException
import java.security.spec.X509EncodedKeySpec

/**
 * Use this to encode key to string and decode key.
 * Both parties should agree on same encoding and decoding
 */
object CompassEncodedKeySpec {

    private const val ALGORITHM_RSA = KeyProperties.KEY_ALGORITHM_RSA
    const val TAG = "CompassEncodedKeySpec"

    fun getKey(key: String): PublicKey? {
        try {
            val byteKey: ByteArray = Base64.decode(key.toByteArray(), Base64.DEFAULT)
            val x509EncodedKeySpec = X509EncodedKeySpec(byteKey)
            val kf: KeyFactory = KeyFactory.getInstance(ALGORITHM_RSA)
            return kf.generatePublic(x509EncodedKeySpec)
        } catch (e: Exception) {
            Log.e(TAG, e.message!!)
        }
        return null
    }

    fun encodeToString(key: PublicKey?): String? {
        try {
            val fact = KeyFactory.getInstance(ALGORITHM_RSA)
            val spec: X509EncodedKeySpec = fact.getKeySpec(key, X509EncodedKeySpec::class.java)
            return Base64.encodeToString(spec.encoded, Base64.DEFAULT)
        } catch (e: InvalidKeySpecException) {
            Log.e(TAG, e.message!!)
        } catch (e: NoSuchAlgorithmException) {
            Log.e(TAG, e.message!!)
        }
        return null
    }
}
