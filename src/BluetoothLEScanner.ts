import * as config from 'config';
import * as noble from 'noble-uwp';

const MAC = config.get<string>('pavlok.mac');
noble.on('discover', peripheral =>
{
    if (MAC == peripheral.address)
    {
        console.log('found pavlok');
        noble.stopScanning();
        peripheral.connect(err =>
        {
            console.log('connected');
            if (err)
            {
                throw err;
            }
            peripheral.discoverServices([], (err, services) =>
            {
                if (err)
                {
                    throw err;
                }
                if (!services.length)
                {
                    throw new Error('No services found. Are you sure this is a BLE GATT compatible device?');
                }
                services.forEach(service =>
                {
                    console.log('found service:', service.uuid);
                    service.discoverCharacteristics([], (_, characteristics) =>
                    {
                        let i = 0;
                        tryWrite(characteristics, i, service);
                    });
                });
            });
        });
    }
});

function tryWrite(characteristics: noble.Characteristic[], i: number, service: noble.Service)
{
    const characteristic = characteristics[i];
    if (!characteristic)
    {
        return;
    }
    if (characteristic.properties.indexOf('write') != -1)
    {
        console.log('found potential target:', service.uuid, characteristic.uuid);
        // we can write to this thing
        characteristic.write(Buffer.from([128 + 3, Math.floor(100 * 2.55), Math.floor(200 / 20), Math.floor(100 / 20)]), false, () =>
        {
            /** */
        });
        console.log('written');
    }
    else
    {
        console.log('can\'t write to that');
    }
    if (i == characteristics.length)
    {
        return;
    }
    setTimeout(() => tryWrite(characteristics, i + 1, service), 2000);
}

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
})