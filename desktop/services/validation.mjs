export const requiredText = (v, max = 20000) => { if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new Error('内容为空或过长'); return v.trim(); };
