import * as config from 'config';
import * as pavlok from 'pavlok-beta-api-login';

const clientId = config.get<string>('pavlok.clientID');
const secretId = config.get<string>('pavlok.clientSecret');

pavlok.init(
    clientId,
    secretId,
    {
        port: 3000,
    },
);

pavlok.login((result: any, code: any) => {
    if (!result) {
        throw new Error('Auth failed');
    }
});


