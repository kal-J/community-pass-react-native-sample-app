export declare function generateRsaKeyPair(): Promise<RSAKeyPair>;
export declare function generateAesKey(): Promise<AESSecret>;
export declare function saveStringData(key: string, value: string): Promise<GenericResponse>;
export declare function saveBoolData(key: string, value: boolean): Promise<GenericResponse>;
export declare function getStringData(key: string): Promise<GetStringDataResponse>;
export declare function getBoolData(key: string): Promise<GetBoolDataResponse>;
export declare function clearData(key: string): Promise<GenericResponse>;
export declare function prepareRequestPayload(payload: RequestPayload): Promise<PreparedRequest>;
export declare function parseResponsePayload(payload: string): Promise<ParsedResponse>;
export declare function isCmtSchemaValid(data: CmtSchema): Promise<boolean>;
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
interface CmtSchema {
    systemInfo: {
        originatingSystem?: string;
        idempotencyKey?: string;
        type: string;
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
            participationProgramId: string;
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
    };
    custom?: Record<string, unknown>;
}
export {};
//# sourceMappingURL=index.d.ts.map