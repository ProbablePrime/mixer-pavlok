import { expect } from 'chai';

import { hello } from './';

describe('index', () => {
    it('returns true', () => {
        expect(hello()).to.equal('hello world');
    });
});
