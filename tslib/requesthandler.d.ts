interface RequestFn {
    (src: string, responseCallback: any, callContext: RequestHandlerCallContext): void;
}
interface RequestOwner {
    request: RequestFn;
}
interface RequestOnLoadCB {
    (asset: any, status: number, callContext: RequestHandlerCallContext): void;
}
interface RequestHandlerResponseFilter {
    (callContext: RequestHandlerCallContext, makeRequest: {
        (): void;
    }, responseAsset: string, status: number): boolean;
}
interface RequestHandlerCallContext {
    onload: RequestOnLoadCB;
    src: string;
    requestFn?: RequestFn;
    requestOwner?: RequestOwner;
    responseFilter?: RequestHandlerResponseFilter;
}
declare class RequestHandler {
    initialRetryTime: number;
    notifyTime: number;
    maxRetryTime: number;
    notifiedConnectionLost: boolean;
    connected: boolean;
    reconnectedObserver: Observer;
    reconnectTest: any;
    connectionLostTime: number;
    destroyed: boolean;
    onReconnected: {
        (reason: number, reconnectTest: any): void;
    };
    onRequestTimeout: {
        (reason: number, callContext: RequestHandlerCallContext): void;
    };
    handlers: {
        eventOnload: any[];
        [index: string]: any[];
    };
    responseFilter: {
        (callContext: RequestHandlerCallContext, makeRequest: {
            (): void;
        }, responseAsset: any, status: number): void;
    };
    reasonConnectionLost: number;
    reasonServiceBusy: number;
    retryExponential(callContext: any, requestFn: any, status: any): void;
    retryAfter(callContext: any, retryAfter: any, requestFn: any, status: any): void;
    request(callContext: RequestHandlerCallContext): void;
    addEventListener(eventType: any, eventListener: any): void;
    removeEventListener(eventType: any, eventListener: any): void;
    sendEventToHandlers(eventHandlers: any, arg0: any): void;
    destroy(): void;
    static create(params: any): RequestHandler;
}
