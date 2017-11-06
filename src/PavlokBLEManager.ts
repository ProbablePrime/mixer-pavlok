import * as config from 'config';
import * as noble from 'noble-uwp'; // not sure if this is platform portable like regular noble, is conditionally loading imports in TypeScript legal?
import * as EventEmitter from 'events';

const MAC = config.get<string>('pavlok.mac');

export interface IPavlokCharacteristic
{
    beep: string;
    shock: string;
    vibrate: string;
    led: string;
    batteryLevel: string;
    hardwareRevision: string;
    firmwareRevision: string;
}

export interface IPavlokCharacteristicHandles
{
    beep: noble.Characteristic | null;
    shock: noble.Characteristic | null;
    vibrate: noble.Characteristic | null;
    led: noble.Characteristic | null;
    batteryLevel: noble.Characteristic | null;
    hardwareRevision: noble.Characteristic | null;
    firmwareRevision: noble.Characteristic | null;
}

const actionServiceID = config.get<string>('pavlok.actionService');
const characteristics = config.get<IPavlokCharacteristic>('pavlok.characteristics');

const allChrs = Object.keys(characteristics).map(key => characteristics[key]);


export class PavlokBLEManager extends EventEmitter
{
    private handles: IPavlokCharacteristicHandles = {
        beep: null,
        shock: null,
        vibrate: null,
        led: null,
        batteryLevel: null,
        hardwareRevision: null,
        firmwareRevision: null
    };
    constructor()
    {
        super();
        this.init();
    }
    
    public init()
    {
        const start = new Date().getTime();
        function howLongHaveIBeenWaiting()
        {
            const now = new Date().getTime();
            console.log(now - start);
        }
        noble.on('discover', peripheral =>
        {
            // Pavlok MAC addresses start with:
            // 00:07:80 Bluegiga Technologies OY
            // 88:6B:0F Bluegiga Technologies OY
            if (MAC != peripheral.address)
            {
                return;
            }
            // check vender ID in device MAC, just to be sure
            if (!(peripheral.address.startsWith('00:07:80') || peripheral.address.startsWith('88:6B:0F')))
            {
                console.log('This is probably not a Pavlok, check your configuration');
                throw new Error('vendor ID mismatch');
            }
            console.log('found pavlok');
            noble.stopScanning();
            peripheral.on('disconnect', () =>
            {
                console.log('it disconnected, Pavlok is an exceptionaly well made device');
                this.emit('unready'); // use to disable UI?
                Object.keys(this.handles).forEach(key => this.handles[key] = null);
                // TODO: Reconnect, WHICH IS GOING TO BE AMAZINGLY FUN.
                // Or not, maybe:
                setTimeout(() =>
                {
                    console.log('reconnecting...');
                    peripheral.removeListener('disconnect', () =>
                    {

                    });
                    // todo: make peripheral.connect promises event driven as well
                    noble.removeListener('stateChange', () =>
                    {

                    });
                    noble.removeListener('discover', () =>
                    {

                    });
                    this.init();
                }, 1500);
            });
            peripheral.connect(err =>
            {
                console.log('connected');
                howLongHaveIBeenWaiting();
                if (err)
                {
                    throw err;
                }
                peripheral.discoverServices([actionServiceID], (err, services) =>
                {
                    if (err)
                    {
                        throw err;
                    }
                    if (!services.length)
                    {
                        throw new Error('No services found. Are you sure this is a Pavlok?');
                    }
                    services.forEach(service =>
                    {
                        // console.log('found service:', service.uuid);
                        service.discoverCharacteristics(allChrs, (_, chrs) =>
                        {
                            console.log('discovery done');
                            chrs.forEach(characteristic =>
                            {
                                Object.keys(characteristics).forEach(key =>
                                {
                                    const addr = characteristics[key];
                                    if (characteristic.uuid == addr)
                                    {
                                        this.handles[key] = characteristic;
                                    }
                                });
                            });
                            // READY
                            console.log('ready');
                            howLongHaveIBeenWaiting();
                            this.emit('ready');
                        });
                    });
                });
            });
        });
        
        noble.on('stateChange', state =>
        {
            if (state == 'poweredOn')
            {
                console.log('scanning...');
                noble.startScanning([], false);
            }
            else
            {
                noble.stopScanning();
            }
        });
    }

    private commonAction(handle: noble.Characteristic, level: number, count: number, duration: number, pause: number)
    {
        this.write(handle, Buffer.from([level, count, duration, pause]));
    }

    public shock(level: number, count: number, duration: number, pause: number)
    {
        this.commonAction(this.handles.shock, count, level, duration, pause);
    }

    public beep(level: number, count: number, duration: number, pause: number)
    {
        this.commonAction(this.handles.beep, count, level, duration, pause);
    }

    public vibrate(level: number, count: number, duration: number, pause: number)
    {
        this.commonAction(this.handles.vibrate, count, level, duration, pause);
    }

    public flashLED1(count: number, duration: number, pause: number)
    {
        this.writeLED(count, duration, pause, 1);
    }

    public flashLED2(count: number, duration: number, pause: number)
    {
        this.writeLED(count, duration, pause, 2);
    }

    public flashLEDs(count: number, duration: number, pause: number)
    {
        this.writeLED(count, duration, pause, 3);
    }

    public flashLEDsRed(count: number, duration: number, pause: number)
    {
        this.writeLED(count, duration, pause, 8);
    }

    private writeLED(count: number, duration: number, pause: number, led: number)
    {
        console.log(led);
        // 1 : 0b0001 = first yellow
        // 2 : 0b0010 = second yellow
        // 3 : 0b0011 = first yellow + second yellow -> both yellow
        // 4 : 0b0100 = no idea
        // 8 : 0b1000 = both red
        this.write(this.handles.led, Buffer.from([count, 0, duration, pause, led]));
    }

    public batteryLevel(): number
    {
        return Number(this.read(this.handles.batteryLevel));
    }

    public hardwareRevision(): string
    {
        return this.read(this.handles.hardwareRevision);
    }

    public firmwareRevision(): string
    {
        return this.read(this.handles.firmwareRevision);
    }

    private normalizeLevel(level: number): number
    {
        return Math.floor(level * 2.55);
    }

    private normalizeCount(count: number): number
    {
        return 128 + count;
    }

    private normalizeTime(time: number): number
    {
        return Math.floor(time / 20);
    }

    public normalizeBuffer(buf: Buffer): Buffer
    {
        buf[0] = this.normalizeCount(buf[0]);
        buf[1] = this.normalizeLevel(buf[1]);
        buf[2] = this.normalizeTime(buf[2]);
        buf[3] = this.normalizeTime(buf[3]);

        return buf;
    }

    private read(handle: noble.Characteristic | null): string
    {
        if (!handle)
        {
            throw new Error('No valid handle');
        }
        var done = false;
        var temp;
        handle.read((error, data) =>
        {
            if (!error)
            {
                temp = data.toString('utf8');
            }
            done = true;
        });
        // todo: make an actual callback implementation
        while (!done)
        {
            /**  */
        }
        return temp;
    }

    private write(handle: noble.Characteristic | null, buf: Buffer)
    {
        if (!handle)
        {
            throw new Error('No valid handle');
        }
        handle.write(buf, false, () =>
        {
            /** */
        });
    }
}
