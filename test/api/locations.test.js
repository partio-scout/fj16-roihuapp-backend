import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as testUtils from '../utils/testutils';

chai.use(chaiAsPromised);

describe('Locations', () => {
  it('should allow get location Translations', () => testUtils.get('/api/locationCategories/Translations').expect(200));
});
