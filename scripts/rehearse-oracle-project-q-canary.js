import { rehearseOracleProjectQCanary } from '../src/campaign/integrationCanary.js';

const result = await rehearseOracleProjectQCanary();
console.log(JSON.stringify(result, null, 2));
