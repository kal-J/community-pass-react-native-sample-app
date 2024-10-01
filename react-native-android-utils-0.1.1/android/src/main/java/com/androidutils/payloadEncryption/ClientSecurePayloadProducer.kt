package com.androidutils.payloadEncryption

class ClientSecurePayloadProducer {
    private val aesCipherWrap: AESCipherWrap = AESCipherWrap()
    private val aesSecretKey = aesCipherWrap.generateAESKey()
    private val rsaCipherWrap = RSACipherWrap()
    private val aesSecreteKeyLength = 518

    fun prepareRequestPayload(data: String, bridgeRaPublicKey: String): String {
        val aesEncryptedPayload = aesCipherWrap.aesEncrypt(data.toByteArray(), aesSecretKey)
        val aesEncodedEncryptedPayload = EncodingUtils.toBase64EncodedString(aesEncryptedPayload)

        val stringAESKey = aesCipherWrap.aesSecreteKeyToString(aesSecretKey)
        val publicKey = CompassEncodedKeySpec.getKey(bridgeRaPublicKey)
        val rsaEncodedEncryptedKey = rsaCipherWrap.encrypt(stringAESKey, publicKey!!)
        return "$rsaEncodedEncryptedKey$aesEncodedEncryptedPayload"
    }

    fun parseResponsePayload(encryptedData: String): String {
        val decryptedKey = rsaCipherWrap.decrypt(encryptedData.substring(0, aesSecreteKeyLength))
        val aesKey = aesCipherWrap.aesSecretStringToKey(decryptedKey)
        val decryptedData = aesCipherWrap.aesDecrypt(
            EncodingUtils.fromBase64EncodedString(
              encryptedData.substring(
                aesSecreteKeyLength + 1,
                encryptedData.length
              )
            ),
          aesKey
        )
        return String(decryptedData)
    }
}
