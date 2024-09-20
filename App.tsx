import React from 'react';
import type { PropsWithChildren } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CompassHelper from './utils/compass-helper';


function App(): React.JSX.Element {

  const compassHelper = new CompassHelper();


  return (
    <SafeAreaView className='bg-white'>
      <StatusBar
        barStyle='light-content'
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className='p-4 bg-white'>
        <View className="flex flex-row justify-center flex-1 w-full px-4 py-4 bg-white">


          <Text className="text-lg font-bold">React Native Bridge RA</Text>

        </View>
        <View className='flex p-4 space-y-8'>
          <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
            compassHelper.getInstanceId();
          }}>
            <Text className='text-lg text-white'>Get Instance Id</Text>
          </TouchableOpacity>

          <TouchableOpacity className='flex items-center justify-center p-4 bg-blue-600' onPress={() => {
            compassHelper.saveBiometricsConsent(1);
          }}>
            <Text className='text-lg text-white'>Save Biometrics</Text>
          </TouchableOpacity>






        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
