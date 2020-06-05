
const qddVis = require("./build/Release/QDD_Vis");

let data = new Map();

function parseIP(req) {
    return req.ip.toString().replace(/[^a-zA-Z0-9]/g, '');
}

function getTimeStamp() {
    return Date.now();
}

function register(req) {
    const ip = parseIP(req);
    if(!data.has(ip)) {
        const vis = new qddVis.QDDVis(ip);
        data.set(ip, {
            vis: vis,
            last_access: getTimeStamp()
        });
    }
}

function get(req) {
    const ip = parseIP(req);
    const item = data.get(ip);
    if(item) {
        item.last_access = getTimeStamp();  //update the last time the item was accessed
        return item.vis;
    }
}

function remove(ip) {
    data.delete(ip);
}

module.exports.register = register;
module.exports.get = get;
module.exports.parseIP = parseIP;


const CLEANUP_TIMER = 24 * 60 * 60 * 1000;        //how mucht time is between two cleanUPData()-calls - in ms (24 hours)
const MAX_LAST_ACCESS_DIFF = CLEANUP_TIMER;  //how much time must have passed since the last access before it will be deleted - in ms
function cleanUpData() {
    console.log("Starting cleanup...");

    const minLA = getTimeStamp() - MAX_LAST_ACCESS_DIFF;    //the min value of last_access for the item to not be removed; everything lower is removed
    const ipsToRemove = [];
    for(const item of data.entries()) { //item: [key, value]
        if(item[1].last_access < minLA) {
            ipsToRemove.push(item[0]);  //push the key (ip)
        }
    }

    for(const ip of ipsToRemove) remove(ip);

    setTimeout(() => cleanUpData(), CLEANUP_TIMER);
    console.log("Cleanup finished. Removed " + ipsToRemove.length + " items.");
}
//setTimeout(() => cleanUpData(), CLEANUP_TIMER);
cleanUpData();
