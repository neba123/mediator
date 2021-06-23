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
            `select content from results where id = ?`,
            [id],
            (error, results, fields) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, JSON.parse(results[0].content));
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