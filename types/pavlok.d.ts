declare module 'pavlok-beta-api-login' {
    export interface ICallOpts {
        intensity?: number;
        message?: string;
        callback?: Function;
        code?: string;
        count?: number;
        pattern?: string[];
    }
    export function init(clientID: string, clientSecret: string, options: any): void;
    export function login(callback: (result: boolean, code: any) => void): void;

    export function zap(options: ICallOpts): void;
    export function vibrate(options: ICallOpts): void;
    export function beep(options: ICallOpts): void;
    export function pattern(options: ICallOpts): void;
}
