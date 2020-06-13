
const qddVis = require("./build/Release/QDD_Vis");

let data = new Map();

/**Retrieves the key for data based on the request.
 *
 * @param req
 * @returns {string}
 */
function getKey(req) {
    //console.log("New IP-try: " + req.headers['x-forwarded-for'].split(',')[0]);
    //console.log(req.ip);
    let dataKey;
    //dataKey = req.headers['x-forwarded-for'].split(',')[0];//req.ip.toString().replace(/[^a-zA-Z0-9]/g, '');

    if(req.dataKey) {
        dataKey = req.dataKey;
        //console.log("req.dataKey");
    } else if(req.query.dataKey) {
        dataKey = req.query.dataKey;
        //console.log("req.query.dataKey");
    } else if(req.body.dataKey) {
        dataKey = req.body.dataKey;
        //console.log("req.body.dataKey");
    } else {
        //console.log("dataKey unknown");
    }

    return dataKey;
}

function createKey(req) {
    let ipPart = "0";
    //retrieves the ip-address of the client (doesn't work on localhost somehow)
    if(req.headers['x-forwarded-for']) ipPart = req.headers['x-forwarded-for'].split(',')[0];
    const randPart = String(Math.random()).substr(2);   //remove the 0. at the beginning
    return ipPart + randPart;
}


function getTimeStamp() {
    return Date.now();
}

function register(req, reset = false) {
    const key = createKey(req);
    if(reset) remove(key);
    //if(!data.has(key)) {
        const vis = new qddVis.QDDVis(key);
        data.set(key, {
            vis: vis,
            last_access: getTimeStamp()
        });
    //}
    return key;
}

function get(req) {
    const key = getKey(req);
    const item = data.get(key);
    if(item) {
        item.last_access = getTimeStamp();  //update the last time the item was accessed
        return item.vis;
    }
}

function remove(key) {
    data.delete(key);
}

module.exports.register = register;
module.exports.get = get;
//module.exports.getKey = getKey;

const CLEANUP_TIMER = 24 * 60 * 60 * 1000;        //how mucht time is between two cleanUPData()-calls - in ms (24 hours)
const MAX_LAST_ACCESS_DIFF = CLEANUP_TIMER;  //how much time must have passed since the last access before it will be deleted - in ms
function cleanUpData() {
    console.log("Starting cleanup...");

    const minLA = getTimeStamp() - MAX_LAST_ACCESS_DIFF;    //the min value of last_access for the item to not be removed; everything lower is removed
    const keysToRemove = [];
    for(const item of data.entries()) { //item: [key, value]
        if(item[1].last_access < minLA) {
            keysToRemove.push(item[0]);
        }
    }

    for(const key of keysToRemove) remove(key);

    setTimeout(() => cleanUpData(), CLEANUP_TIMER);
    console.log("Cleanup finished. Removed " + keysToRemove.length + " items, " + data.size + " items remain.");
}
//setTimeout(() => cleanUpData(), CLEANUP_TIMER);
cleanUpData();

