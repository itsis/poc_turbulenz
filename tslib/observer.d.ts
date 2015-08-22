declare class Observer {
    subscribers: {
        (): void;
    }[];
    subscribe(subscriber: any): void;
    unsubscribe(subscriber: any): void;
    unsubscribeAll(): void;
    notify(a0?: any, a1?: any, a2?: any, a3?: any, a4?: any, a5?: any, a6?: any, a7?: any, a8?: any, a9?: any, a10?: any, a11?: any): void;
    static create(): Observer;
}
