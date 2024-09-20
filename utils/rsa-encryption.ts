import isBase64 from 'is-base64';
import { NativeModules } from 'react-native';

const { RSAEncryption } = NativeModules;

const encryptWithNativeRSA = async (data: string, publicKey: string) => {
    if (!isBase64(publicKey)) {
        throw new Error('Invalid publicKey');
    }
    try {
        return await RSAEncryption.encryptRSA(data, publicKey);
    } catch(err) {
        console.log('encryptWithNativeRSA error: ', err, "\n");
        throw err;
    }
    
};

export default encryptWithNativeRSA;