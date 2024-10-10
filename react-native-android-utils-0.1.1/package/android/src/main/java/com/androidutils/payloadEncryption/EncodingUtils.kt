package com.androidutils.payloadEncryption

import android.util.Base64

object EncodingUtils {
    fun toBase64EncodedString(data: ByteArray): String {
        return Base64.encodeToString(data, Base64.NO_WRAP)
    }

    fun toBase64Encoded(byteArray: ByteArray): ByteArray {
        return Base64.encode(byteArray, Base64.NO_WRAP)
    }

    fun fromBase64EncodedString(encodedString: String): ByteArray {
        return try {
            Base64.decode(encodedString, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            byteArrayOf()
        }
    }

    fun toBase64EncodedURLSafeString(data: ByteArray): String {
        return Base64.encodeToString(data, Base64.URL_SAFE)
    }

    fun fromBase64EncodedURLSafeString(encodedString: String): ByteArray {
        return Base64.decode(encodedString, Base64.URL_SAFE)
    }

    fun fromBase64DefaultEncodedString(encodedString: String): ByteArray {
        return Base64.decode(encodedString, Base64.DEFAULT)
    }
}
