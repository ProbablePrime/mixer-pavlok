import {PavlokBLEManager} from './PavlokBLEManager';

const ble = new PavlokBLEManager();
ble.on('ready', () =>
{
    ble.beep(50, 3, 200, 300);
    ble.flashLEDs(10, 1000, 500);
});