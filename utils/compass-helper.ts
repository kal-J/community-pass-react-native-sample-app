
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import * as env from '../env';
import { Alert } from 'react-native';
import crypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';
import Aes from 'react-native-aes-crypto';
import { RSA } from 'react-native-rsa-native';
import { NativeModules, Platform } from 'react-native';
import forge from 'node-forge';
import isBase64 from 'is-base64';
import * as Crypto from 'expo-crypto';
import base64 from 'react-native-base64';
import encryptWithNativeRSA from './rsa-encryption';


const base64ToArrayBuffer = (base64String: string) => {
    const binaryString = base64.decode(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };
  
  // Convert ArrayBuffer to base64 string
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return base64.encode(binary);
  };

async function generateRSAKeyPair() {
    try {
        // Generate RSA key pair (2048-bit)
        const keys = await RSA.generateKeys(3072);
        const { public: publicKey, private: privateKey } = keys;
        console.log('RSA Key Pair:\n');

        console.log('RSA Public Key:', publicKey);
        console.log('\n');
        console.log('RSA Private Key:', privateKey);
        console.log('\n');

        return { publicKey, privateKey };
    } catch (error) {
        console.error('RSA Key Generation error:', error);
    }
}

// generateRSAKeyPair();

const generateKey = (password: string, salt: string, cost: number, length: number) => Aes.pbkdf2(password, salt, cost, length, 'sha256');

generateKey('bridgeRaAesKeyPassword', 'salt', 5000, 256).then((key) => {
    console.log('AES Key:', key);
    console.log('AES Key length:', key.length);
})

 Aes.randomKey(32).then(key => {
     console.log('AES Key 2:', key);
     console.log('AES Key 2 length:', key.length);
     console.log(Buffer.from(key).toString('base64'));

 });

export interface UnifiedApiResponse {
    payload?: Record<string, any>;
    error?: {
        action: string;
        errorMessage: string;
        extraErrorMessage: string;
    };
}

const iv = crypto.randomBytes(16);

export default class CompassHelper {

    public instanceId: string | null = null;
    public bridgeRAEncPublicKey: string | null = null;
    public poiDeviceId: string | null = null;
    public svaIntegrityKey: string | null = null;

    constructor() {
        this.initialize();
    }

    async initialize() {
        /* const raPublicKey = await this.getFromLocalSecureStore('raPublicKey');
        if (!raPublicKey) {
            const keys = await this.generateRSAKeyPair();
            if (!keys) return;
            this.saveToLocalSecureStore('raPublicKey', keys.publicKey);
            this.saveToLocalSecureStore('raPrivateKey', keys.privateKey);
        } */

        this.instanceId = (await this.getFromLocalSecureStore('instanceId')) || (await this.getInstanceId());
        this.bridgeRAEncPublicKey = await this.getFromLocalSecureStore('bridgeRAEncPublicKey');
        this.poiDeviceId = await this.getFromLocalSecureStore('poiDeviceId');
        this.svaIntegrityKey = await this.getFromLocalSecureStore('svaIntegrityKey');
    }

    async generateRSAKeyPair() {
        try {
            // Generate RSA key pair (2048-bit)
            const keys = await RSA.generateKeys(3072);
            const { public: publicKey, private: privateKey } = keys;
            console.log('RSA Key Pair:\n');

            console.log('RSA Public Key:', publicKey);
            console.log('\n');
            console.log('RSA Private Key:', privateKey);
            console.log('\n');

            return { publicKey, privateKey };
        } catch (error) {
            console.error('RSA Key Generation error:', error);
        }
    }

    async saveToLocalSecureStore(key: string, value: string) {
        await SecureStore.setItemAsync(key, value);
    }

    async getFromLocalSecureStore(key: string) {
        return await SecureStore.getItemAsync(key);
    }

    async prepareCMT(data: {
        transactionTagId: string,
        status: string,
        payload: Record<string, any>
    }) {

        return (
            {
                systemInfo: {
                    "type": "Request"
                },
                commonAttributes: {
                    clientAppDetails: {
                        reliantAppId: env.RELIANT_APP_GUID
                    },
                    serviceProvider: {
                        participationProgramId: env.PROGRAM_GUID
                    },
                    transaction: {
                        tagId: data.transactionTagId,
                        status: data.status
                    }
                },
                custom: {
                    ClientConstraint: [
                        "commonAttributes.transaction.tagId"
                    ]
                },
                payload: {
                    reliantAppGuid: env.RELIANT_APP_GUID,
                    programGuid: env.PROGRAM_GUID,
                    raPublicKey: env.RA_PUBLIC_KEY,
                    ...data.payload,
                }
            }


        );

    }

    async executeUnifiedApiRequest(requestCode: string, requestData: string): Promise<UnifiedApiResponse> {
        let cpError: any = null;
        const result = await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
            className: 'com.mastercard.compass.bridgera.CommunityPassUnifiedApi',
            packageName: env.PACKAGE_NAME,
            type: 'text/plain',
            extra: {
                'REQUEST_CODE': requestCode,
                'REQUEST_DATA': requestData,
            },

        }).catch((error) => {
            console.log(error);
            cpError = error;
            return Promise.resolve(null);
        });

        if (!result) {
            return Promise.resolve({
                error: cpError,
            });
        }

        const responseExtra: any = result?.extra;
        const response = JSON.parse(responseExtra?.RESPONSE_DATA);

        console.log('response: ', response, "\n");
        console.log('response payload: ', response?.payload, "\n");

        return Promise.resolve({
            payload: response?.payload
        });

    }

    async encryptPayload(payload: string) {
        try {
            const encryptedPayload = await Aes.randomKey(16).then(iv => {
                return Aes.encrypt(payload, env.AES256KEY, iv, 'aes-256-cbc')
            });
            console.log('encryptedPayload: ', encryptedPayload, "\n");
            console.log('encryptedPayload length: ', encryptedPayload.length, "\n");
            return encryptedPayload;
        } catch(err) {
            console.log('encryptPayload error: ', err, "\n");
            throw err;
        }

        
    }

    async encryptAesKey2(bridgeRAEncPublicKey: string, aesKey: string) {
        try {
          const publicKey = forge.pki.publicKeyFromPem(bridgeRAEncPublicKey);
          console.log('\bridgeRAEncPublicKey: \n', bridgeRAEncPublicKey, "\n");
          const encodedMsg = await RSA.encrypt(aesKey, bridgeRAEncPublicKey);
          console.log('\encodedMsg: \n', encodedMsg.trim(), "\n");
          console.log('\encodedMsg length: \n', encodedMsg.trim().length, "\n");
          const encryptedAesKey = publicKey.encrypt(aesKey, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: {
              md: forge.md.sha1.create()
            },
          });
          return forge.util.encode64(encryptedAesKey);
        } catch (error) {
          console.error('Encryption error:', error);
          throw error; 
        }
      };

      async encryptStringWithRSA (stringToEncrypt: string, publicKey: string) {
        const bridgeRaPublicKey = `MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA2jvAOy3LXtfliefwvQJghF03TydR/wB9kRAMPVQsNU5inIk7ak56jIxMMflFjYPYWgg1Hb+GuNDR8yeUxoUdXkzGPx+QgevisZR9oHiSrwmrK02uA20Y0T7QsnpxqKN1FgSrPFvP8qnGFUoREMVuc1SmLIsHzmoXy2HyL8zsivzKXlUe1TmBPqAlzttFlp+KDtlv/UgH6Sy2VRigETVSoP3q8Op/GNBbUD9sNoTFdPXq7Ift2BDd4Wg+h39vQPCDU5xuuPnhAs1bjlldmpgtljCZtY4jG2XRNcsMtoaC4x5MZ9SEQvTujj75bWWo1qhzb8yoUHXY4Xl5aJDcPMpz/mrUdpK1vA0HhEuwMleVugGnPXEbESDjhlNeR3apLXyie24KYh3ZdptZVkCHPaFFQluSYCYDpLm+8xyqoyIf7XlAaPBBWMmonD1hlq3M8siffuqphMGu+YnR4Pka7L1hsjHyOIhkR5L4EQb6bt7b7DXgumR4Zy0xt4/wjqIOA5azAgMBAAE=`;
        try {
          // Convert the string to encrypt to an ArrayBuffer
          const encoder = new TextEncoder();
          const data = encoder.encode(stringToEncrypt);
      
          const extractable = false;
          
          const importedPublicKey = await crypto.subtle.importKey(
            'spki',
            base64ToArrayBuffer(bridgeRaPublicKey),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            extractable,
            ['encrypt']
          );

      
          // Encrypt the data
          const encryptedData = await crypto.subtle.encrypt(
            {
              name: 'RSA-OAEP',
            },
            importedPublicKey,
            data
          );
      
          // Convert the encrypted data to a Base64 string
          const encryptedBase64 = base64.encodeFromByteArray(new Uint8Array(encryptedData));

          const nativeEncryptedBase64 = (await encryptWithNativeRSA(env.AES256KEY, bridgeRaPublicKey)).trim();

          console.log('Native encrypted base64: ', nativeEncryptedBase64, "\n");
          console.log('Native encrypted base64 length: ', nativeEncryptedBase64.length, "\n");
          console.log('is base 64 Native encrypted base64: ', isBase64(nativeEncryptedBase64), "\n");
          // throw new Error('Native encrypted base64: ' + nativeEncryptedBase64);
      
          return nativeEncryptedBase64;
        } catch (error) {
          console.error('encryptStringWithRSA Encryption error:', error);
          throw error;
        }
      };

    async encryptAesKey() {
        try {
            if (!this.bridgeRAEncPublicKey) {
                throw new Error('BridgeRA Encryption public key not found');
            }
            this.bridgeRAEncPublicKey = `MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA2jvAOy3LXtfliefwvQJghF03TydR/wB9kRAMPVQsNU5inIk7ak56jIxMMflFjYPYWgg1Hb+GuNDR8yeUxoUdXkzGPx+QgevisZR9oHiSrwmrK02uA20Y0T7QsnpxqKN1FgSrPFvP8qnGFUoREMVuc1SmLIsHzmoXy2HyL8zsivzKXlUe1TmBPqAlzttFlp+KDtlv/UgH6Sy2VRigETVSoP3q8Op/GNBbUD9sNoTFdPXq7Ift2BDd4Wg+h39vQPCDU5xuuPnhAs1bjlldmpgtljCZtY4jG2XRNcsMtoaC4x5MZ9SEQvTujj75bWWo1qhzb8yoUHXY4Xl5aJDcPMpz/mrUdpK1vA0HhEuwMleVugGnPXEbESDjhlNeR3apLXyie24KYh3ZdptZVkCHPaFFQluSYCYDpLm+8xyqoyIf7XlAaPBBWMmonD1hlq3M8siffuqphMGu+YnR4Pka7L1hsjHyOIhkR5L4EQb6bt7b7DXgumR4Zy0xt4/wjqIOA5azAgMBAAE=`;
            
            console.log("bridgeRAEncPublicKey:", this.bridgeRAEncPublicKey, "\n");
            console.log("bridgeRAEncPublicKey length:", this.bridgeRAEncPublicKey.length, "\n");
            console.log("Is base64 encoded bridgeRAEncPublicKey?: ", isBase64(this.bridgeRAEncPublicKey), "\n");
            const formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${this.bridgeRAEncPublicKey}-----END PUBLIC KEY-----\n`;

            const publicKey = `-----BEGIN RSA PUBLIC KEY-----\n${this.bridgeRAEncPublicKey}-----END RSA PUBLIC KEY-----\n`;
            // const encoded64 = `${await this.encryptAesKey2(formattedPublicKey, env.AES256KEY)}`;

            

            const encrypted = await this.encryptStringWithRSA(env.AES256KEY, this.bridgeRAEncPublicKey);  // (await RSA.encrypt(env.AES256KEY, formattedPublicKey));
            const encoded = encrypted;

            console.log("encrypted aes length: ", encoded.length, "\n");
            console.log('encrypted base64 encoded AES key: ', encoded, "\n");
            console.log('Is base64 encoded AES key?: ', isBase64(encoded), "\n");
            return encoded;

            console.log('\n\nthis.bridgeRAEncPublicKey: ', this.bridgeRAEncPublicKey, "\n");

            const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${this.bridgeRAEncPublicKey}-----END PUBLIC KEY-----\n`;
            console.log("\n", publicKeyPEM, "\n");
            const encryptedAesKey = crypto.publicEncrypt(
                {
                    key: publicKeyPEM,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    // @ts-ignore
                    oaepHash: 'sha256',

                },
                Buffer.from(env.AES256KEY)
            );

            return encryptedAesKey.toString('base64');
        } catch (error) {
            console.log('encryptAesKey', error);
            throw error;
        }

    }

    async getInstanceId() {
        const requestData = JSON.stringify(await this.prepareCMT({
            transactionTagId: 'BridgeRA',
            status: 'Testing',
            payload: {
                reliantAppGuid: env.RELIANT_APP_GUID,
                raPublicKey: env.RA_PUBLIC_KEY,
            },
        }));

        // console.log('requestData: \n', requestData, "\n");

        const response = await this.executeUnifiedApiRequest('1053', requestData);
        if (!response?.payload?.data?.instanceId) {
            Alert.alert('Error', 'There was an error fetching the instance id.');
            return null;
        }
        await this.saveToLocalSecureStore('instanceId', response.payload.data.instanceId);
        await this.saveToLocalSecureStore('bridgeRAEncPublicKey', response.payload.data?.bridgeRAEncPublicKey);
        await this.saveToLocalSecureStore('poiDeviceId', response.payload.data?.poiDeviceId);
        await this.saveToLocalSecureStore('svaIntegrityKey', response.payload.data?.svaIntegrityKey);

        return response?.payload?.data?.instanceId as string;

    }

    async saveBiometricsConsent(granted: 1 | 0) {

        try {

            const payload = JSON.stringify(this.prepareCMT({
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    reliantAppGuid: env.RELIANT_APP_GUID,
                    programGuid: env.PROGRAM_GUID,
                    consentValue: "1"
                },
            }));
            const encryptedPayload = await this.encryptPayload(payload);
            const encryptedAesKey = await this.encryptAesKey();
            console.log('encryptedPayload: ', encryptedPayload, "\n");
            console.log('encryptedAesKey: ', encryptedAesKey, "\n");
            const requestData = encryptedAesKey + encryptedPayload;
           // console.log('requestData: ', requestData, "\n");
            const response = await this.executeUnifiedApiRequest('1031', requestData);

            console.log('saveBiometricsConsent response: ', response, "\n");

            return response;

        } catch (error) {
            console.log('saveBiometricsConsent error: ', error, "\n");
            return null;
        }


    }


}