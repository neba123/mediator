const pool = require("../../config/database");

module.exports = {
    create: (data, callBack) => {
        pool.query(
        `insert into results(id, content) 
            values (?,?)`,
         [
            data.id,
            JSON.stringify(data.content)
         ],
         (error, results, fields) => {
             if(error) {
                 return callBack(error);
             }
             return callBack(null, results)
         }
        );
    },
    createTestName: (data, callBack) => {
        
        console.log("----------------------------" + data.length)
        var success;
        for(value of data) {
            pool.query(
                `insert into testID(testUuid, testName, conceptClass) 
                    values (?,?,?)
                    on duplicate key update testUuid=values(testUuid), testName= values(testName), conceptClass= values(conceptClass)`,
                 [
                    value.testUuid,
                    value.testName,
                    value.conceptClass
                 ],
                 (error, results, fields) => {
                     if(error) {
                         success= false;
                         return callBack(error);
                     }
                     success= results;
                 }
                );
        }
        if(success) return callBack(null, success);
    },
    getlabResults: callBack => {
        pool.query(
            `select id,content from results`,
            [],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },
    getlabResultBylabResultID: (id, callBack ) => {
        pool.query(
            `select id,content from results where id = ?`,
            [id],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results[0]);
            }
        );
    },
    getTestDetailsByName: (testName, callBack ) => {
        //console.log("query " + testName)
        pool.query(
            `select * from testID where testName = ?`,
            [testName],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results[0]);
            }
        );
    },
    updatelabResult: (data, callBack ) => {
        pool.query(
            `update results set content=? where id=?`,
            [data.content,
            data.id
            ],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results[0]);
            }
        );
    },
    deletelabResult: (id, callBack ) => {
        pool.query(
            `delete from results where id=?`,
            [id],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results[0]);
            }
        );
    }

};