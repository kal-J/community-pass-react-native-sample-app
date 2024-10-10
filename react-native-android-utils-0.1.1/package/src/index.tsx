import { NativeModules, Platform } from 'react-native';
import Ajv, { type JSONSchemaType } from 'ajv';

const LINKING_ERROR =
  `The package 'react-native-android-utils' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const AndroidUtils = NativeModules.AndroidUtils
  ? NativeModules.AndroidUtils
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Generate Keys
export function generateRsaKeyPair(): Promise<RSAKeyPair> {
  return AndroidUtils.generateRsaKeyPair();
}
export function generateAesKey(): Promise<AESSecret> {
  return AndroidUtils.generateAesKey();
}

// Manage Prefs
export function saveStringData(
  key: string,
  value: string
): Promise<GenericResponse> {
  return AndroidUtils.saveStringData(key, value);
}

export function saveBoolData(
  key: string,
  value: boolean
): Promise<GenericResponse> {
  return AndroidUtils.saveBoolData(key, value);
}

export function getStringData(key: string): Promise<GetStringDataResponse> {
  return AndroidUtils.getStringData(key);
}

export function getBoolData(key: string): Promise<GetBoolDataResponse> {
  return AndroidUtils.getBoolData(key);
}

export function clearData(key: string): Promise<GenericResponse> {
  return AndroidUtils.clearData(key);
}

// Manage Payload
export function prepareRequestPayload(
  payload: RequestPayload
): Promise<PreparedRequest> {
  return AndroidUtils.prepareRequestPayload(payload);
}

export function parseResponsePayload(payload: string): Promise<ParsedResponse> {
  return AndroidUtils.parseResponsePayload(payload);
}

export function isCmtSchemaValid(data: CmtSchema): Promise<boolean> {
  const ajv = new Ajv();
  const validate = ajv.compile(interfaceSchema);
  return Promise.resolve(validate(data));
}

// Responses
export interface RSAKeyPair {
  publicKey: string;
}

export interface RequestPayload {
  cmt: string;
  bridgeRaPublicKey: string;
}

export interface GenericResponse {
  success: boolean;
}

export interface GetStringDataResponse {
  data: string;
}

export interface GetBoolDataResponse {
  data: boolean;
}

export interface AESSecret {
  aesSecret: string;
}

export interface PreparedRequest {
  requestData: string;
}

export interface ParsedResponse {
  responseData: string;
}

// TypeScript interface based on schema
interface CmtSchema {
  systemInfo: {
    originatingSystem?: string;
    idempotencyKey?: string;
    type: string; // Required
  };
  commonAttributes: {
    clientAppDetails?: {
      productOffering?: string;
      cpdiClientType?: string;
      reliantAppId?: string;
    };
    serviceProvider: {
      type?: string;
      region?: string;
      id?: string;
      participationProgramId: string; // Required
      acceptor?: {
        type?: string;
        id?: string;
      };
    };
    agent?: {
      cpid?: string;
      id?: string;
      name?: string;
    };
    credentialHolderDetails?: {
      cmIssuedRid?: string;
      amrid?: string;
      spId?: string;
    };
    transaction?: {
      tagId?: string;
      status?: string;
    };
  };
  payload: {
    [index: string]: unknown;
  }; // Required
  custom?: Record<string, unknown>;
}

// JSON schema for the interface
const interfaceSchema: JSONSchemaType<CmtSchema> = {
  type: 'object',
  properties: {
    systemInfo: {
      type: 'object',
      properties: {
        originatingSystem: { type: 'string', nullable: true },
        idempotencyKey: { type: 'string', nullable: true },
        type: { type: 'string', enum: ['Request', 'Response'] }, // Enum
      },
      required: ['type'],
    },
    commonAttributes: {
      type: 'object',
      properties: {
        clientAppDetails: {
          type: 'object',
          properties: {
            productOffering: { type: 'string', nullable: true },
            cpdiClientType: { type: 'string', nullable: true },
            reliantAppId: { type: 'string', nullable: true },
          },
          nullable: true,
        },
        serviceProvider: {
          type: 'object',
          properties: {
            type: { type: 'string', nullable: true },
            region: { type: 'string', nullable: true },
            id: { type: 'string', nullable: true },
            participationProgramId: { type: 'string' }, // Required
            acceptor: {
              type: 'object',
              properties: {
                type: { type: 'string', nullable: true },
                id: { type: 'string', nullable: true },
              },
              nullable: true,
            },
          },
          required: ['participationProgramId'],
        },
        agent: {
          type: 'object',
          properties: {
            cpid: { type: 'string', nullable: true },
            id: { type: 'string', nullable: true },
            name: { type: 'string', nullable: true },
          },
          nullable: true,
        },
        credentialHolderDetails: {
          type: 'object',
          properties: {
            cmIssuedRid: { type: 'string', nullable: true },
            amrid: { type: 'string', nullable: true },
            spId: { type: 'string', nullable: true },
          },
          nullable: true,
        },
        transaction: {
          type: 'object',
          properties: {
            tagId: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
          },
          nullable: true,
        },
      },
      required: ['serviceProvider'],
    },
    payload: { type: 'object' }, // Required
    custom: { type: 'object', nullable: true },
  },
  required: ['systemInfo', 'commonAttributes', 'payload'],
  additionalProperties: false,
};
