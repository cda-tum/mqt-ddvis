
const express = require('express');
const router = express.Router();
const dm = require('../datamanager');

/**Creates a new QDDVis-object at the server for the requester.
 *
 * Params: none, just the request is needed
 * Sends: {
 *      key - the key that allows the requester to access their object on later calls
 * }
 *
 */
router.post('/register', (req, res) => {
   const key = dm.register(req);
   res.status(200).json({ key: key });
});

/**Loads the given quantum algorithm and sends back its respective DD.
 *
 * Params: {
 *     dataKey: the key that provides access to the QDDVis-object
 *              received from the initial /register-call
 *     algo:    the quantum algorithm to load as string
 *     opNum:   the number of operations that should be iterated immediately
 *     format:  code for the format of the algorithm as integer (valid values at public/javascripts/algo_area.js)
 *     reset:   "true" for true, others for false; determines whether the algorithm should be reset (simulation starts
 *              from the beginning, opNum would then directly apply the corresponding operations) or the current simulation
 *              should stay as it is (opNum just advances the iterator and doesn't apply any operations)
 *
 *     algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 * }
 * Sends:   take a look at _sendDD documentation
 *
 */
router.post('/load', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        try {
            const algo = req.body.algo;
            const opNum = parseInt(req.body.opNum);
            const format = parseInt(req.body.format);
            const reset = req.body.reset === "true";   //whether the algorithm should be reset to the start or if iterator and current DD should stay as they are

            const algo1 = req.body.algo1 === "true";    //needed to determine the algorithm of verification

            const ret = vis.load(algo, format, opNum, reset, algo1);    //algo1 only used for verification
            if(ret.numOfOperations) {
                _sendDD(res, vis.getDD(), ret);
            } else res.status(500).json({ msg: "Error while loading the algorithm!" });

        } catch(err) {
            const retry = err.message.startsWith("Invalid algorithm!"); //if the algorithm is invalid, we need to send the last valid algorithm
            res.status(400).json({ msg: err.message, retry: retry});    //I think retry is no longer needed!
        }
    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Tries to retrieve the QDDVis-object associated with the requester and sends back its respective DD.
 *
 * Params:  the key that provides access to the QDDVis-object as query string ("?dataKey=...")
 *          received from the initial /register-call
 *
 * Sends:   take a look at _sendDD documentation
 *
 */
router.get('/getDD', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        _sendDD(res, vis.getDD());
    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Updates the export options for creating the DD from the current simulation-state.
 *
 * Params:  {
 *     dataKey:     the key that provides access to the QDDVis-object
 *                  received from the initial /register-call
 *     colored:     whether the colored-option should be used for exporting the simulation-state to DD ("true") or not (others)
 *     edgeLabels:  whether the edgeLabels-option should be used for exporting the simulation-state to DD ("true") or not (others)
 *     classic:     whether the classic-option should be used for exporting the simulation-state to DD ("true") or not (others)
 *     updateDD:    whether the DD should be sent back ("true") or not (others)
 * }
 * Sends:   take a look at _sendDD documentation
 *
 */
router.put('/updateExportOptions', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        const showColored = req.body.colored === "true";
        const showEdgeLabels = req.body.edgeLabels === "true";
        const showClassic = req.body.classic === "true";
        const updateDD = req.body.updateDD === "true";

        vis.updateExportOptions(showColored, showEdgeLabels, showClassic);

        if(vis.isReady() && updateDD) _sendDD(res, vis.getDD());
        else res.status(200).json();

    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Sets the simulation back to its start.
 *
 * Params:  the key that provides access to the QDDVis-object as query string ("?dataKey=...")
 *          received from the initial /register-call
 *
 *          algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 *
 *  Sends:   take a look at _sendDD documentation
 *          may also send back a simple message if the simulation was already at the start and therefore nothing changed
 *
 */
router.get('/tostart', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        const algo1 = req.query.algo1 === "true";    //needed to determine the algorithm of verification
        const ret = vis.toStart(algo1);             //algo1 only used for verification
        if(ret) _sendDD(res, vis.getDD());
        else res.status(403).json({ msg: "you were already at the start" });    //the client will search for res.svg, but it will be null so they won't redraw

    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Goes back to the previous step of the simulation by undoing the last processed operation.
 *
 * Params:  the key that provides access to the QDDVis-object as query string ("?dataKey=...")
 *          received from the initial /register-call
 *
 *          algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 *
 * Sends:   take a look at _sendDD documentation
 *          may also send back a simple message if the simulation was already at the start and therefore no operation
 *          was undone and nothing changed
 *
 */
router.get('/prev', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        const algo1 = req.query.algo1 === "true";    //needed to determine the algorithm of verification
        const ret = vis.prev(algo1);                 //algo1 only used for verification
        if(ret.changed) _sendDD(res, vis.getDD(), {noGoingBack: ret.noGoingBack}); //something changes so we update the shown dd
        else res.status(403).json({ msg: "can't go back because we are at the beginning" });    //the client will search for res.svg, but it will be null so they won't redraw

    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Goes to the next step of the simulation by applying the current operation.
 *
 * Params:  the key that provides access to the QDDVis-object as query string ("?dataKey=...")
 *          received from the initial /register-call
 *
 *          algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 *
 * Sends:   take a look at _sendDD documentation
 *          may also send back a simple message if the simulation was already at the end and therefore no operation
 *          was applied and nothing changed
 *
 */
router.get('/next', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        const algo1 = req.query.algo1 === "true";    //needed to determine the algorithm of verification
        const ret = vis.next(algo1);                //algo1 only used for verification

        if(ret.changed) _sendDD(res, vis.getDD(), ret); //something changes so we update the shown dd
        else res.send({ msg: "can't go ahead because we are at the end", reload: "false" });
    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

router.get('/conductIrreversibleOperation', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        let data = JSON.parse(req.query.parameter);
        const ret = vis.conductIrreversibleOperation(data);

        if (!ret.finished) {
            res.status(200).json({dot: vis.getDD(), finished: ret.finished, parameter: ret.parameter});
        } else {
            res.status(200).json({dot: vis.getDD(), finished: ret.finished});
        }
    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Goes to the end of the simulation by applying all remaining operations.
 *
 * Params:  the key that provides access to the QDDVis-object as query string ("?dataKey=...")
 *          received from the initial /register-call
 *
 *          algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 *
 * Sends:   take a look at _sendDD documentation
 *          may also send back a simple message if the simulation was already at the end and therefore nothing changed
 *
 */
router.get('/toend', (req, res) => {
    const vis = dm.get(req);
    if(vis) {
        const algo1 = req.query.algo1 === "true";    //needed to determine the algorithm of verification
        const ret = vis.toEnd(algo1);               //algo1 only used for verification
        if(ret.changed) _sendDD(res, vis.getDD(), {nops: ret.nops, nextIsIrreversible: ret.nextIsIrreversible, barrier: ret.barrier});  //sendFile(res, data.ip); //something changes so we update the shown dd
        else res.send({ msg: "you were already at the end", reload: "false" });

    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

/**Transfers the simulation to a specific position in the algorithm either by applying or undoing operations until said
 * position has been reached.
 *
 * Params:  the line at which the simulation should be after this call as query string("?line=...")
 *          the key that provides access to the QDDVis-object as query string ("&dataKey=...") - received from the initial /register-call
 *
 *          algo1:   [Verification only] "true" means that the functionality is used for algo1, "false" for algo2
 *
 * Sends:   take a look at _sendDD documentation
 *          may also send back a simple message if the simulation was already at the given line and therefore no operation
 *          was applied or undone, so nothing changed
 *
 */
router.get('/toline', (req, res) => {
    const vis = dm.get(req);
    const line = parseInt(req.query.line);
    const algo1 = req.query.algo1 === "true";    //needed to determine the algorithm of verification
    if(vis) {
        const ret = vis.toLine(line, algo1);    //algo1 only used for verification
        if(ret.changed) _sendDD(res, vis.getDD(), {nops: ret.nops, nextIsIrreversible: ret.nextIsIrreversible, noGoingBack: ret.noGoingBack, reset: ret.reset});  //something changes so we update the shown dd
        else res.send({ msg: "you were already at line " + line, reload: "false" , data: {nextIsIrreversible: ret.nextIsIrreversible, noGoingBack: ret.noGoingBack}});

    } else {
        res.status(404).json({ msg: "Your data is no longer available. Your page will be reloaded!" });
    }
});

//####################################################################################################################################################################

module.exports = router;

/**Convenience function for sending the DD to the requester.
 *
 * @param res response-object needed to send something to the requester
 * @param dd string representation of the dd in .dot-format
 * @param data some optional data some of the callers of this function need to send along with the DD
 * @private
 */
function _sendDD(res, dd, data) {
    if(data || data === 0) res.status(200).json({ dot: dd, data: data });
    else res.status(200).json({ dot: dd });
}
