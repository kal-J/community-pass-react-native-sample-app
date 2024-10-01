package com.androidutils.payloadEncryption

import android.security.keystore.KeyProperties
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

class AESCipherWrap {

    companion object {
        private const val AES_CBC_PKCS5_PADDING = "AES/CBC/PKCS5Padding"
        private const val AES = KeyProperties.KEY_ALGORITHM_AES
    }

    fun generateAESKey(keySize: Int = 256): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(AES)
        keyGenerator.init(keySize)
        return keyGenerator.generateKey()
    }

    fun aesEncrypt(data: ByteArray, secretKey: SecretKey): ByteArray {
        val cipher = cipherInit(Cipher.ENCRYPT_MODE,secretKey)
        return cipher.doFinal(data)
    }

    fun aesDecrypt(encryptedData: ByteArray, secretKey: SecretKey): ByteArray {
        val cipher = cipherInit(Cipher.DECRYPT_MODE,secretKey)
        return cipher.doFinal(encryptedData)
    }

    private fun cipherInit(mode:Int, secretKey: SecretKey):Cipher{
        val cipher = Cipher.getInstance(AES_CBC_PKCS5_PADDING)
        val ivParameterSpec = IvParameterSpec(ByteArray(16))
        cipher.init(mode, secretKey, ivParameterSpec)
        return cipher
    }

    fun aesSecreteKeyToString(secretKey: SecretKey):String{
        return Base64.getEncoder().encodeToString(secretKey.encoded)
    }

    fun aesSecretStringToKey(encodedSecretKey: String):SecretKey{
        val decodedKey = Base64.getDecoder().decode(encodedSecretKey)
        return SecretKeySpec(decodedKey, 0, decodedKey.size, AES)
    }
}
