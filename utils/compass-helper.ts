
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import { ToastAndroid } from 'react-native';
import { Buffer } from 'buffer';
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
import { RegisterBasicUserResponse1005, RegisterBiometricUserResponse1051, RegistrationDataResponse1047, SaveBiometricConsentResponse1031, UnifiedApiResponse, WriteProfileOnCardResponse1042, WritePasscodeOnCardResponse1043, VerifyPasscodeResponse1038, VerifyUserResponse1048, IdentifyBiometricsResponse1034, ConsumerDeviceNumberResponse1008, WriteProgramSpaceResponse1046 } from './compass-helper.interfaces';

export default class CompassHelper {
    public instanceId: string | null = null;
    public bridgeRAEncPublicKey: string | null = null;
    public poiDeviceId: string | null = null;
    public svaIntegrityKey: string | null = null;
    private reliantAppGuid = '';
    private packageName = '';

    constructor(reliantAppGuid: string, packageName: string) {
        if(!reliantAppGuid) {
            throw new Error('reliantAppGuid is required');
        }
        if(!packageName) {
            throw new Error('packageName is required');
        }
        this.reliantAppGuid = reliantAppGuid;
        this.packageName = packageName;
    }

    async initialize(programGuid: string) {
        if (!(await this.getFromLocalSecureStore('instanceId'))) {
            const getInstanceIdResponse = (await this.getInstanceId(programGuid));
            this.instanceId = getInstanceIdResponse?.instanceId ?? '';
        }
        return ({
            instanceId: this.instanceId,
            poiDeviceId: this.poiDeviceId,
            svaIntegrityKey: this.svaIntegrityKey,
            bridgeRAEncPublicKey: this.bridgeRAEncPublicKey
        })

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
                        reliantAppId: this.reliantAppGuid
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
            packageName: this.packageName,
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

            if (requestCode === '1053') {
                return {
                    payload: JSON.parse(responseData).payload
                };
            }

            const response = await parseResponsePayload(responseData);
            const payload = JSON.parse(response?.responseData).payload;

            if (requestCode === '1026' && payload?.data) {
                let decodedData: any = [];
                payload.data?.forEach((item: any) => {
                    console.log("item: ", item, "\n");
                    decodedData.push(
                        Buffer.from(item.chunk).toString('utf8')
                    )
                });

                payload.data = decodedData;
            }
            if (requestCode === '1019' && payload?.data) {
                payload.data = Buffer.from(payload.data).toString('utf8');
            }

            console.log('response.responseData: ', JSON.parse(response.responseData), "\n");
            return Promise.resolve({
                payload: payload
            });
        } else {
            const responseError: string = (result?.extra as any)?.RESPONSE_ERROR;
            console.log("responseError: ", responseError, "\n");
            const payload = JSON.parse(responseError).payload;
            console.log("payload: ", payload, "\n");
            return Promise.resolve({
                error: {
                    action: payload?.action ?? requestCode,
                    errorCode: payload?.data?.errorCode ?? JSON.parse(responseError)?.errorCode,
                    errorMessage: payload?.data?.errorMessage ?? JSON.parse(responseError)?.errorMessage,
                    extraErrorMessage: payload?.data?.extraErrorMessage ?? JSON.parse(responseError)?.extraErrorMessage
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

    async getInstanceId(programGuid: string) {
        const requestData = JSON.stringify(this.prepareCMT({
            participationProgramId: programGuid,
            transactionTagId: 'BridgeRA',
            status: 'Testing',
            payload: {
                reliantAppGuid: this.reliantAppGuid,
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
        this.bridgeRAEncPublicKey = response.payload.data?.bridgeRAEncPublicKey;
        this.instanceId = response.payload.data?.instanceId;
        this.poiDeviceId = response.payload.data?.poiDeviceId;
        this.svaIntegrityKey = response.payload.data?.svaIntegrityKey;

        return ({
            instanceId: response.payload.data?.instanceId as string,
            poiDeviceId: response.payload.data?.poiDeviceId as string,
            svaIntegrityKey: response.payload.data?.svaIntegrityKey as string,
            bridgeRAEncPublicKey: response.payload.data?.bridgeRAEncPublicKey as string
        });

    }

    async saveBiometricsConsent(data: {
        granted: 1|0,
        programGuid: string
    }): Promise<UnifiedApiResponse & {
        payload?: {
            data: SaveBiometricConsentResponse1031
        }
    }> {
        try {
            const cmtObject = this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    reliantAppGuid: this.reliantAppGuid,
                    programGuid: data.programGuid,
                    consentValue: data.granted,
                },
            });

            const cmt = JSON.stringify(cmtObject);

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1031', encryptedPayload);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: SaveBiometricConsentResponse1031
                }
            };

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

    async readRegistrationData(programGuid: string): Promise<UnifiedApiResponse & {
        payload?: {
            data: RegistrationDataResponse1047
        }
    }> {
        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1047', encryptedPayload);

            console.log('readRegistrationData response: ', response, "\n");

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: RegistrationDataResponse1047
                }
            };

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

    async createBasicDigitalId(programGuid: string): Promise<UnifiedApiResponse & {
        payload?: {
            data: RegisterBasicUserResponse1005
        }
    }> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
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

            console.log('createBasicDigitalId response: ', response);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: RegisterBasicUserResponse1005
                }
            };

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
        data: {
            programGuid: string,
            consentId: string,
            encrypt: boolean,
            forcedModalityFlag: boolean,
            operationMode: 'FULL' | 'BEST_AVAILABLE',
        }
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: RegisterBiometricUserResponse1051
        }
    }> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: data.programGuid,
                    consentId: data.consentId,
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                    forcedModalityFlag: data.forcedModalityFlag,
                    encrypt: data.encrypt,
                    operationMode: data.operationMode,
                    reliantAppGuid: this.reliantAppGuid
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1051', encryptedPayload);
            console.log('createBiometricDigitalId: ', response);
            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: RegisterBiometricUserResponse1051
                }
            };
            
        } catch (error: any) {
            console.log('createBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1051',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async writeDigitalIdonCard(programGuid: string, rId: string): Promise<UnifiedApiResponse & {
        payload?: {
            data: WriteProfileOnCardResponse1042
        }
    }> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
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

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: WriteProfileOnCardResponse1042
                }
            };
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
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: WritePasscodeOnCardResponse1043
        }
    }> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
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
            console.log('writePasscode: ', response);
            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: WritePasscodeOnCardResponse1043
                }
            };

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
        formFactor: string = 'CARD',
        passcode: string
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: VerifyPasscodeResponse1038
        }
    }> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: programGuid,
                    formFactor: formFactor,
                    passcode: passcode,
                    cpUserProfile: ''
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);
            const response = await this.executeUnifiedApiRequest('1038', encryptedPayload);
            console.log('verifyPasscode: ', response);
            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: VerifyPasscodeResponse1038
                }
            };
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

    async verifyBiometricDigitalId(
        data: {
            programGuid: string,
            reliantAppGuid: string,
            formFactor: string,
            forcedModalityFlag: boolean,
        }
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: VerifyUserResponse1048
        }
    }> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: data.programGuid,
                    formFactor: data.formFactor,
                    reliantAppGuid: data.reliantAppGuid,
                    forcedModalityFlag: data.forcedModalityFlag,
                    cpUserProfile: '',
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);
            const response = await this.executeUnifiedApiRequest('1048', encryptedPayload);
            console.log('verifyBiometricDigitalId: ', response);
            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: VerifyUserResponse1048
                }
            };

        } catch (error: any) {
            console.log('verifyBiometricDigitalId error: ', error, "\n");
            return {
                error: {
                    action: '1048',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async addBiometricsToCpUserProfile(
        data: {
            programGuid: string,
            consentId: string,
            formFactor: string,
            rId: string
        }
    ): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: data.programGuid,
                    consentId: data.consentId,
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                    formFactor: data.formFactor,
                    rId: data.rId
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1001', encryptedPayload);

            console.log('addBiometricsToCpUserProfile: ', response);

            return response;

            return response;

        } catch (error: any) {
            console.log('addBiometricsToCpUserProfile error: ', error, "\n");
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
                participationProgramId: programGuid,
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

            console.log('updateProfileOnCard response: ', response);

            return response;

        } catch (error: any) {
            console.log('updateProfileOnCard error: ', error, "\n");
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
        data: {
            programGuid: string,
            forcedModalityFlag: boolean,
            modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
            cacheHashesIfIdentified: boolean,
            consentId: string
        }
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: IdentifyBiometricsResponse1034
        }
    }> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: data.programGuid,
                    modality: data.modality,
                    consentId: data.consentId,
                    cacheHashesIfIdentified: data.cacheHashesIfIdentified,
                    forcedModalityFlag: data.forcedModalityFlag
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1034', encryptedPayload);

            console.log("IdentifyBiometricDigitalId: ", response);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: IdentifyBiometricsResponse1034
                }
            };

        } catch (error: any) {
            console.log('IdentifyBiometricDigitalId error: ', error, "\n");
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
                participationProgramId: programGuid,
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

            console.log('verifyBiometicDigitalIdViaCard: ', response);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: VerifyUserResponse1048
                }
            };

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
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: VerifyPasscodeResponse1038
        }
    }> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: programGuid,
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
            console.log('verifyDigitalIdWithPasscodeViaCard: ', response);
            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: VerifyPasscodeResponse1038
                }
            };

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
        data: {
            programGuid: string,
            formFactor: string,
            authToken: string
        }
    ): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programGuid: data.programGuid,
                    authToken: data.authToken,
                    formFactor: data.formFactor,
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
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: ConsumerDeviceNumberResponse1008
        }
    }> {
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

            console.log('getConsumerDeviceNumber response: ', response);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: ConsumerDeviceNumberResponse1008
                }
            };

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

    async getDataSchema(
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

            const response = await this.executeUnifiedApiRequest('1055', encryptedPayload);

            console.log('getDataSchema response: ', response);

            return response;

        } catch (error: any) {
            console.log('getDataSchema error: ', error, "\n");
            return {
                error: {
                    action: '1055',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async exchangeProgramSpaceKeys(
        data: {
            programGuid: string,
            reliantAppInstanceId: string,
            reliantAppGuid: string,
            clientPublicKey: string
        }
    ): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    reliantAppInstanceId: data.reliantAppInstanceId,
                    programGuid: data.programGuid,
                    reliantAppGuid: data.reliantAppGuid,
                    clientPublicKey: data.clientPublicKey,
                    type: 'PROGRAM_SPACE',
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log("exchangeProgramSpaceKeys cmt: ", cmt);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1052', encryptedPayload);

            console.log('exchangeProgramSpaceKeys: ', response);

            return response;

        } catch (error: any) {
            console.log('1052 error: ', error, "\n");
            return {
                error: {
                    action: '1052',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async prepareProgramSpace(
        data: {
            programGuid: string,
            schema: string,
            programSpaceData: string,
        }
    ): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    programSpaceData: data.programSpaceData,
                    schema: data.schema
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('3000', encryptedPayload);

            console.log('prepareProgramSpace response: ', response);

            return response;

        } catch (error: any) {
            console.log('prepareProgramSpace error: ', error, "\n");
            return {
                error: {
                    action: '3000',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async writeToProgramSpace(
        data: {
            programGuid: string,
            rId: string,
            data: string,
        }
    ): Promise<UnifiedApiResponse & {
        payload?: {
            data: WriteProgramSpaceResponse1046
        }
    }> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    programGuid: data.programGuid,
                    data: data.data,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log("writeToProgramSpace CMT:", cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1046', encryptedPayload);

            console.log("writeToProgramSpace CMT:", cmtObject);
            console.log("writeToProgramSpace response:", response);

            return response as unknown as UnifiedApiResponse & {
                payload?: {
                    data: WriteProgramSpaceResponse1046
                }
            };
        } catch (error: any) {
            console.log('writeToProgramSpace error: ', error, "\n");
            return {
                error: {
                    action: '1046',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async writeDataRecordToCard(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            appDataRecord: {
                index: number,
                chunk: string
            }[],
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    reliantAppGuid: data.reliantAppGuid,
                    appDataRecord: data.appDataRecord,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1045', encryptedPayload);

            console.log("writeDataRecordToCard CMT:", cmtObject);
            console.log("writeDataRecordToCard response:", response);

            return response;

        } catch (error: any) {
            console.log('writeDataRecordToCard error: ', error, "\n");
            return {
                error: {
                    action: '1045',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }

    }

    async readDataRecordFromCard(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            indexes: number[],
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    reliantAppGuid: data.reliantAppGuid,
                    indexes: data.indexes,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1026', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readDataRecordFromCard error: ', error, "\n");
            return {
                error: {
                    action: '1026',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async writeDataBlobToCard(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            appDataBlock: string,
            isShared: boolean,
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    reliantAppGuid: data.reliantAppGuid,
                    appDataBlock: data.appDataBlock,
                    isShared: data.isShared,
                    programGuid: data.programGuid
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1044', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('writeDataBlobToCard error: ', error, "\n");
            return {
                error: {
                    action: '1044',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }
    async readDataBlobFromCard(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            isShared: boolean,
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    reliantAppGuid: data.reliantAppGuid,
                    isShared: data.isShared,
                    programGuid: data.programGuid
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1019', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readDataBlobFromCard error: ', error, "\n");
            return {
                error: {
                    action: '1019',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }


    }

    async createSva(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            svaData: {
                purseSubType: 'POINT' | 'COMMODITY' | 'FINANCIAL',
                svaUnit: string,
            },
            isProgramSpace: boolean,
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    //reliantAppGuid: data.reliantAppGuid,
                    //programGuid: data.programGuid,
                    svaData: data.svaData,
                    isProgramSpace: data.isProgramSpace,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('createSva cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1011', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('createSva error: ', error, "\n");
            return {
                error: {
                    action: '1011',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async readSva(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            svaUnit: string,
            isProgramSpace: boolean,
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    svaUnit: data.svaUnit,
                    isProgramSpace: data.isProgramSpace,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('readSva cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1020', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readSva error: ', error, "\n");
            return {
                error: {
                    action: '1020',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async readAllSvas(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            isProgramSpace: boolean,
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    isProgramSpace: data.isProgramSpace,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('readAllSvas cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1033', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readAllSvas error: ', error, "\n");
            return {
                error: {
                    action: '1033',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async mutateSva(
        data: {
            programGuid: string,
            rId: string,
            reliantAppGuid: string,
            isProgramSpace: boolean,
            svaOperation: {
                svaUnit: string,
                amount: number,
                operationType: 'INCREASE' | 'DECREASE' | 'UPDATE',
            }
        }
    ): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    rId: data.rId,
                    isProgramSpace: data.isProgramSpace,
                    svaOperation: data.svaOperation,
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('readAllSvas cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1032', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('readAllSvas error: ', error, "\n");
            return {
                error: {
                    action: '1032',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async batchOperation(
        data: {
            programGuid: string,
            shouldContinueOnError: boolean
            operations: {
                actions: string | number;
                payload: any
            }[],
            reliantAppInstanceId: string,

        }
    ): Promise<UnifiedApiResponse> {
        try {
            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                    operations: data.operations,
                    shouldContinueOnError: data.shouldContinueOnError,
                    reliantAppInstanceId: data.reliantAppInstanceId,
                    programGuid: data.programGuid,

                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('batchOperation cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1003', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('batchOperation error: ', error, "\n");
            return {
                error: {
                    action: '1003',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async startDataSync(data: {
        programGuid: string;

    }): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('startDataSync cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1057', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('startDataSync error: ', error, "\n");
            return {
                error: {
                    action: '1057',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

    async getDataSyncWorkerStatus(data: {
        programGuid: string;
    }): Promise<UnifiedApiResponse> {

        try {

            const cmtObject = (this.prepareCMT({
                participationProgramId: data.programGuid,
                transactionTagId: 'BridgeRA',
                status: 'Testing',
                payload: {
                },
            }));

            const cmt = JSON.stringify(cmtObject);

            console.log('getDataSyncWorkerStatus cmt: ', cmt, "\n");

            if (!isCmtSchemaValid(cmtObject)) {
                throw new Error("CMT schema is not valid");
            }

            const encryptedPayload = await this.prepareRequest(cmt);

            const response = await this.executeUnifiedApiRequest('1056', encryptedPayload);

            return response;

        } catch (error: any) {
            console.log('getDataSyncWorkerStatus error: ', error, "\n");
            return {
                error: {
                    action: '1056',
                    errorMessage: error.message,
                    extraErrorMessage: '',
                }
            };
        }
    }

}