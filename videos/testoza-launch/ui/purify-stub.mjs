// Pass-through stand-in for DOMPurify during the offline server render (inputs are our own sample data).
const p = { sanitize: (s) => String(s), addHook() {}, removeHook() {}, removeAllHooks() {}, setConfig() {}, isSupported: true };
export default p;
export const sanitize = p.sanitize;
