const {createlabResult , 
    createTestDetails,
    getlabResultBylabResultID,
    getlabResults,
    getTestDetailsByName,
    updatelabResults,
    deletelabResult
 } = require("./labresults.controller");

const router = require("express").Router();

router.post("/", createlabResult);
router.post("/insertTestName", createTestDetails);
router.get("/", getlabResults);
router.get("/:id", getlabResultBylabResultID);
router.get("/getTestName/:testName", getTestDetailsByName);
router.patch("/", updatelabResults);
router.delete("/:id", deletelabResult);


module.exports = router;