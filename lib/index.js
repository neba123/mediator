#!/usr/bin/env node
'use strict'
const mllp = require('./mllp');
const express = require('express');
const medUtils = require('openhim-mediator-utils');
const winston = require('winston');
const utils = require('./utils');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const date = require('date-and-time');
const xml2js = require('xml2js');
const xmlParser = require('express-xml-bodyparser')
var http = require("http");

require('body-parser-xml')(bodyParser);

require("dotenv").config();
const labResultsRouter = require("../api/labresults/labresults.router");

const fs = require('fs');

// Logging setup
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {level: 'info', timestamp: true, colorize: true});

// Config setup
let config = {}; // this will vary depending on whats set in openhim-core
const apiConf = process.env.NODE_ENV === 'test' ? require('../config/test') : require('../config/config');
const mediatorConfig = require('../config/mediator');

const { response } = require('express');


let port = 3001;

/**
 * setupApp - configures the http server for this mediator
 *
 * @return {express.App}  the configured http server
 */
function setupApp () {
  const app = express()
  app.use(bodyParser.json());
  app.use(express.json());
  app.use(xmlParser());
  app.use("/api/labresults", labResultsRouter);

  var encodedDHIS2 = utils.doencodeDHIS2()
  var mllp = require('./mllp.js');
  var server = new mllp.MLLPServer('192.168.0.163', 4422)
  var iclserver = new mllp.MLLPServer('192.168.0.163', 5533)

 app.post('/labResultsID', async (req, res) => {
   try{
     let accessionID= req.body;
    console.log("AccessionID id" + accessionID.id);
     return res.json({
      "success": "1",
      "data": accessionID.id
      });
   }
   catch(err){
    return res.json({
      "success": "0",
      "data": err
      });
   }
 })

  app.post('/laborder', async (req, res) => {
    let order = req.body;
    try {
        let msh, pid, orc, pv1, order_all='', test_ordered='';
        let obr = [];
       
        msh = "MSH|^~\\&|EMR|Yekatit|POLYTECH|LAB1|" + 
        (order[mediatorConfig.config.messagedatetime] === undefined ? "202101010101" : order[mediatorConfig.config.messagedatetime]) + 
        "||ORM^O01|1|P|2.3|||";
       
        pid = "PID|1|" + 
        (order[mediatorConfig.config.externalpatientid] === undefined ? "" : order[mediatorConfig.config.externalpatientid]) + "|" + 
        (order[mediatorConfig.config.labassignedpatientid] === undefined ? "" : order[mediatorConfig.config.labassignedpatientid]) + "||" + 
        (order[mediatorConfig.config.patientname] === undefined ? "" : order[mediatorConfig.config.patientname]) +  "||" + 
        (order[mediatorConfig.config.patientbdate] === undefined ? "" : order[mediatorConfig.config.patientbdate]) + "|" + 
        (order[mediatorConfig.config.patientsex] === undefined ? "N" : utils.sexInitial(order[mediatorConfig.config.patientsex])) + "|||" + 
        (order[mediatorConfig.config.patientHouseNo] === undefined ? "" : order[mediatorConfig.config.patientHouseNo]) + " , " + 
        (order[mediatorConfig.config.patientKebele] === undefined ? "" : order[mediatorConfig.config.patientKebele]) + " , " + 
        (order[mediatorConfig.config.patientWoreda] === undefined ? "" : order[mediatorConfig.config.patientWoreda]) + " , " +
        (order[mediatorConfig.config.patientcity] === undefined ? "" : order[mediatorConfig.config.patientcity]) +  "|" +
        (order[mediatorConfig.config.patientstate] === undefined ? "" : order[mediatorConfig.config.patientstate]) + "|" + 
        (order[mediatorConfig.config.patientphone] === undefined ? "" : utils.adaptPhone(order[mediatorConfig.config.patientphone])) + "|||||||||||||||" +
        (order[mediatorConfig.config.patientNationality] === undefined ? "" : order[mediatorConfig.config.patientNationality]) + "|||"

        pv1 = "PV1||||||" + 
        (order[mediatorConfig.config.priorlocation] === undefined ? "" : order[mediatorConfig.config.priorlocation]) +  "|^" + 
        (order[mediatorConfig.config.attendingphysician] === undefined ? "" : order[mediatorConfig.config.attendingphysician]) +  "||"  

        orc = "ORC|NW|" + 
        (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid])+ "|||||||" +
        (order[mediatorConfig.config.specimencollectiondatetime]  === undefined ? "" : order[mediatorConfig.config.specimencollectiondatetime])+ "|||" +
        (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||IP|||" 

        order_all = msh + "\r" + pid + "\r" + pv1+ "\r" + orc   
         
        test_ordered= (order[mediatorConfig.config.testOrdered] === undefined ? "" : order[mediatorConfig.config.testOrdered])
        if(test_ordered.length > 0) {
          
          for(var i=1; (i<test_ordered.length+1); i++){          
            obr[i-1] = "OBR|" + i + "||" + 
            (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid]) + "|" + test_ordered[i-1] + "|" +
            (order[mediatorConfig.config.priority] === undefined ? "R" : order[mediatorConfig.config.priority]) + "||" + 
            (order[mediatorConfig.config.specimencollectiondatetime] === undefined ? "" :  order[mediatorConfig.config.specimencollectiondatetime]) + "||" + 
            (order[mediatorConfig.config.category] === undefined ? "" : order[mediatorConfig.config.category]) +  "|||||" +
            (order[mediatorConfig.config.specimenreceiveddatetime] === undefined ? "" : order[mediatorConfig.config.specimenreceiveddatetime]) +  "|||||||||||F|||||||||" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||||||||" + 
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" + 
            (order[mediatorConfig.config.priorlocation] === undefined ? "" : order[mediatorConfig.config.priorlocation]) + "|" 
            order_all += "\r" + obr[i-1]      
          }
        }
        else{
          console.log("No test record in the lab order file")
        }

        console.log("HLT Order Format-------" + order_all)
        try{
          server.send('192.168.0.139', 15000 , order_all, await function (err, ackData) {         
            // async callback code here
            if(err) {
              res.send("error : received but not entered into polytech");
            }
            else {
              console.log('successful HL7 format');
              res.send("success");
            }
          })
        }
        catch(err){
          console.log('error message ' + err.message);
          res.send("Error while sending the data to PolyTech");
          return;
        }
        

    }
    catch (err){
      res.send("Error while mapping the json file to hl7");
      return;
    }
  })

  app.post('/laborder3', async (req, res) => {
  //app.post('/laborder3', function(req, res) {

    let order = req.body
    let ecncounterDetails= order[mediatorConfig.config.xml_header]
    let orders = ecncounterDetails.encountertransaction[0].orders[0]
    let patientid = ecncounterDetails.patientid[0]
    let encountertype = ecncounterDetails.encountertype[0]
    let locationname = ecncounterDetails.encountertransaction[0].locationname
    let locationuuid = ecncounterDetails.encountertransaction[0].locationuuid
    let visituuid = ecncounterDetails.encountertransaction[0].visituuid
    let encounteruuid = ecncounterDetails.encountertransaction[0].encounteruuid
    let patientuuid = ecncounterDetails.encountertransaction[0].patientuuid
    let encdatetime = ecncounterDetails.encountertransaction[0].encounterdatetime[0] 
    let providers = ecncounterDetails.encountertransaction[0].providers[0] 
    let orderdetail = [], conc = [], testname =[], order_urgency = [],  orderdatetime, providername, providerinfo;
    let concept_uuid, concept_name, order_uuid = [], order_ordertype = [], order_ordernumber = [], order_action = []
    
    orderdatetime = encdatetime["_"]
    providerinfo = providers["org.openmrs.module.emrapi.encounter.domain.encountertransaction_-provider"]
    providername = providerinfo[0].name
    console.log("provider name : " + providername)

    orderdetail = orders[mediatorConfig.config.order_header]

    let order_array = [], test_ordered = []
    let order_json
    for(var i=0; (i<orderdetail.length); i++){ 
      if(i == 0 ){
        order_json = '[{'
      }
      else {
        order_json += ',{'
      }
      order_uuid= orderdetail[i].uuid
      order_json += '"orderuuid' + '" : "' + order_uuid[0] + '", '
      order_ordertype= orderdetail[i].ordertype
      order_json += '"ordertype' + '" : "' + order_ordertype[0]+ '", '
      order_ordernumber= orderdetail[i].ordernumber
      order_json += '"ordernumber' + '" : "' + order_ordernumber[0]+ '", '
      order_action= orderdetail[i].action
      order_json += '"orderaction' + '" : "' + order_action[0]+ '", '
      order_urgency= orderdetail[i].urgency
      order_json += '"orderurgency' + '" : "' + order_urgency[0]+ '", '
      conc = orderdetail[i].concept
      test_ordered [i] = conc[0].name
      order_json += '"testname' + '" : "' + conc[0].name + '"'
      /*if(i+1 < orderdetail.length)
          order_json += '}'
      else*/
      order_json += '}'
      //order_array[i] = order_json
      //console.log("++++++++++++++ " + order_array[i] + "\n")
    }
    order_json += ']'
    let data_json = '{'

    data_json += '"patientid' + '" : "' + patientid + '", '
    data_json += '"encountertype' + '" : "' + encountertype + '", '
    data_json += '"visituuid' + '" : "' + visituuid + '", '
    data_json += '"encounteruuid' + '" : "' + encounteruuid + '", '
    data_json += '"locationname' + '" : "' + locationname + '", '
    data_json += '"locationuuid' + '" : "' + locationuuid + '", '
    data_json += '"encounterdatetime' + '" : "' + orderdatetime + '", '
    data_json += '"patientuuid' + '" : "' + patientuuid + '", '
    data_json += '"providername' + '" : "' + providername + '", '
    data_json += '"encountertype' + '" : "' + encountertype + '", '
    data_json += '"orders' + '" : ' + order_json 
    data_json += '}'

    console.log(data_json)
    try{
        
        let msh, pid, orc, pv1, order_all=''
        let obr = [];
       
        msh = "MSH|^~\\&|EMR|AaBET|POLYTECH|LAB1|" + orderdatetime + "||ORM^O01|1|P|2.3|||";

        pid = "PID|1|" + 
        patientid + "|" + 
        patientid + "||" + 
        (order[mediatorConfig.config.patientname] === undefined ? "" : order[mediatorConfig.config.patientname]) +  "||" + 
        (order[mediatorConfig.config.patientbdate] === undefined ? "" : order[mediatorConfig.config.patientbdate]) + "|" + 
        (order[mediatorConfig.config.patientsex] === undefined ? "N" : utils.sexInitial(order[mediatorConfig.config.patientsex])) + "|||" + 
        (order[mediatorConfig.config.patientHouseNo] === undefined ? "" : order[mediatorConfig.config.patientHouseNo]) + " , " + 
        (order[mediatorConfig.config.patientKebele] === undefined ? "" : order[mediatorConfig.config.patientKebele]) + " , " + 
        (order[mediatorConfig.config.patientWoreda] === undefined ? "" : order[mediatorConfig.config.patientWoreda]) + " , " +
        (order[mediatorConfig.config.patientcity] === undefined ? "" : order[mediatorConfig.config.patientcity]) +  "|" +
        (order[mediatorConfig.config.patientstate] === undefined ? "" : order[mediatorConfig.config.patientstate]) + "|" + 
        (order[mediatorConfig.config.patientphone] === undefined ? "" : utils.adaptPhone(order[mediatorConfig.config.patientphone])) + "|||||||||||||||" +
        (order[mediatorConfig.config.patientNationality] === undefined ? "" : order[mediatorConfig.config.patientNationality]) + "|||"

        pv1 = "PV1||||||" + 
        locationname +  "|^" + 
        providername +  "||"  

        orc = "ORC|NW|" + 
        (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid])+ "|||||||" +
        (order[mediatorConfig.config.specimencollectiondatetime]  === undefined ? "" : order[mediatorConfig.config.specimencollectiondatetime])+ "|||" +
        (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||IP|||" 

        order_all = msh + "\r" + pid + "\r" + pv1+ "\r" + orc   
        
        for(var i=1; (i<test_ordered.length+1); i++){          
            obr[i-1] = "OBR|" + i + "||" + 
            (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid]) + "|" + test_ordered[i-1] + "|" +
            (order[mediatorConfig.config.priority] === undefined ? "R" : order[mediatorConfig.config.priority]) + "||" + 
            (order[mediatorConfig.config.specimencollectiondatetime] === undefined ? "" :  order[mediatorConfig.config.specimencollectiondatetime]) + "||" + 
            (order[mediatorConfig.config.category] === undefined ? "" : order[mediatorConfig.config.category]) +  "|||||" +
            (order[mediatorConfig.config.specimenreceiveddatetime] === undefined ? "" : order[mediatorConfig.config.specimenreceiveddatetime]) +  "|||||||||||F|||||||||" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||||||||" + 
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" + 
            (order[mediatorConfig.config.priorlocation] === undefined ? "" : order[mediatorConfig.config.priorlocation]) + "|" 
            order_all += "\r" + obr[i-1]      
        }


        console.log("HLT Order Format-------" + order_all)
        try{
          server.send('192.168.0.139', 15000 , order_all, await function (err, ackData) {         
            // async callback code here
            if(err) {
              res.send("error : received but not entered into polytech");
            }
            else {
              console.log('successful HL7 format');
              res.send("success");
            }
          })
        }
        catch(err){
          console.log('error message ' + err.message);
          res.send("Error while sending the data to PolyTech");
          return;
        }


    }
    catch (err){
      res.send("Error while mapping the json file to hl7");
      return;
    }


  })

  app.post('/laborder2', async (req, res) => {
    let order = req.body;
    console.log("received xml file" + order)
    try {
    // convert XML to JSON
    var cleanedString = order.replace("\\ufeff", "");
    xmlParser.parseString(order, (err, result) => {
      console.log('test')
      if(err) {
        console.log('test 2' + err)
          throw err;
    }

    // `result` is a JavaScript object
    // convert it to a JSON string
    console.log('test 3')
    const json = JSON.stringify(result, null, 4);

    // log JSON string
    console.log(json);
      
    });
    }
    catch (err){
      res.send("Error while mapping the xml file to json");
      return;
    }
    /*try {
        let msh, pid, orc, pv1, order_all='', test_ordered='';
        let obr = [];
       
        msh = "MSH|^~\\&|EMR|Yekatit|POLYTECH|LAB1|" + 
        (order[mediatorConfig.config.messagedatetime] === undefined ? "202101010101" : order[mediatorConfig.config.messagedatetime]) + 
        "||ORM^O01|1|P|2.3|||";
       
        pid = "PID|1|" + 
        (order[mediatorConfig.config.externalpatientid] === undefined ? "" : order[mediatorConfig.config.externalpatientid]) + "|" + 
        (order[mediatorConfig.config.labassignedpatientid] === undefined ? "" : order[mediatorConfig.config.labassignedpatientid]) + "||" + 
        (order[mediatorConfig.config.patientname] === undefined ? "" : order[mediatorConfig.config.patientname]) +  "||" + 
        (order[mediatorConfig.config.patientbdate] === undefined ? "" : order[mediatorConfig.config.patientbdate]) + "|" + 
        (order[mediatorConfig.config.patientsex] === undefined ? "N" : utils.sexInitial(order[mediatorConfig.config.patientsex])) + "|||" + 
        (order[mediatorConfig.config.patientHouseNo] === undefined ? "" : order[mediatorConfig.config.patientHouseNo]) + " , " + 
        (order[mediatorConfig.config.patientKebele] === undefined ? "" : order[mediatorConfig.config.patientKebele]) + " , " + 
        (order[mediatorConfig.config.patientWoreda] === undefined ? "" : order[mediatorConfig.config.patientWoreda]) + " , " +
        (order[mediatorConfig.config.patientcity] === undefined ? "" : order[mediatorConfig.config.patientcity]) +  "|" +
        (order[mediatorConfig.config.patientstate] === undefined ? "" : order[mediatorConfig.config.patientstate]) + "|" + 
        (order[mediatorConfig.config.patientphone] === undefined ? "" : utils.adaptPhone(order[mediatorConfig.config.patientphone])) + "|||||||||||||||" +
        (order[mediatorConfig.config.patientNationality] === undefined ? "" : order[mediatorConfig.config.patientNationality]) + "|||"

        pv1 = "PV1||||||" + 
        (order[mediatorConfig.config.priorlocation] === undefined ? "" : order[mediatorConfig.config.priorlocation]) +  "|^" + 
        (order[mediatorConfig.config.attendingphysician] === undefined ? "" : order[mediatorConfig.config.attendingphysician]) +  "||"  

        orc = "ORC|NW|" + 
        (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid])+ "|||||||" +
        (order[mediatorConfig.config.specimencollectiondatetime]  === undefined ? "" : order[mediatorConfig.config.specimencollectiondatetime])+ "|||" +
        (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||IP|||" 

        order_all = msh + "\r" + pid + "\r" + pv1+ "\r" + orc   
         
        test_ordered= (order[mediatorConfig.config.testOrdered] === undefined ? "" : order[mediatorConfig.config.testOrdered])
        if(test_ordered.length > 0) {
          
          for(var i=1; (i<test_ordered.length+1); i++){          
            obr[i-1] = "OBR|" + i + "||" + 
            (order[mediatorConfig.config.specimenid] === undefined ? "" : order[mediatorConfig.config.specimenid]) + "|" + test_ordered[i-1] + "|" +
            (order[mediatorConfig.config.priority] === undefined ? "R" : order[mediatorConfig.config.priority]) + "||" + 
            (order[mediatorConfig.config.specimencollectiondatetime] === undefined ? "" :  order[mediatorConfig.config.specimencollectiondatetime]) + "||" + 
            (order[mediatorConfig.config.category] === undefined ? "" : order[mediatorConfig.config.category]) +  "|||||" +
            (order[mediatorConfig.config.specimenreceiveddatetime] === undefined ? "" : order[mediatorConfig.config.specimenreceiveddatetime]) +  "|||||||||||F|||||||||" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" +
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|||||||||||" + 
            (order[mediatorConfig.config.physicianlastname] === undefined ? "" : order[mediatorConfig.config.physicianlastname]) + "|" + 
            (order[mediatorConfig.config.priorlocation] === undefined ? "" : order[mediatorConfig.config.priorlocation]) + "|" 
            order_all += "\r" + obr[i-1]      
          }
        }
        else{
          console.log("No test record in the lab order file")
        }

        console.log("HLT Order Format-------" + order_all)
        try{
          server.send('192.168.0.139', 15000 , order_all, await function (err, ackData) {         
            // async callback code here
            if(err) {
              res.send("error : received but not entered into polytech");
            }
            else {
              console.log('successful HL7 format');
              res.send("success");
            }
          })
        }
        catch(err){
          console.log('error message ' + err.message);
          res.send("Error while sending the data to PolyTech");
          return;
        }
        

    }
    catch (err){
      res.send("Error while mapping the xml file to json");
      return;
    }*/
  })

  app.post('/labresult3', async (req, res) => {
    console.log("Result MSH 0")
    app.use(bodyParser.json());
    let order_data, indexes, fileID
    console.log("Result MSH 1")

    try{

      let order_array = req.body;
      let msh = order_array.msh, pid = order_array.pid, pv1 = order_array.pv1, orc = order_array.orc, obx = order_array.obx;
      let uchem = order_array.uchem
      let cbc_b = order_array.cbc_b

      console.log("Result MSH 2")
      let msh_array = msh.split("|")
      indexes = utils.entryIndexes("msh")
      console.log("Result MSH 3")
     // let created = utils.formatDateTime(msh_array[indexes.created])
      let created = msh_array[indexes.created]
    //  let result_msh = '"orgUnit": "' + msh_array[indexes.orgUnit] + '", "receiving_laboratory": "' + msh_array[indexes.receiving_laboratory] +
     //                   '", "message_date_time": "' + created + '"';
      let result_msh = '"message_date_time" : "' + created + '"';
      console.log("Result MSH 4")

      let pid_array = pid.split("|")
      indexes = utils.entryIndexes("pid")
      //let name_array = pid_array[indexes.name].split("^")
     // let address_array = pid_array[indexes.address].split("^")
     // let date_of_birth = utils.formatDate(pid_array[indexes.date_of_birth])
     // let phone = utils.formatPhone(pid_array[indexes.phone_local])
     
      fileID = pid_array[indexes.patient_id];
      let result_pid = '"patient_id": "' + pid_array[indexes.patient_id] + '", "patient_name": "' + pid_array[indexes.patient_name] + 
                        '", "patient_sex": "' + pid_array[indexes.sex] + '"';

      /*let orc_array = orc.split("|")
      indexes = utils.entryIndexes("orc")

      let sample_id = orc_array[indexes.sample_id]
      result_pid +=', "sample_id": "' + sample_id + '"'  */                          
      
      console.log("Result PID 5")

      let cbc_array = cbc_b.split("|")
      console.log("Result PID 5.0")
      indexes = utils.entryIndexes("cbc_b")

      console.log("Result PID 5.1")
      let uchem_array = uchem.split("|")
      console.log("Result PID 5.2")
      indexes = utils.entryIndexes("uchem")
      console.log("Result PID 5.3")
      result_pid += ', "CBC": ' + '{ "Test_Time": "'  + cbc_array[indexes.time_result_issued]  + '"'
      console.log("Result PID 5.4")
      result_pid += ', "WBC": "' + order_array.wbc + '"'
      result_pid += ', "RBC": "' + order_array.rbc + '"'
      result_pid += ', "HGB": "' + order_array.hgb + '"'
      result_pid += ', "HCT": "' + order_array.hct + '"'
      result_pid += ', "MCV": "' + order_array.mcv + '"'
      result_pid += ', "MCH": "' + order_array.mch + '"'
      result_pid += ', "MCHC": "' + order_array.mchc + '"'
      result_pid += ', "RDW": "' + order_array.rdw + '"'
      result_pid += ', "PLT": "' + order_array.plt + '"'
      result_pid += ', "MPV": "' + order_array.mpv + '"'
      result_pid += ', "NE": "' + order_array.ne + '"'
      result_pid += ', "LY": "' + order_array.ly + '"'
      result_pid += ', "MO": "' + order_array.mo + '"'
      result_pid += ', "EO": "' + order_array.eo + '"'
      result_pid += ', "BA": "' + order_array.ba + ''
      result_pid += '"}'

      /*let uchem_json = '{'
      uchem_json += '"test_time": "' + uchem_array[indexes.time_result_issued] + '"'
      uchem_json += ',"WBC": "' + order_array.wbc + '"'
      uchem_json += ',"RBC": "' + order_array.rbc + '"'
      uchem_json = '}' 

      result_pid += ',"Chemical Test": "' + '{ "test_time": "'  + uchem_array[indexes.time_result_issued] + '"'
      result_pid += ',"WBC": "' + 3 + '"'
      result_pid += ',"RBC": "' + order_array.rbc + '"'
      result_pid = '}'   */
      result_pid += ', "Chemical Test": ' + '{ "Test_Time": "'  + uchem_array[indexes.time_result_issued]  + '"'
      result_pid += ', "PH": "' + order_array.ph + '"'
      result_pid += ', "S.GR": "' + order_array.sgr + '"'
      result_pid += ', "PRO": "' + order_array.pro + '"' 
      result_pid += ', "GLU": "' + order_array.glu + '"'
      result_pid += ', "KETONE": "' + order_array.ketone + '"'
      result_pid += ', "LEUKOC": "' + order_array.leukoc + '"'
      result_pid += ', "NITRAT": "' + order_array.nitrat + '"'
      result_pid += ', "BLOOD": "' + order_array.blood + '"'
      result_pid += ', "BILIRU": "' + order_array.biliru + '"'
      result_pid += ', "UROBIL": "' + order_array.urobil + ''
      result_pid += '"}'

      
      console.log("Result 6" + fileID)
      let result_string = '{' + result_msh + "," + result_pid + '}';
      console.log("Result 7" + result_string)

      let result_json = JSON.parse(result_string)
      console.log("Result 8" + result_json)

      let result_str = JSON.stringify(result_json);
      console.log('FILE ID' + fileID);
      var filename='';
      try {
        filename = '/home/neba123/EMRPOLYTECH/result/' + fileID + '.' + 'json';
        console.log(filename);
        fs.writeFile(filename, result_str, (err) => {
          if (err) {
              throw err;
          }
          console.log("File is updated.");
        });
        res.send ("Success");
      }
      catch (err){
        res.send("Error while storing mapped data to json file" + err);
        return;
      }

    }
    catch(err){
      res.send("Error while mapping the hl7 file to json");
      return;
    }

  })
  app.post('/labresult', async (req, res) => {
    console.log("Result MSH 0")
    app.use(bodyParser.json());
    let order_data, indexes, fileID
    console.log("Result MSH 1")
    let order_array = req.body;

    try{

      let order_array = req.body;
      let msh = order_array.msh, pid = order_array.pid, pv1 = order_array.pv1, orc = order_array.orc, obx = order_array.obx;
      let uchem = order_array.uchem
      let cbc_b = order_array.cbc_b


      let msh_array = msh.split("|")
      indexes = utils.entryIndexes("msh")

     // let created = utils.formatDateTime(msh_array[indexes.created])
      let created = msh_array[indexes.created]
    //  let result_msh = '"orgUnit": "' + msh_array[indexes.orgUnit] + '", "receiving_laboratory": "' + msh_array[indexes.receiving_laboratory] +
     //                   '", "message_date_time": "' + created + '"';
      let result_msh = '"message_date_time" : "' + created + '"';
      console.log("Result MSH " + result_msh)

     let pid_array = pid.split("|")
      indexes = utils.entryIndexes("pid")
      //let name_array = pid_array[indexes.name].split("^")
     // let address_array = pid_array[indexes.address].split("^")
     // let date_of_birth = utils.formatDate(pid_array[indexes.date_of_birth])
     // let phone = utils.formatPhone(pid_array[indexes.phone_local])
     
      fileID = pid_array[indexes.patient_id];
      let result_pid = '"patient_id": "' + pid_array[indexes.patient_id] + '", "patient_name": "' + pid_array[indexes.patient_name] + 
                        '", "patient_sex": "' + pid_array[indexes.sex] + '"';                     
 /*      
      console.log("Result PID 5")

      let cbc_array = cbc_b.split("|")
      console.log("Result PID 5.0")
      indexes = utils.entryIndexes("cbc_b")

      console.log("Result PID 5.1")
      let uchem_array = uchem.split("|")
      console.log("Result PID 5.2")
      indexes = utils.entryIndexes("uchem")
      console.log("Result PID 5.3")
      result_pid += ', "CBC": ' + '{ "Test_Time": "'  + cbc_array[indexes.time_result_issued]  + '"'
      console.log("Result PID 5.4")
      result_pid += ', "WBC": "' + order_array.wbc + '"'
      result_pid += ', "RBC": "' + order_array.rbc + '"'
      result_pid += ', "HGB": "' + order_array.hgb + '"'
      result_pid += ', "HCT": "' + order_array.hct + '"'
      result_pid += ', "MCV": "' + order_array.mcv + '"'
      result_pid += ', "MCH": "' + order_array.mch + '"'
      result_pid += ', "MCHC": "' + order_array.mchc + '"'
      result_pid += ', "RDW": "' + order_array.rdw + '"'
      result_pid += ', "PLT": "' + order_array.plt + '"'
      result_pid += ', "MPV": "' + order_array.mpv + '"'
      result_pid += ', "NE": "' + order_array.ne + '"'
      result_pid += ', "LY": "' + order_array.ly + '"'
      result_pid += ', "MO": "' + order_array.mo + '"'
      result_pid += ', "EO": "' + order_array.eo + '"'
      result_pid += ', "BA": "' + order_array.ba + ''
      result_pid += '"}'


      result_pid += ', "Chemical Test": ' + '{ "Test_Time": "'  + uchem_array[indexes.time_result_issued]  + '"'
      result_pid += ', "PH": "' + order_array.ph + '"'
      result_pid += ', "S.GR": "' + order_array.sgr + '"'
      result_pid += ', "PRO": "' + order_array.pro + '"' 
      result_pid += ', "GLU": "' + order_array.glu + '"'
      result_pid += ', "KETONE": "' + order_array.ketone + '"'
      result_pid += ', "LEUKOC": "' + order_array.leukoc + '"'
      result_pid += ', "NITRAT": "' + order_array.nitrat + '"'
      result_pid += ', "BLOOD": "' + order_array.blood + '"'
      result_pid += ', "BILIRU": "' + order_array.biliru + '"'
      result_pid += ', "UROBIL": "' + order_array.urobil + ''
      result_pid += '"}'

      
      console.log("Result 6" + fileID)*/
      let result_string = '{' + result_msh + "," + result_pid + '}';
     
     // let result_string = '{' + result_msh + '}';
      let lab_results =  '{ "id": ' + '"' + fileID + '"' +',' + ' "content": ' + '[' + 
      result_string  + ']' +' }';

       console.log("-------------------" + lab_results)

      var post_options = {
        host: '192.168.0.163',
        port: '3001',
        path: '/api/labresults',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(lab_results)
        }
       };
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^7")
                // Set up the request
      var post_req = http.request(post_options, function(res) {
          //res.setEncoding('utf8');
          res.on('data', function (chunk) {
              console.log('Response : ' + chunk);
          });
      });
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^8")
      // post the data
      post_req.write(lab_results);
      //post_req.write(JSON.parse(data_json));
      post_req.end();
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^9")

// Publish events
      let encounter_id =  '{ "id": ' + fileID + ' }';
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^A1")
      var post_encounter = {
        host: '192.168.0.163',
        port: '3001',
        path: '/labResultsID',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(encounter_id)
        }
      };
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^A")
                // Set up the request
      var post_req_encounter = http.request(post_encounter, function(res) {
          //res.setEncoding('utf8');
          res.on('data', function (chunk) {
              console.log('Response : ' + chunk);
          });
      });
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^B")
      // post the data
      post_req_encounter.write(encounter_id);
      //post_req.write(JSON.parse(data_json));
      post_req_encounter.end();
      console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^C")

      
      console.log("Result 7" + result_string)

      let result_json = JSON.parse(result_string)
      console.log("Result 8" + result_json)

      let result_str = JSON.stringify(result_json);
      console.log('FILE ID' + fileID);
      var filename='';
      try {
        filename = '/home/neba123/EMRPOLYTECH/result/' + fileID + '.' + 'json';
        console.log(filename);
        fs.writeFile(filename, result_str, (err) => {
          if (err) {
              throw err;
          }
          console.log("File is updated.");
        });
        res.send ("Success");
      }
      catch (err){
        res.send("Error while storing mapped data to json file" + err);
        return;
      } 

    }
    catch(err){
      res.send("Error while mapping the hl7 file to json");
      return;
    }

  })

return app
}

/**
 * start - starts the mediator
 *
 * @param  {Function} callback a node style callback that is called once the
 * server is started
 */
function start (callback) {
  if (apiConf.api.trustSelfSigned) { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' }

  if (apiConf.register) {
    medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
      if (err) {
        winston.error('Failed to register this mediator, check your config')
        winston.error(err.stack)
        process.exit(1)
      }
      apiConf.api.urn = mediatorConfig.urn
      medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
        winston.info('Received initial config:')
        winston.info(JSON.stringify(newConfig))
        config = newConfig
        if (err) {
          winston.error('Failed to fetch initial config')
          winston.error(err.stack)
          process.exit(1)
        } else {
          winston.info('Successfully registered mediator!')
          let app = setupApp()
          const server = app.listen(process.env.APP_PORT, () => {
            if (apiConf.heartbeat) {
              let configEmitter = medUtils.activateHeartbeat(apiConf.api)
              configEmitter.on('config', (newConfig) => {
                winston.info('Received updated config:')
                winston.info(JSON.stringify(newConfig))
                // set new config for mediator
                config = newConfig

                // we can act on the new config received from the OpenHIM here
                winston.info(config)
              })
            }
            callback(server)
          })
        }
      })
    })
  } else {
    // default to config from mediator registration
    config = mediatorConfig.config
    let app = setupApp()
    const server = app.listen(process.env.APP_PORT, () => callback(server))
  }
}

exports.start = start

if (!module.parent) {
  start(() => winston.info(`Listening on ${process.env.APP_PORT}...`))
}
