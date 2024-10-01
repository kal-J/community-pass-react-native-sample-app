"use strict";

import { NativeModules, Platform } from 'react-native';
import Ajv from 'ajv';
const LINKING_ERROR = `The package 'react-native-android-utils' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n';
const AndroidUtils = NativeModules.AndroidUtils ? NativeModules.AndroidUtils : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }
});

// Generate Keys
export function generateRsaKeyPair() {
  return AndroidUtils.generateRsaKeyPair();
}
export function generateAesKey() {
  return AndroidUtils.generateAesKey();
}

// Manage Prefs
export function saveStringData(key, value) {
  return AndroidUtils.saveStringData(key, value);
}
export function saveBoolData(key, value) {
  return AndroidUtils.saveBoolData(key, value);
}
export function getStringData(key) {
  return AndroidUtils.getStringData(key);
}
export function getBoolData(key) {
  return AndroidUtils.getBoolData(key);
}
export function clearData(key) {
  return AndroidUtils.clearData(key);
}

// Manage Payload
export function prepareRequestPayload(payload) {
  return AndroidUtils.prepareRequestPayload(payload);
}
export function parseResponsePayload(payload) {
  return AndroidUtils.parseResponsePayload(payload);
}
export function isCmtSchemaValid(data) {
  const ajv = new Ajv();
  const validate = ajv.compile(interfaceSchema);
  return Promise.resolve(validate(data));
}

// Responses

// TypeScript interface based on schema

// JSON schema for the interface
const interfaceSchema = {
  type: 'object',
  properties: {
    systemInfo: {
      type: 'object',
      properties: {
        originatingSystem: {
          type: 'string',
          nullable: true
        },
        idempotencyKey: {
          type: 'string',
          nullable: true
        },
        type: {
          type: 'string',
          enum: ['Request', 'Response']
        } // Enum
      },
      required: ['type']
    },
    commonAttributes: {
      type: 'object',
      properties: {
        clientAppDetails: {
          type: 'object',
          properties: {
            productOffering: {
              type: 'string',
              nullable: true
            },
            cpdiClientType: {
              type: 'string',
              nullable: true
            },
            reliantAppId: {
              type: 'string',
              nullable: true
            }
          },
          nullable: true
        },
        serviceProvider: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              nullable: true
            },
            region: {
              type: 'string',
              nullable: true
            },
            id: {
              type: 'string',
              nullable: true
            },
            participationProgramId: {
              type: 'string'
            },
            // Required
            acceptor: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  nullable: true
                },
                id: {
                  type: 'string',
                  nullable: true
                }
              },
              nullable: true
            }
          },
          required: ['participationProgramId']
        },
        agent: {
          type: 'object',
          properties: {
            cpid: {
              type: 'string',
              nullable: true
            },
            id: {
              type: 'string',
              nullable: true
            },
            name: {
              type: 'string',
              nullable: true
            }
          },
          nullable: true
        },
        credentialHolderDetails: {
          type: 'object',
          properties: {
            cmIssuedRid: {
              type: 'string',
              nullable: true
            },
            amrid: {
              type: 'string',
              nullable: true
            },
            spId: {
              type: 'string',
              nullable: true
            }
          },
          nullable: true
        },
        transaction: {
          type: 'object',
          properties: {
            tagId: {
              type: 'string',
              nullable: true
            },
            status: {
              type: 'string',
              nullable: true
            }
          },
          nullable: true
        }
      },
      required: ['serviceProvider']
    },
    payload: {
      type: 'object'
    },
    // Required
    custom: {
      type: 'object',
      nullable: true
    }
  },
  required: ['systemInfo', 'commonAttributes', 'payload'],
  additionalProperties: false
};
//# sourceMappingURL=index.js.map