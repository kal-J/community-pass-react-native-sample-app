import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeData = async (key: string, value: any): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
        console.log(e);
      return false;
      // saving error
    }
  };

  export const getData = async (key: string) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        return null;
      // error reading value
    }
  };