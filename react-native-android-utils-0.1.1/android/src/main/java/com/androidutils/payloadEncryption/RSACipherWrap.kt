package com.androidutils.payloadEncryption

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.Key
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.spec.MGF1ParameterSpec
import javax.crypto.Cipher
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource

class RSACipherWrap {

    companion object {
      const val TAG = "RSACipherWrap"
        private const val RSA_ECB_OAEP_PADDING = "RSA/ECB/OAEPwithSHA-256andMGF1Padding"
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private const val APP_KEY_ALIAS = "cpSecureKeys"
    }

    init {
        generateKeyPair()
    }


    fun generateKeyPair(): KeyPair {
        // Check if the RSA key pair already exists
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE)
        keyStore.load(null)
        if (!keyStore.containsAlias(APP_KEY_ALIAS)) {
            // Generate a new RSA key pair
            val keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, ANDROID_KEY_STORE)
            val spec = KeyGenParameterSpec.Builder(
                APP_KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
                .setKeySize(3072)
                .setDigests(KeyProperties.DIGEST_SHA256)
                .build()
            keyPairGenerator.initialize(spec)
            return keyPairGenerator.generateKeyPair()
        } else {
            // Load the existing RSA key pair
            val privateKey = keyStore.getKey(APP_KEY_ALIAS, null) as PrivateKey
            val publicKey = keyStore.getCertificate(APP_KEY_ALIAS).publicKey
            return KeyPair(publicKey, privateKey)
        }
    }

    fun encrypt(
        textToEncrypt: String,
        publicKey: PublicKey
    ): String {
        val cipher = initCipher(Cipher.ENCRYPT_MODE, publicKey)
        val encryptedBytes = cipher.doFinal(textToEncrypt.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(encryptedBytes, Base64.DEFAULT)
    }

    fun decrypt(
        encryptedText: String
    ): String {
        val cipher = initCipher(Cipher.DECRYPT_MODE,generateKeyPair().private)
        val decryptedBytes = cipher.doFinal(Base64.decode(encryptedText, Base64.DEFAULT))
        return String(decryptedBytes)
    }

    private fun initCipher(mode:Int, key: Key?=null):Cipher{
        val cipher = Cipher.getInstance(RSA_ECB_OAEP_PADDING)
        val oAEPParameterSpec = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT)
        cipher.init(mode,key,oAEPParameterSpec)
        return cipher
  }
}
