
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import * as env from '../env';
import { Alert, ToastAndroid } from 'react-native';
import {
    generateRsaKeyPair,
    prepareRequestPayload,
    generateAesKey,
    isCmtSchemaValid,
    parseResponsePayload,
    type RSAKeyPair,
    type AESSecret,
    type ParsedResponse,
    type PreparedRequest,
} from 'react-native-android-utils';

export interface UnifiedApiResponse {
    payload?: Record<string, any>;
    error?: {
        action: string;
        errorMessage: string;
        extraErrorMessage: string;
    };
}

export default class CompassHelper {
    public instanceId: string | null = null;
    public bridgeRAEncPublicKey: string | null = null;
    public poiDeviceId: string | null = null;
    public svaIntegrityKey: string | null = null;

    constructor() {
        this.initialize();
    }

    async initialize() {
        if (!(await this.getFromLocalSecureStore('instanceId'))) {
            const getInstanceIdResponse = (await this.getInstanceId());
            this.instanceId = getInstanceIdResponse?.instanceId;
        }
        this.bridgeRAEncPublicKey = await this.getFromLocalSecureStore('bridgeRAEncPublicKey');
        this.poiDeviceId = await this.getFromLocalSecureStore('poiDeviceId');
        this.svaIntegrityKey = await this.getFromLocalSecureStore('svaIntegrityKey');
    }

    async saveToLocalSecureStore(key: string, value: string) {
        await SecureStore.setItemAsync(key, value);
    }

    async getFromLocalSecureStore(key: string) {
        return await SecureStore.getItemAsync(key);
    }

    prepareCMT(data: {
        participationProgramId: string,
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
                        participationProgramId: data.participationProgramId
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
                    ...data.payload
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
            console.log("executeUnifiedApiRequest error:", error);
            cpError = error;
            return Promise.resolve(null);
        });

        if (!result) {
            return Promise.resolve({
                error: cpError,
            });
        }
        console.log("RESULT CODE: ", result?.resultCode);

        if (result?.resultCode == -1) {
            const responseData: string = (result?.extra as any)?.RESPONSE_DATA;
            console.log("responseData:", responseData);

            const response = await parseResponsePayload(responseData);
            const payload = JSON.parse(response?.responseData).payload;

            console.log('response.responseData: ', JSON.parse(response.responseData), "\n");
            return Promise.resolve({
                payload: payload
            });
        } else {
            const responseError: string = (result?.extra as any)?.RESPONSE_ERROR;
            console.log("responseError: ", responseError, "\n");
            const payload = JSON.parse(responseError).payload;
            return Promise.resolve({
                error: {
                    action: payload?.action,
                    errorMessage: payload?.data?.errorMessage,
                    extraErrorMessage: payload?.data?.extraErrorMessage
                }
            });
        }
    }

    async prepareRequest(data: string) {
        const preparedRequest = await prepareRequestPayload({
            cmt: data,
            bridgeRaPublicKey: (await this.getFromLocalSecureStore('bridgeRAEncPublicKey')) || "",
        });
        return preparedRequest.requestData;
    }

    async getInstanceId() {
        const requestData = JSON.stringify(this.prepareCMT({
            participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
            transactionTagId: 'BridgeRA',
            status: 'Testing',
            payload: {
                reliantAppGuid: env.RELIANT_APP_GUID,
                raPublicKey: (await generateRsaKeyPair()).publicKey,
            },
        }));

        const response = await this.executeUnifiedApiRequest('1053', requestData);
        if (!response?.payload?.data?.instanceId) {
            ToastAndroid.show('There was an error fetching the instance id.', ToastAndroid.LONG);
            //Alert.alert('Error', 'There was an error fetching the instance id.');
            return null;
        }
        await this.saveToLocalSecureStore('instanceId', response.payload.data.instanceId);
        await this.saveToLocalSecureStore('bridgeRAEncPublicKey', response.payload.data?.bridgeRAEncPublicKey);
        await this.saveToLocalSecureStore('poiDeviceId', response.payload.data?.poiDeviceId);
        await this.saveToLocalSecureStore('svaIntegrityKey', response.payload.data?.svaIntegrityKey);

        return ({
            instanceId: response.payload.data?.instanceId,
            poiDeviceId: response.payload.data?.poiDeviceId,
            svaIntegrityKey: response.payload.data?.svaIntegrityKey,
            bridgeRAEncPublicKey: response.payload.data?.bridgeRAEncPublicKey
        });

    }

    async saveBiometricsConsent(granted: 1 | 0): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    reliantAppGuid: env.RELIANT_APP_GUID,
                    programGuid: env.CREDENTIAL_PROGRAM_GUID,
                    consentValue: granted,
                },
            });

            const cmt = JSON.stringify(cmtObject);

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1031', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('saveBiometricsConsent error: ', error);
            return {
                error: {
                    action: '1031',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async readRegistrationData(): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.ACCEPTOR_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1047', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readRegistrationData error: ', error, "\n");
            return {
                error: {
                    action: '1047',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async createBasicDigitalId(programGuid: string): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1005', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('createBasicDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1005',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async createBiometricDigitalId(
        programGuid: string,
        consentId: string,
        encrypt = true,
        forcedModalityFlag = true,
        operationMode = 'BEST_AVAILABLE'
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    consentId: consentId,
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                    forcedModalityFlag: forcedModalityFlag,
                    encrypt: encrypt,
                    operationMode: operationMode
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1024', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('createBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1024',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async writeDigitalIdonCard(programGuid: string, rId: string): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    rId: rId,
                    overwrite: true
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1042', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('writeDigitalIdonCard error: ', error, "\n");
            return {
                error: {
                    action: '1042',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async writePasscode(
        programGuid: string,
        rId: string,
        passcode: string
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    rId: rId,
                    passcode: passcode
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1043', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('writePasscode error: ', error, "\n");
            return {
                error: {
                    action: '1043',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async verifyPasscode(
        programGuid: string,
        formFactor: string,
        passcode: number
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    formFactor: formFactor,
                    passcode: passcode
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1038', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('verifyPasscode error: ', error, "\n");
            return {
                error: {
                    action: '1038',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async addBiometricsToCpUserProfile(
        programGuid: string,
        consentId: string,
        formFactor = "CARD",
        rId: string
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    consentId: consentId,
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                    formFactor: formFactor,
                    rId: rId
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1001', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('createBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1001',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async updateProfileOnCard(
        programGuid: string,
        rId: string
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    rId: rId
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1035', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('createBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1035',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async IdentifyBiometricDigitalId(
        programGuid: string,
        forcedModalityFlag = true,
        modality = ["FACE", "LEFT_PALM", "RIGHT_PALM"],
        cacheHashesIfIdentified = true,
        consentId: string
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    modality: modality,
                    consentId: consentId,
                    cacheHashesIfIdentified: cacheHashesIfIdentified,
                    forcedModalityFlag: forcedModalityFlag
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1034', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('createBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1034',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async verifyBiometicDigitalIdViaCard(
        programGuid: string,
        forcedModalityFlag = true,
        modality = ["FACE", "LEFT_PALM", "RIGHT_PALM"],
        formFactor: "CARD",
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    modality: modality,
                    formFactor: formFactor,
                    forcedModalityFlag: forcedModalityFlag
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1048', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('verifyBiometicDigitalIdViaCard error: ', error, "\n");
            return {
                error: {
                    action: '1048',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async verifyDigitalIdWithPasscodeViaCard(
        programGuid: string,
        passcode: string,
        formFactor = "CARD",
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: env.CREDENTIAL_PROGRAM_GUID,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    passcode: passcode,
                    formFactor: formFactor,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1038', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('verifyDigitalIdWithPasscodeViaCard error: ', error, "\n");
            return {
                error: {
                    action: '1038',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async enrollNewUserInProgram(
        programGuid: string,
        formFactor = "CARD",
        authToken: string
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    authToken: authToken,
                    formFactor: formFactor,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1030', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('enrollNewUserInProgram error: ', error, "\n");
            return {
                error: {
                    action: '1030',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async getConsumerDeviceNumber(
        programGuid: string,
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1008', encryptedPayload);

            console.log(response);

            return response;

        } catch (error: any) {
            console.log('getConsumerDeviceNumber error: ', error, "\n");
            return {
                error: {
                    action: '1008',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }


}