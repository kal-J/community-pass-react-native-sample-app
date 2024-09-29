import React from 'react';
import type { PropsWithChildren } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    View,
} from 'react-native';
import CompassHelper from '../utils/compass-helper';
import { ActivityIndicator, Avatar, Button, Card, MD2Colors, Text } from 'react-native-paper';
import JSONTree from 'react-native-json-tree';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RELIANT_APP_GUID, CREDENTIAL_PROGRAM_GUID } from "../env";
import { getData, storeData } from '../utils/local-store';


const compassHelper = new CompassHelper();

function Home(): React.JSX.Element {
    const [state, setState] = React.useState<any>({
        instanceId: null,
    });
    const [isLoading, setIsLoading] = React.useState(false);
    const [rId, setRid] = React.useState('');
    const [consumerDeviceId, setConsumerDeviceId] = React.useState('');

    React.useEffect(() => {
        compassHelper.getFromLocalSecureStore('instanceId').then((instanceId) => setState({ ...state, instanceId: instanceId }));
        getData('rId').then((rId) => {
            setRid(rId);
            setState({ rId: rId, ...state,  });
        });

    }, []);

    const getInsatnceId = async () => {
        setIsLoading(true);
        const getInstanceIdResponse = await compassHelper.getInstanceId().finally(() => setIsLoading(false));
        setState({
            getInstanceIdResponse: getInstanceIdResponse,
            ...state,
        });
    };

    const createBasicDigitalId = async () => {
        setIsLoading(true);
        const createBasicDigitalIdResponse = await compassHelper.createBasicDigitalId(
            CREDENTIAL_PROGRAM_GUID
        ).finally(() => setIsLoading(false));
        setState({
            createBasicDigitalIdResponse: createBasicDigitalIdResponse,
            ...state,
        });
        const rID = createBasicDigitalIdResponse?.payload?.data?.rId;
        if (rID) {
            await storeData('rId', createBasicDigitalIdResponse?.payload?.data?.rId);
            setRid(createBasicDigitalIdResponse?.payload?.data?.rId);
        }

    };

    const writeBasicDigitalId = async () => {
        setIsLoading(true);
        const writeBasicDigitalIdResponse = await compassHelper.writeDigitalIdonCard(
            CREDENTIAL_PROGRAM_GUID,
            rId
        ).finally(() => setIsLoading(false));
        setState({
            writeBasicDigitalIdResponse: writeBasicDigitalIdResponse,
            ...state,
        });
        const consumerDeviceNumber = writeBasicDigitalIdResponse?.payload?.data?.consumerDeviceNumber;
        if (consumerDeviceNumber) {
            await storeData('consumerDeviceNumber', writeBasicDigitalIdResponse?.payload?.data?.consumerDeviceNumber);
            setConsumerDeviceId(writeBasicDigitalIdResponse?.payload?.data?.consumerDeviceNumber);
        }

    };

    const readRegistrationData = async () => {
        setIsLoading(true);
        const readRegistrationDataResponse = await compassHelper.readRegistrationData(

        ).finally(() => setIsLoading(false));
        setState({
            readRegistrationDataResponse: readRegistrationDataResponse,
            ...state,
        });
        if(readRegistrationDataResponse?.payload?.data?.rId) {
            setRid(readRegistrationDataResponse?.payload?.data?.rId);
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
            writePasscodeResponse: writePasscodeResponse,
            ...state,
        });
    };
    const verifyPasscode = async () => {
        setIsLoading(true);
        const verifyPasscode = await compassHelper.verifyPasscode(
            CREDENTIAL_PROGRAM_GUID,
            'CARD',
            123456

        ).finally(() => setIsLoading(false));
        setState({
            verifyPasscode: verifyPasscode,
            ...state,
        });
    };

    if (isLoading) {
        return (
            <View className="flex flex-row justify-center flex-1 w-full px-4 py-4 bg-white">

                <ActivityIndicator size={'large'} animating={true} />

            </View>
        );
    }

    return (
        <SafeAreaView className='bg-white '>
            <StatusBar
                barStyle='light-content'
            />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                className='flex w-full h-full max-w-full p-4 bg-white'>

                <View className="flex flex-row justify-center flex-1 w-full px-4 py-4 bg-white">

                    <Text className="text-lg font-bold text-black">React Native Bridge RA</Text>

                </View>
                <View className='flex p-4 space-y-8'>
                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        getInsatnceId()
                    }}>
                        <Text className='text-lg text-white'>Get Instance Id</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        compassHelper.saveBiometricsConsent(1);
                    }}>
                        <Text className='text-lg text-white'>Save Biometrics</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        readRegistrationData();
                    }}>
                        <Text className='text-lg text-white'>Read Registration Data</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        createBasicDigitalId();
                    }}>
                        <Text className='text-lg text-white'>Create Digital ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        writeBasicDigitalId();
                    }}>
                        <Text className='text-lg text-white'>Write Digital ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        writePasscode();
                    }}>
                        <Text className='text-lg text-white'>Write Passcode</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
                        verifyPasscode();
                    }}>
                        <Text className='text-lg text-white'>Verify Passcode</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ maxWidth: wp('100%') }} className='flex flex-wrap justify-center flex-1 w-full pt-4 pb-8 mx-2 h-1/3'>
                    <View>
                        <Text>Response/Error:</Text>
                    </View>

                    <JSONTree hideRoot={true} data={state} />
                </View>


            </ScrollView>


        </SafeAreaView>
    );
}

export const screenOptions = { title: 'Home', headerShown: false };
export default Home;

