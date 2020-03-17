
const qddVis = require("./build/Release/QDD_Vis");

var data = [];

function parseIP(req) {
    return req.ip.toString().replace(/[^a-zA-Z0-9]/g, '');
}

function register(req) {
    const ip = parseIP(req);
    const exists = data.some((val, index, array) => val.ip === ip);
    if(exists) console.log(ip + " already registered!");
    else {
        console.log(ip + " registered");
        const vis = new qddVis.QDDVis(ip);
        data.push({ ip: ip, vis: vis });
    }
}

function get(req) {
    const ip = parseIP(req);
    const vis = data.find((val, index, array) => val.ip === ip);
    if(vis) return vis;
    //else console.log(key + " not found");
}

function length() {
    return data.length;
}

function printAll() {
    data.forEach((value, index, array) => {
        console.log("entry = ip: " + value.ip + "; vis: " + (value.vis));
    })
}

function remove(ip) {

}

module.exports.register = register;
module.exports.get = get;
module.exports.parseIP = parseIP;
//module.exports.length = length;

