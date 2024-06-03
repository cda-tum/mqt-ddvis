const qddVis = require("./build/Release/mqt-ddvis");

//const data = new Map(); //saves the QDDVis-objects needed for simulation

class DataManager {
  constructor(objCode) {
    this._data = new Map();
    this._objCode = objCode;
  }

  get data() {
    return this._data;
  }

  get objCode() {
    return this._objCode;
  }

  addObject(key) {
    let obj;
    if (this._objCode === 1) obj = new qddVis.QDDVer();
    else obj = new qddVis.QDDVis(key);

    this._data.set(key, {
      //save:
      vis: obj, //the actual object needed for the simulation
      last_access: _getTimeStamp(), //a time stamp to determine "old" entries that can be deleted safely
    });
  }
}

const manager = new Map();
manager.set("sim", new DataManager(0));
manager.set("ver", new DataManager(1));

/**Retrieves the key for data based on the request.
 *
 * @param req request of a client-call to the server
 * @returns {string} the key to access the QDDVis-object associated with the requester
 */
function _getKey(req) {
  let dataKey;

  //different API-calls can have a different request-structure
  if (req.dataKey) dataKey = req.dataKey;
  else if (req.query.dataKey) dataKey = req.query.dataKey;
  else if (req.body.dataKey) dataKey = req.body.dataKey;

  return dataKey;
}

/**Retrieves the dataManager that stores the data needed by the requester.
 *
 * @param req request of a client-call to the server
 * @returns {DataManager} the dataManager associated with the request
 * @private
 */
function _getTargetManager(req) {
  let managerId = "sim"; //take sim per default for back-compatability;

  //different API-calls can have a different request-structure
  if (req.targetManager) managerId = req.targetManager;
  else if (req.query.targetManager) managerId = req.query.targetManager;
  else if (req.body.targetManager) managerId = req.body.targetManager;

  return manager.get(managerId);
}

/**Creates a key based on the requester's ip address and a random value
 *
 * @param req request of a client-call to the server
 * @returns {string} the key to access the QDDVis-object associated with the requester
 * @private
 */
function _createKey(req) {
  let ipPart = "0";
  //retrieves the ip-address of the client (doesn't work on localhost somehow)
  if (req.headers["x-forwarded-for"])
    ipPart = req.headers["x-forwarded-for"].split(",")[0];

  const randPart = String(Math.random()).substr(2); //remove the 0. at the beginning
  return ipPart + randPart;
}

/**Convenience function to get the current time.
 *
 * @returns {number} a value representing the point in time the function was called at
 */
function _getTimeStamp() {
  return Date.now();
}

/**Registers the requester by creating a QDDVis-object for them.
 *
 * @param req request of a client-call to the server
 * @returns {string} the key to allow the requester access to their respective QDDVis-object on later calls
 */
function register(req) {
  const key = _createKey(req);

  //create an object in every dataManager the requester might need
  for (const item of manager) {
    //item: [key, value]
    const m = item[1];
    m.addObject(key);
  }
  /*
    data.set(key, {                 //save:
        vis: vis,                       //the actual object needed for the simulation
        last_access: _getTimeStamp()    //a time stamp to determine "old" entries that can be deleted safely
    });
    */
  return key;
}

/**Returns the QDDVis-object that is associated with the requester if one exists. (else null is returned)
 * Updates the last_access time-stamp since there was an interaction with the object.
 *
 * @param req request of a client-call to the server
 * @returns {qddVis.QDDVis} or {qddVis.QDDVer} one of the objects associated with the requester
 */
function get(req) {
  const key = _getKey(req);
  const dataManager = _getTargetManager(req);
  const item = dataManager.data.get(key);
  if (item) {
    item.last_access = _getTimeStamp(); //update the last time the item was accessed
    return item.vis;
  }
}

//external scripts may only register/create and request/get objects
module.exports.register = register;
module.exports.get = get;
//allowing external removing may also make sense, but this isn't needed at the moment

const CLEANUP_TIMER = 24 * 60 * 60 * 1000; //how much time passes between two cleanUPData()-calls - in ms (24 hours at the moment)
const MAX_LAST_ACCESS_DIFF = CLEANUP_TIMER; //how much time must have passed since the last access before it will be deleted - in ms
/**Cleans data by removing "old" entries. An entry is considered "old" if its last access was more than
 * MAX_LAST_ACCESS_DIFF ms in the past.
 * Logs the start of the process and its result (how many have been removed, how many remain).
 *
 * @private no external scripts may interfere with the cleanup-process
 */
function _cleanUpData() {
  console.log("Starting cleanup...");

  const minLA = _getTimeStamp() - MAX_LAST_ACCESS_DIFF; //the min value of last_access for the item to not be
  // removed; everything lower is removed
  for (const entry of manager.entries()) {
    //entry: [key, value]
    const dm = entry[1];
    //cleanup all dataManagers
    const keysToRemove = []; //save the keys of the objects we want to remove because we
    // can't alter the map while iterating it
    for (const item of dm.data.entries()) {
      //item: [key, value]
      if (item[1].last_access < minLA) {
        keysToRemove.push(item[0]);
      }
    }

    //remove all "old" entries
    for (const key of keysToRemove) dm.data.delete(key);
  }

  setTimeout(() => _cleanUpData(), CLEANUP_TIMER); //call the function again at a later time
  console.log("Cleanup finished."); // Removed " + keysToRemove.length + " items, " + data.size + " items remain.");
}
//initiate the future cleanup
setTimeout(() => _cleanUpData(), CLEANUP_TIMER);
//no initial cleanup needed since data has just been assigned to new Map()
