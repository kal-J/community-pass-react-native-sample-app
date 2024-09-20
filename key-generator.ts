
(() => {

  const crypto = require('crypto');
  const fs = require('fs');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('RSA KeyPair generated successfully.');
// Base64 encode the keys
const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
const privateKeyBase64 = Buffer.from(privateKey).toString('base64');

console.log('publicKeyBase64:');
console.log(publicKeyBase64);
// save public key to file
fs.writeFileSync('public-key.txt', publicKeyBase64);
console.log('privateKeyBase64:');
console.log(privateKeyBase64);
fs.writeFileSync('private-key.txt', privateKeyBase64);

// Decrypt the base64 encoded keys for use
const decodedPublicKey = Buffer.from(publicKeyBase64, 'base64').toString('ascii');
const decodedPrivateKey = Buffer.from(privateKeyBase64, 'base64').toString('ascii');

console.log('Decoded public key:', decodedPublicKey);
console.log("\n\n");
console.log('Decoded private key:', decodedPrivateKey);

// Example of encryption and decryption using the generated keys
const message = 'Hello, RSA!';

// Encrypt
const encryptedData = crypto.publicEncrypt(
  {
    key: decodedPublicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },
  Buffer.from(message)
);

console.log('Encrypted data:', encryptedData.toString('base64'));

// Decrypt
const decryptedData = crypto.privateDecrypt(
  {
    key: decodedPrivateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  },
  encryptedData
);

console.log('Decrypted message:', decryptedData.toString());


})();