# React native: Migrating from CP 2.x to CP 3.x
To communicate with the CPK, React native reliant applications were required to install a [wrapper library](https://github.com/mastercard/community-pass-react-native-wrapper). This exposed methods/functions to interact with the CPK.

Version 3.x of the CPK comes with a new API [the unified API](https://developer.mastercard.com/cp-kernel-integration-api/documentation/reference-pages/unified-api-reference/) that can be accessed through [a headless Bridge reliant app](https://developer.mastercard.com/cp-kernel-integration-api/documentation/cp-assets/bridge-ra/)

To migrate to CP 3.x:
1. Set up and Install the Bridge Reliant App. [Refer to this resource](https://developer.mastercard.com/cp-kernel-integration-api/tutorial/bridge-ra-getting-started-guide/).
2. Install an intent launcher library for use in communicating to the Bridge RA. We recommend [Expo IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher/)
```
npx install-expo-modules@latest && npx expo install expo-intent-launcher
```
3. Add the Bridge Reliant app permission to `android/app/src/main/AndroidManifest.xml`
```
    <uses-permission android:name="com.mastercard.compass.bridgera.permission.BRIDGE_RELIANT_SECURITY"/>
```
4. Set up encryption & decryption. Install [android native utilities for encryption and decryption](../react-native-android-utils-0.1.1.tgz)
```
npm i ./{path-to-.tgz file}
```
5. Create a file e.g `compass-helper.ts` where you shall implement methods to invoke the Bridge RA actions. We shall then replace all imports from the `community-pass-react-native-wrapper` with their equivalent from the `compass-helper.ts`.  When using the [Expo IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher/) to fire actions to the Bridge RA, the `compass-helper.ts` can look something like this:
[utils/compass-helper.ts](https://github.com/kal-J/community-pass-react-native-sample-app/blob/5f763eb0ee52e455111530aca0b95c080195d787/utils/compass-helper.ts)
https://github.com/kal-J/community-pass-react-native-sample-app/blob/5f763eb0ee52e455111530aca0b95c080195d787/utils/compass-helper.ts

# Recomendations
- If the Reliant app has both Credential manager and Acceptor use cases, make sure to pass different `participationProgramId` or `programGuid` accordingly.
- Use a secure/encrypted local data store for the data you need to store on the device. We recommend [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- Always refer to [The official community pass documentation](https://developer.mastercard.com/cp-kernel-integration-api/tutorial/bridge-ra-getting-started-guide/) for the most recent and accurate information.