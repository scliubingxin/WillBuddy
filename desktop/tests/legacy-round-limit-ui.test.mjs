import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyRoundLimit} from '../src/ui/legacy-round-limit.js';

test('legacy editor shows the inherited agent limit instead of a misleading 32',()=>{
 assert.deepEqual(legacyRoundLimit({},[{id:'assistant',maxSteps:12}],'assistant'),{value:12,inherited:true});
});
test('saved model limit takes precedence and missing agent uses runtime default',()=>{
 assert.deepEqual(legacyRoundLimit({maxSteps:48},[{id:'assistant',maxSteps:12}],'assistant'),{value:48,inherited:false});
 assert.deepEqual(legacyRoundLimit({},[],'assistant'),{value:32,inherited:true});
});
