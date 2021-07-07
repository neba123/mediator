const { 
    create, 
    createTestName,
    getlabResults, 
    getlabResultBylabResultID,
    getTestDetailsByName, 
    updatelabResult, 
    deletelabResult
} = require ("./labresults.service");

module.exports = {
    createlabResult: (req,res) => {
        const body= req.body;
        console.log (body);
        create(body, (err, results) => {
            if(err) {
                console.log("ERROR ====>" + err);
                return res.status(500).json({
                    success: 0,
                    message: "Database connection error"
                });
            }
            return res.status(200).json({
                success:1,
                data: results
            });
        });
    },
    createTestDetails: (req,res) => {
        const body= req.body;
        const testItem = body.testNameArray;
        console.log ("================" + JSON.stringify(testItem));
        createTestName(testItem, (err, results) => {
            if(err) {
                console.log("ERROR ====>" + err);
                return res.status(500).json({
                    success: 0,
                    message: "Database connection error"
                });
            }
            return res.status(200).json({
                success:1,
                data: results
            });
        });
    },
    getlabResultBylabResultID: (req,res) => {
        const id= req.params.id;
        getlabResultBylabResultID(id, (err, results) =>{
            if(err) {
                console.log(err);
                return;
            }
            if(!results){
                return res.json({
                    success: 0,
                    message: "Record not found"
                });
            }
            return res.json({
                success: 1,
                data: JSON.parse(results.content)
            });
        });
    },
    getTestDetailsByName: (req,res) => {
        const testName= req.params.testName;
        //console.log('1111111111 = > ' + testName)
        getTestDetailsByName(testName, (err, results) =>{
            if(err) {
                console.log(err);
                return;
            }
            if(!results){
                return res.json({
                    success: 0,
                    message: "Record do not found"
                });
            }
            return res.json({
                success: 1,
                data: results
            });
        });
    },
    getlabResults: (req,res) => {
        getlabResults((err, results) =>{
            if(err) {
                console.log(err);
                return;
            }
            return res.json({
                success: 1,
                data: results
            });
        });
    },
    updatelabResults: (req, res) => {
        const body = req.body;
        updatelabResult(body, (err, results) => {
            if(err){
                console.log(err);
                return false;
            }
            if(!results) {
                return res.json({
                    success: 0,
                    message: "Failed to update user"
                });
            }
            return res.json({
                success: 1,
                message: "update successfully"
            });
        });
    },
    deletelabResult: (req, res) => {
        const id= req.params.id;
        deletelabResult(id, (err, results) => {
            if(err){
                console.log(err);
                return;
            }
            if(!results){
                return res.json({
                    sucess: 0,
                    message: "Record not found"
                });
            }
            return res.json ({
                success: 1,
                message: "User deleted successfully"
            });
        });
    }
};