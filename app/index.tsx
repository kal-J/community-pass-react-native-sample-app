import React from 'react';
import { useStatePersist, syncStorage } from 'use-state-persist';
import type { PropsWithChildren } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import CompassHelper from '../utils/compass-helper';
import { ActivityIndicator, Avatar, Button, Card, MD2Colors, Text } from 'react-native-paper';
import JSONTree from 'react-native-json-tree';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RELIANT_APP_GUID, CREDENTIAL_PROGRAM_GUID, ACCEPTOR_PROGRAM_GUID, PROGRAM_SPACE_PUBLIC_KEY, PACKAGE_NAME } from "../env";
import { getData, storeData } from '../utils/local-store';
import { Dropdown } from 'react-native-element-dropdown';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from 'react-native-paper';
import { Buffer } from 'buffer';


const compassHelper = new CompassHelper(RELIANT_APP_GUID, PACKAGE_NAME);


function Home(): React.JSX.Element {
    const [state, setState] = useStatePersist<any>('@globalState', {
        instanceId: null,
    });
    const [isLoading, setIsLoading] = React.useState(false);
    const [rId, setRid] = useStatePersist('@rId', '');
    const [consentId, setConsentId] = useStatePersist('@consentId', '');
    const [authToken, setAuthToken] = useStatePersist('@authToken', '');
    const [consumerDeviceId, setConsumerDeviceId] = useStatePersist('@consumerDeviceId', '');
    const [programSpaceSchema, setProgramSpaceSchema] = useStatePersist('@programSpaceSchema', '');
    const [action, setAction] = useStatePersist('@action', 'getInsatnceId');



    React.useEffect(() => {
        try {
            syncStorage.init();
        } catch (e) {
            console.log(e);
        }

        compassHelper.getFromLocalSecureStore('instanceId').then((instanceId) => setState({ ...state, instanceId: instanceId }));
        getData('rId').then((rId) => {
            setRid(rId);
            setState({ ...state, rId: rId, });
        });

    }, []);

    React.useEffect(() => {
        if (state.readRegistrationDataResponse?.payload?.data?.rId) {
            setRid(state.readRegistrationDataResponse?.payload?.data?.rId);
        }
    }, [state.readRegistrationDataResponse]);



    const createBasicDigitalId = async () => {
        setIsLoading(true);
        const createBasicDigitalIdResponse = await compassHelper.createBasicDigitalId(
            CREDENTIAL_PROGRAM_GUID
        ).finally(() => setIsLoading(false));
        setState({
            ...state,
            createBasicDigitalIdResponse: createBasicDigitalIdResponse,
            rId: createBasicDigitalIdResponse?.payload?.data?.rId,
        });
        const rID = createBasicDigitalIdResponse?.payload?.data?.rId;
        if (rID) {
            await storeData('rId', createBasicDigitalIdResponse?.payload?.data?.rId);
            setRid(createBasicDigitalIdResponse?.payload?.data?.rId ?? '');
        }

    };

    const writeDigitalId = async (rID: string) => {
        setIsLoading(true);
        const writeDigitalIdResponse = await compassHelper.writeDigitalIdonCard(
            CREDENTIAL_PROGRAM_GUID,
            rID
        ).finally(() => setIsLoading(false));
        setState({
            ...state,
            writeDigitalIdResponse: writeDigitalIdResponse,
        });
        const consumerDeviceNumber = writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber;
        if (consumerDeviceNumber) {
            await storeData('consumerDeviceNumber', writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber);
            setConsumerDeviceId(writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber ?? '');
        }

    };

    const writePasscode = async () => {
        setIsLoading(true);
        const writePasscodeResponse = await compassHelper.writePasscode(
            CREDENTIAL_PROGRAM_GUID,
            rId,
            '123456'

        ).finally(() => setIsLoading(false));
        setState({
            ...state,
            writePasscodeResponse: writePasscodeResponse,

        });
    };
    const verifyPasscode = async (programGuid: string) => {
        setIsLoading(true);
        const verifyPasscode = await compassHelper.verifyPasscode(
            programGuid,
            'CARD',
            '123456'
        ).finally(() => setIsLoading(false));
        if (verifyPasscode?.payload?.data?.authToken) {
            setAuthToken(verifyPasscode?.payload?.data?.authToken);
        }

        setState({
            ...state,
            verifyPasscode: verifyPasscode,
            authToken: verifyPasscode?.payload?.data?.authToken,
        });
    };



    const actions = [
        {
            label: 'Get Instance ID - CM', value: 'getInsatnceIdCM', execute: async () => {
                setIsLoading(true);
                compassHelper.getInstanceId(CREDENTIAL_PROGRAM_GUID).then((res) => {
                    setState({
                        ...state,
                        cmGetInstanceIdResponse: res,
                        instanceId: res?.instanceId
                    })
                }).catch((err) => {
                    setState({ ...state, cmGetInstanceIdResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Get Instance ID - Acceptor', value: 'getInsatnceIdAcceptor', execute: async () => {
                setIsLoading(true);
                compassHelper.getInstanceId(ACCEPTOR_PROGRAM_GUID).then((res) => {
                    setState({
                        ...state,
                        accGetInstanceIdResponse: res,
                        instanceId: res?.instanceId
                    })
                }).catch((err) => {
                    setState({ ...state, accGetInstanceIdResponse: err, });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Biometrics consent', value: 'saveBiometricsConsent', execute: async () => {
                setIsLoading(true);
                compassHelper.saveBiometricsConsent({
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                    granted: 1
                }).then((res) => {
                    setState({ ...state, saveBiometricsResponse: res, consentId: res?.payload?.data?.consentId });
                    if (res?.payload?.data?.consentId) {
                        setConsentId(res?.payload?.data?.consentId);
                    }
                }).catch((err) => {
                    setState({ ...state, saveBiometricsResponse: err, });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Read Registration Data - CM', value: 'readRegistrationDataCM', execute: async () => {
                setIsLoading(true);
                compassHelper.readRegistrationData(CREDENTIAL_PROGRAM_GUID).then((res) => {
                    setState({ ...state, readRegistrationDataCMResponse: res, cmRID: res?.payload?.data?.rId });
                }).catch((err) => {
                    setState({ ...state, readRegistrationDataCMResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Read Registration Data - Acceptor', value: 'readRegistrationDataAcceptor', execute: async () => {
                setIsLoading(true);
                compassHelper.readRegistrationData(ACCEPTOR_PROGRAM_GUID).then((res) => {
                    setState({ ...state, readRegistrationDataAcceptorResponse: res, accRID: res?.payload?.data?.rId });
                }).catch((err) => {
                    setState({ ...state, readRegistrationDataCMResponse: err, });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Create Basic D-ID', value: 'createBasicDigitalId', execute: async () => {
                await createBasicDigitalId();
            },
        },
        {
            label: 'Create Biometric D-ID', value: 'createBiometricDigitalId', execute: async () => {
                setIsLoading(true);
                await compassHelper.createBiometricDigitalId({
                    consentId: consentId,
                    encrypt: true,
                    forcedModalityFlag: true,
                    operationMode: 'FULL',
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                }).then((res) => {
                    setState({ ...state, createBiometricDigitalIdResponse: res, });
                }).catch((err) => {
                    setState({ ...state, createBiometricDigitalIdResponse: err, });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Identify Biometric D-ID', value: 'IdentifyBiometricDigitalId', execute: async () => {
                setIsLoading(true);
                await compassHelper.IdentifyBiometricDigitalId({
                    consentId: consentId,
                    forcedModalityFlag: true,
                    cacheHashesIfIdentified: true,
                    modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                }).then((res) => {
                    setState({ ...state, IdentifyBiometricDigitalIdResponse: res, });
                }).catch((err) => {
                    setState({ ...state, IdentifyBiometricDigitalIdResponse: err, });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Write  D-ID', value: 'writeDigitalId', execute: async () => {
                await writeDigitalId(state?.createBiometricDigitalIdResponse?.payload?.data?.rId);
            },
        },
        {
            label: 'Write Passcode', value: 'writePasscode', execute: async () => {
                await writePasscode();
            },
        },
        {
            label: 'Add Biometrics to CP User Profile', value: 'addBiometricsToCpUserProfile', execute: async () => {
                setIsLoading(true);
                compassHelper.addBiometricsToCpUserProfile({
                    consentId: consentId,
                    formFactor: 'CARD',
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                    rId: rId,
                }).then((res) => {
                    setState({ ...state, addBiometricsToCpUserProfileResponse: res, });
                }).catch((err) => {
                    setState({ ...state, addBiometricsToCpUserProfileResponse: err });
                }).finally(() => setIsLoading(false));
            },
        },
        {
            label: 'Verify Passcode - CM', value: 'verifyPasscodeCredentialManager', execute: async () => {
                await verifyPasscode(CREDENTIAL_PROGRAM_GUID);
            },
        },
        {
            label: 'Verify Passcode - Acceptor', value: 'verifyPasscodeAcceptor', execute: async () => {
                await verifyPasscode(ACCEPTOR_PROGRAM_GUID);
            },
        },
        {
            label: 'Enroll new user in Acceptor Program', value: 'EnrollUserToProgram', execute: async () => {
                setIsLoading(true);
                await compassHelper.enrollNewUserInProgram(
                    {
                        authToken: authToken,
                        formFactor: 'CARD',
                        programGuid: ACCEPTOR_PROGRAM_GUID,
                    }
                ).then((res) => {
                    setState({ ...state, enrollProgramResponse: res, });
                }).catch((err) => {
                    setState({ ...state, enrollProgramResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Read Consumer Device Number', value: 'getConsumerDeviceNumber', execute: async () => {
                setIsLoading(true);
                await compassHelper.getConsumerDeviceNumber(CREDENTIAL_PROGRAM_GUID).then((res) => {
                    setState({ ...state, getConsumerDeviceNumberResponse: res, });
                }).catch((err) => {
                    setState({ ...state, getConsumerDeviceNumberResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Get Data Schema', value: 'getDataSchema', execute: async () => {
                setIsLoading(true);
                await compassHelper.getDataSchema(ACCEPTOR_PROGRAM_GUID).then((res) => {
                    setState({ ...state, getDataSchemaResponse: res, programSpaceSchema: res?.payload?.data?.schemaJson, });
                    setProgramSpaceSchema(res?.payload?.data?.schemaJson ?? "");
                }).catch((err) => {
                    setState({ ...state, getDataSchemaResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'ExchangeProgramSpaceKeys', value: 'exchangeProgramSpaceKeys', execute: async () => {
                setIsLoading(true);
                await compassHelper.exchangeProgramSpaceKeys({
                    clientPublicKey: (await compassHelper.getFromLocalSecureStore('bridgeRAEncPublicKey')) ?? '',
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    reliantAppInstanceId: compassHelper.instanceId ?? '',
                }).then((res) => {
                    setState({ ...state, exchangeProgramSpaceKeysResponse: res, });
                }).catch((err) => {
                    setState({ ...state, exchangeProgramSpaceKeysResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Prepare Program Space - Acceptor', value: 'prepareProgramSpace', execute: async () => {
                setIsLoading(true);
                console.log("programSpaceSchema", programSpaceSchema);
                await compassHelper.prepareProgramSpace({
                    schema: programSpaceSchema,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    programSpaceData: JSON.stringify({ 
                        id: 1000000001, 
                        name: "Eric Kalujja", 
                        voucherBalance: 0 
                    }),
                }).then((res) => {
                    setState({ ...state, prepareProgramSpaceResponse: res, });
                }).catch((err) => {
                    setState({ ...state, prepareProgramSpaceResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Write To Program Space - Acceptor', value: 'writeToProgramSpace', execute: async () => {
                setIsLoading(true);
                console.log(state?.prepareProgramSpaceResponse?.payload?.data?.output);
                await compassHelper.writeToProgramSpace({
                    data: state?.prepareProgramSpaceResponse?.payload?.data?.output,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, writeToProgramSpaceResponse: res, });
                }).catch((err) => {
                    setState({ ...state, writeToProgramSpaceResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Write Data Record to Card', value: 'writeDataRecordToCard', execute: async () => {
                setIsLoading(true);
                await compassHelper.writeDataRecordToCard({
                    appDataRecord: [
                        {
                            index: 0,
                            chunk: Buffer.from("Test Data").toString('base64'),
                        },
                        {
                            index: 1,
                            chunk: Buffer.from("Test Data 2").toString('base64'),
                        },
                    ],
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, writeDataRecordToCardResponse: res, });
                }).catch((err) => {
                    setState({ ...state, writeDataRecordToCardResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Read Data Record from Card', value: 'readDataRecordFromCard', execute: async () => {
                setIsLoading(true);
                await compassHelper.readDataRecordFromCard({
                    indexes: [
                        0, 1
                    ],
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, readDataRecordFromCardResponse: res, });
                }).catch((err) => {
                    setState({ ...state, readDataRecordFromCardResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Write Data Blob to Card', value: 'writeDataBlobToCard', execute: async () => {
                setIsLoading(true);
                await compassHelper.writeDataBlobToCard({
                    isShared: true,
                    appDataBlock: Buffer.from("Test Data Blob").toString('base64'),
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, writeDataBlobToCardResponse: res, });
                }).catch((err) => {
                    setState({ ...state, writeDataBlobToCardResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Read Data Blob from Card', value: 'readDataBlobFromCard', execute: async () => {
                setIsLoading(true);
                await compassHelper.readDataBlobFromCard({
                    isShared: true,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, readDataBlobFromCardResponse: res, });
                }).catch((err) => {
                    setState({ ...state, readDataBlobFromCardResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Create SVA', value: 'createSva', execute: async () => {
                setIsLoading(true);
                await compassHelper.createSva({
                    isProgramSpace: false,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                    svaData: {
                        purseSubType: 'POINT',
                        svaUnit: 'bl',
                    }
                }).then((res) => {
                    setState({ ...state, createSvaResponse: res, });
                }).catch((err) => {
                    setState({ ...state, createSvaResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },

        {
            label: 'Read SVA', value: 'readSva', execute: async () => {
                setIsLoading(true);
                await compassHelper.readSva({
                    isProgramSpace: false,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                    svaUnit: 'bl'
                }).then((res) => {
                    setState({ ...state, readSvaResponse: res, });
                }).catch((err) => {
                    setState({ ...state, readSvaResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Read All SVAs', value: 'readAllSvas', execute: async () => {
                setIsLoading(true);
                await compassHelper.readAllSvas({
                    isProgramSpace: false,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                }).then((res) => {
                    setState({ ...state, readAllSvasResponse: res, });
                }).catch((err) => {
                    setState({ ...state, readAllSvasResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'INCREASE SVA', value: 'mutateSva', execute: async () => {
                setIsLoading(true);
                await compassHelper.mutateSva({
                    isProgramSpace: false,
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                    rId: state?.accRID,
                    svaOperation: {
                        amount: 100,
                        operationType: 'INCREASE',
                        svaUnit: 'bl',
                    }
                }).then((res) => {
                    setState({ ...state, mutateSvaResponse: res, });
                }).catch((err) => {
                    setState({ ...state, mutateSvaResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },

        {
            label: 'Verify Biometrics', value: 'verifyBiometricDigitalId', execute: async () => {
                setIsLoading(true);
                await compassHelper.verifyBiometricDigitalId({
                    forcedModalityFlag: true,
                    formFactor: 'CARD',
                    programGuid: ACCEPTOR_PROGRAM_GUID,
                    reliantAppGuid: RELIANT_APP_GUID,
                }).then((res) => {
                    setState({ ...state, verifyBiometricDigitalIdResponse: res, });
                }).catch((err) => {
                    setState({ ...state, verifyBiometricDigitalIdResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Batch Operation', value: 'batchOperation', execute: async () => {
                setIsLoading(true);
                await compassHelper.batchOperation({
                    shouldContinueOnError: false,
                    reliantAppInstanceId: compassHelper.instanceId ?? '',
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                    operations: [
                        {
                            actions: '1038',
                            payload: {
                                passcode: '123456',
                                formFactor: 'CARD',
                                participationProgramId: CREDENTIAL_PROGRAM_GUID,
                            }
                        },
                        {
                            actions: '1033',
                            payload: {
                                rId: state?.accRID,
                                isProgramSpace: false,
                                participationProgramId: CREDENTIAL_PROGRAM_GUID,
                            }
                        }
                    ]
                }).then((res) => {
                    setState({ ...state, batchOperationResponse: res, });
                }).catch((err) => {
                    setState({ ...state, batchOperationResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Start Data Sync', value: 'startDataSync', execute: async () => {
                setIsLoading(true);
                await compassHelper.startDataSync({
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                }).then((res) => {
                    setState({ ...state, startDataSyncResponse: res, });
                }).catch((err) => {
                    setState({ ...state, startDataSyncResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Get Data Sync Worker Status', value: 'getDataSyncWorkerStatus', execute: async () => {
                setIsLoading(true);
                await compassHelper.getDataSyncWorkerStatus({
                    programGuid: CREDENTIAL_PROGRAM_GUID,
                }).then((res) => {
                    setState({ ...state, getDataSyncWorkerStatusResponse: res, });
                }).catch((err) => {
                    setState({ ...state, getDataSyncWorkerStatusResponse: err, });
                }).finally(() => setIsLoading(false));

            },
        },
        {
            label: 'Clear App State', value: 'clearAppState', execute: async () => {
                setIsLoading(true);
                setState({});
                setRid('');
                setConsumerDeviceId('');
                setProgramSpaceSchema('');
                setAuthToken('');
                setIsLoading(false)
            },
        },
    ];

    const executeAction = async () => {
        if (action) {
            await actions.filter((item) => item.value === action)?.[0]?.execute();
        }
    }

    if (isLoading) {
        return (
            <View className="flex flex-row justify-center flex-1 w-full px-4 py-4 bg-white">

                <ActivityIndicator size={'large'} animating={true} />

            </View>
        );
    }

    return (
        <SafeAreaView className='flex flex-1 bg-white'>
            <StatusBar
                barStyle='light-content'
            />
            <View className="flex flex-row justify-center w-full px-4 py-2 bg-white">

                <Text className="text-lg font-bold text-black">React Native Bridge RA</Text>

            </View>
            <View className='flex flex-row items-center justify-between w-full py-4'>

                <View className='flex-1'>
                    <SelectActionToExecute value={action} data={actions} setAction={setAction} />
                </View>

                <View className='pr-4 flex-3'>
                    <Button disabled={!action} className='rounded-md h-[50] flex justify-center items-center' icon="play" mode="contained" onPress={() => executeAction()}>
                        Execute
                    </Button>
                </View>

            </View>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                className='flex w-full h-full max-w-full px-4 pb-4 bg-white'>

                <View className='py-2'>
                    <Text variant="titleMedium">Result:</Text>
                </View>
                <ScrollView horizontal={true} className='flex flex-wrap w-full py-4 rounded' contentContainerStyle={{}}>
                    <JSONTree hideRoot={true} data={state} />
                </ScrollView>

            </ScrollView>


        </SafeAreaView>
    );
}

const SelectActionToExecute = (props: any) => {
    const theme = useTheme();
    const [isFocus, setIsFocus] = React.useState(false);

    const renderLabel = () => {
        if (props?.value || isFocus) {
            return (
                <Text style={[styles.label, isFocus && { color: theme.colors.primary }]}>
                    Select action
                </Text>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            {renderLabel()}
            <Dropdown
                mode={'modal'}
                style={[styles.dropdown, isFocus && { borderColor: theme.colors.primary }]}
                containerStyle={{
                    flex: 1,
                    width: wp('90%'),
                }}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                data={props.data}
                search={true}
                maxHeight={300}
                labelField={"label" as never}
                valueField={"value" as never}
                placeholder={!isFocus ? 'Select action' : '...'}
                searchPlaceholder="Search..."
                value={props?.value}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={(item: any) => {
                    setIsFocus(false);
                    props?.setAction?.(item?.value);
                }}
                renderLeftIcon={() => (
                    <AntDesign
                        style={styles.icon}
                        color={isFocus ? theme.colors.primary : 'black'}
                        name="arrowright"
                        size={20}
                    />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
    },
    dropdown: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    icon: {
        marginRight: 5,
    },
    label: {
        position: 'absolute',
        backgroundColor: 'white',
        left: 22,
        top: 8,
        zIndex: 999,
        paddingHorizontal: 8,
        fontSize: 14,
    },
    placeholderStyle: {
        fontSize: 16,
    },
    selectedTextStyle: {
        fontSize: 14,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
    },
});

export const screenOptions = { title: 'Home', headerShown: false };
export default Home;

