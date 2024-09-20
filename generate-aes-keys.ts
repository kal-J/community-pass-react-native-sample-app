(() => {

    const crypto = require('crypto');
    const fs = require('fs');
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    console.log("Key length => ", key.length);
    console.log("Base64 Key length => ", key.toString('base64').length);

    console.log('AES-256 Key (Base64):', key.toString('base64'));
    console.log('IV (Base64):', iv.toString('base64'));

    fs.writeFileSync('aes-256-key.txt', key.toString('base64'));

    // Example of how to use the key and IV for encryption
    const algorithm = 'aes-256-cbc';
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const plaintext = 'Hello, World!';
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    console.log('Encrypted:', encrypted);

})();