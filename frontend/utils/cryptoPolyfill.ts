import * as Crypto from 'expo-crypto';

// Polyfill the global crypto object for TweetNaCl and other libraries
if (typeof global.crypto !== 'object') {
  (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  (global as any).crypto.getRandomValues = (array: any) => {
    return Crypto.getRandomValues(array);
  };
}
