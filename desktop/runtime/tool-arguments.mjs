// A bounded structural subset of JSON Schema; business authorization and
// operation-specific validation still happen at the execution boundary.
export function validateToolArguments(value, schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return true;
    let budget = 20000;
    function check(v, s, depth) {
        if (--budget < 0 || depth > 32) return false;
        if (!s || typeof s !== 'object' || Array.isArray(s)) return true;
        if (Array.isArray(s.anyOf) && !s.anyOf.some(item => check(v, item, depth + 1))) return false;
        const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
        if (s.type !== undefined) {
            const allowed = Array.isArray(s.type) ? s.type : [s.type];
            if (!allowed.includes(type) && !(type === 'integer' && allowed.includes('number'))) return false;
        }
        if (Array.isArray(s.enum) && !s.enum.some(x => x === v)) return false;
        if (typeof v === 'number' && (!Number.isFinite(v) || (typeof s.minimum === 'number' && v < s.minimum) || (typeof s.maximum === 'number' && v > s.maximum))) return false;
        if (typeof v === 'string') {
            // The first-party PPT colour constraint is fixed and safe to evaluate.
            // Unknown third-party patterns are not evaluated by this bounded
            // subset and must be validated by the tool or its server.
            if (s.pattern === '^#[0-9a-fA-F]{6}$' && !/^#[0-9a-fA-F]{6}$/.test(v)) return false;
            const n = [...v].length;
            if ((typeof s.minLength === 'number' && n < s.minLength) || (typeof s.maxLength === 'number' && n > s.maxLength)) return false;
        }
        if (Array.isArray(v)) {
            if ((typeof s.minItems === 'number' && v.length < s.minItems) || (typeof s.maxItems === 'number' && v.length > s.maxItems)) return false;
            if (s.items && !v.every(item => check(item, s.items, depth + 1))) return false;
        } else if (v && typeof v === 'object') {
            if (Array.isArray(s.required) && s.required.some(key => !Object.hasOwn(v, key))) return false;
            const props = s.properties && typeof s.properties === 'object' ? s.properties : {};
            for (const key of Object.keys(v)) {
                if (Object.hasOwn(props, key)) { if (!check(v[key], props[key], depth + 1)) return false; }
                else if (s.additionalProperties === false) return false;
                else if (s.additionalProperties && typeof s.additionalProperties === 'object' && !check(v[key], s.additionalProperties, depth + 1)) return false;
            }
        }
        return true;
    }
    return check(value, schema, 0);
}
