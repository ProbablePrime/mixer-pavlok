declare module 'pavlok-beta-api-login' {
    export function init(clientID: string, clientSecret: string, options: any): void;
    export function login(callback: (result: boolean, code: any) => void): void;
}
