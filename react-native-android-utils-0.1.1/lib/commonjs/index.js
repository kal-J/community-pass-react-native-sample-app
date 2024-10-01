"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearData = clearData;
exports.generateAesKey = generateAesKey;
exports.generateRsaKeyPair = generateRsaKeyPair;
exports.getBoolData = getBoolData;
exports.getStringData = getStringData;
exports.isCmtSchemaValid = isCmtSchemaValid;
exports.parseResponsePayload = parseResponsePayload;
exports.prepareRequestPayload = prepareRequestPayload;
exports.saveBoolData = saveBoolData;
exports.saveStringData = saveStringData;
var _reactNative = require("react-native");
var _ajv = _interopRequireDefault(require("ajv"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const LINKING_ERROR = `The package 'react-native-android-utils' doesn't seem to be linked. Make sure: \n\n` + _reactNative.Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n';
const AndroidUtils = _reactNative.NativeModules.AndroidUtils ? _reactNative.NativeModules.AndroidUtils : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }
});

// Generate Keys
function generateRsaKeyPair() {
  return AndroidUtils.generateRsaKeyPair();
}
function generateAesKey() {
  return AndroidUtils.generateAesKey();
}

// Manage Prefs
function saveStringData(key, value) {
  return AndroidUtils.saveStringData(key, value);
}
function saveBoolData(key, value) {
  return AndroidUtils.saveBoolData(key, value);
}
function getStringData(key) {
  return AndroidUtils.getStringData(key);
}
function getBoolData(key) {
  return AndroidUtils.getBoolData(key);
}
function clearData(key) {
  return AndroidUtils.clearData(key);
}

// Manage Payload
function prepareRequestPayload(payload) {
  return AndroidUtils.prepareRequestPayload(payload);
}
function parseResponsePayload(payload) {
  return AndroidUtils.parseResponsePayload(payload);
}
function isCmtSchemaValid(data) {
  const ajv = new _ajv.default();
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