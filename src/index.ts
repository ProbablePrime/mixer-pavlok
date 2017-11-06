import * as config from 'config';
import * as pavlok from 'pavlok-beta-api-login';
import { InteractiveManager } from './InteractiveManager';
import { PavlokBLEManager } from './PavlokBLEManager';

const operationMode = config.get<string>('pavlok.mode');

const clientId = config.get<string>('pavlok.clientID');
const secretId = config.get<string>('pavlok.clientSecret');

const token = config.get<string>('mixer.token');
const version = config.get<number>('mixer.version');

const manager = new InteractiveManager(token, version);

const ble = new PavlokBLEManager();
let batteryCheckInterval: NodeJS.Timer;

if (operationMode != 'ble')
{
    pavlok.init(
        clientId,
        secretId,
        {
            port: 3000,
        },
    );

    pavlok.login((result: any) =>
    {
        if (!result)
        {
            throw new Error('Auth failed');
        }

        manager.init().then(() =>
        {
            registerEvents();
        });
    });
}
else
{
    ble.on('ready', () =>
    {
        registerEvents();
        batteryCheckInterval = setInterval(() => 
        {
            let batteryLevel: number = ble.batteryLevel();
            console.log('Pavlok battery level:', batteryLevel + '%');
        }, 2500);
    });
    ble.on('unready', () =>
    {
        clearInterval(batteryCheckInterval);
        deregisterEvents();
    });
}

function registerEvents()
{
    manager.on('zap', (strength: number) =>
    {
        if (operationMode != 'ble')
        {
            pavlok.zap({
                intensity: strength,
            });
        }
        else
        {
            ble.shock(Math.floor(strength / 255 * 100), 1, 100, 0);
        }
    });
}

function deregisterEvents()
{
    manager.removeListener('on', () =>
    {

    });
}
