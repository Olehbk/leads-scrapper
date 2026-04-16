let current = null;

function setStatus(msg) { current = msg; }
function getStatus() { return current; }
function clearStatus() { current = null; }

module.exports = { setStatus, getStatus, clearStatus };
