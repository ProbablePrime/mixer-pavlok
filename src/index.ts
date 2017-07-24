import * as config from 'config';
import * as pavlok from 'pavlok-beta-api-login';
import { InteractiveManager } from './InteractiveManager';

const clientId = config.get<string>('pavlok.clientID');
const secretId = config.get<string>('pavlok.clientSecret');

const token = config.get<string>('mixer.token');
const version = config.get<number>('mixer.version');

const manager = new InteractiveManager(token, version);

pavlok.init(
    clientId,
    secretId,
    {
        port: 3000,
    },
);

pavlok.login((result: any) => {
    if (!result) {
        throw new Error('Auth failed');
    }

    manager.init().then(() => {
        registerEvents();
    });
});

function registerEvents() {
    manager.on('zap', (strength: number) => {
        pavlok.zap({
            intensity: strength,
        });
    });
}
