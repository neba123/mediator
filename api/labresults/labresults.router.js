const {createlabResult , 
    getlabResultBylabResultID,
    getlabResults,
    updatelabResults,
    deletelabResult
 } = require("./labresults.controller");

const router = require("express").Router();

router.post("/", createlabResult);
router.get("/", getlabResults);
router.get("/:id", getlabResultBylabResultID);
router.patch("/", updatelabResults);
router.delete("/:id", deletelabResult);


module.exports = router;