#!/usr/bin/env node
'use strict'
const mllp = require('./mllp');
const express = require('express');
const medUtils = require('openhim-mediator-utils');
const utils = require('./utils');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const date = require('date-and-time');
const xml2js = require('xml2js');
const http = require("http");
const https = require('https');
const Parser = require('rss-parser')
const axios = require('axios');
const convert = require('xml-js');
const winston = require('winston');
const labResultsRouter = require("../api/labresults/labresults.router");
const fs = require('fs');
const pool = require("../config/database");

require('body-parser-xml')(bodyParser);
require("dotenv").config();


var encoded = utils.doencode()

// Config setup
let config = {}; // this will vary depending on whats set in openhim-core
const apiConf = process.env.NODE_ENV === 'test' ? require('../config/test') : require('../config/config');
const mediatorConfig = require('../config/mediator');


function setupApp () {
  const app = express();
  app.use(bodyParser.json());
  app.use(express.json());
  app.use("/api/labresults", labResultsRouter);
  app.use("/api/labresults/insertTestName", labResultsRouter);
  app.use("/api/labresults/getTestName/", labResultsRouter);

  var encoded = utils.doencode();
  var server = new mllp.MLLPServer(process.env.MLLP_SERVER, process.env.MLLP_PORT);
  var recent_event_id, new_recent_event_id;
  var last_encounter = '/last_added_encounter'; 

  app.all('/encounter', async (req, res) => {
    var update_marker=true;
    var entry_elements_array=[], element_id, element_content, content= [];

    var fetchURL= 'https://' + process.env.OPENMRS_HOST + '/openmrs/ws/atomfeed/encounter/recent';

    try {
      recent_event_id = await fs.readFileSync(__dirname + last_encounter, 'utf8')
      new_recent_event_id = recent_event_id
    } 
    catch (err) {
      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error reading last added encounter uuid'))
      return
    }

    while (fetchURL){
      
      console.log("Fetch Encounter URL: ======  " + fetchURL)
     
      //Read feed data 
      let feedData = await axios({
        method: 'GET',
        url: fetchURL,
        headers: {
          Accept: 'application/xml',
        }
      });
  
      try{
          //Convert feed data to JSON Object
          var feed_json = JSON.parse(convert.xml2json(feedData.data));
          var elements, elements_array = [];

          elements = feed_json.elements[0];
          elements_array = elements.elements

          for(var m= (elements_array.length -1); m>=0; m-- ){
            if(elements_array[m].name == 'link'){
              if(elements_array[m].attributes.rel == 'prev-archive'){
                fetchURL= elements_array[m].attributes.href;
                console.log('Next Fetch URL: ========= ' + fetchURL)
              }
            }
            if(elements_array[m].name == 'entry'){
              entry_elements_array= elements_array[m].elements;

              for(var n=0; n< entry_elements_array.length; n++){
                if(entry_elements_array[n].name == 'id'){
                  element_id= entry_elements_array[n].elements[0].text;
                }
                if(entry_elements_array[n].name == 'content'){
                  element_content= entry_elements_array[n].elements[0].cdata;
                }
              }

            if(element_id!=recent_event_id){
              if(update_marker){
                new_recent_event_id= element_id;
                update_marker=false;
              }
              content.push(element_content);
            }
            else{
              fetchURL = false;
              try {
                fs.writeFileSync(__dirname + last_encounter, new_recent_event_id, 'utf8')
              } catch (err) {
                recent_event_id = err.message
                const headers = { 'content-type': 'application/text' }
                res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error updating last added encounter uuid', 
                            orchestrations, properties))
              }
              break;
            }
      
            }
          }
          for(var i=0; i<content.length; i++){
            console.log("Encounter Detail Data URL =====: " + content [i])
          }
      } 
      catch (err) {
        const headers = { 'content-type': 'application/text' }
        res.set('Content-Type', 'application/json+openhim')
        res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error reading recent feed from OpenMRS'))
        return
      }    
    }

    let success= true, sendToLIS= false;
    for(var v=0; v < content.length;v++){

      let encounterURL= 'https://' + process.env.OPENMRS_HOST + content[v];
      console.log("Encounter Detail Data link ==== " + encounterURL)
      
      let encounterDetail = await axios({
        method: 'GET',
        url: encounterURL,
        headers: {
          "Authorization":"Basic " + encoded,
        }
      });
      try{
        let encounterType = encounterDetail.data.encounterType;
        let encounterUuid = encounterDetail.data.encounterUuid;
        let patientUuid = encounterDetail.data.patientUuid;
        let locationUuid = encounterDetail.data.locationUuid;
        let locationName = encounterDetail.data.locationName;
        let encounterDateTime= encounterDetail.data.encounterDateTime;

        if(encounterType == "Consultation"){ 

          //patient information
          let patientURL= 'https://' + process.env.OPENMRS_HOST + '/openmrs/ws/rest/v1/patient/'+ encounterDetail.data.patientUuid + '?v=full';
          console.log("Patient Detail Data link ==== " + patientURL)
          
          let patientDetail = await axios({
            method: 'GET',
            url: patientURL,
            headers: {
              "Authorization":"Basic " + encoded,
            }
          });
  
          let patientId= patientDetail.data.display.split(" - ");
          let patientid= patientId[1];
          let name= patientId[2];
          let bdate = patientDetail.data.person.birthdate
          let gender = patientDetail.data.person.gender;
  
          //encounter details 
          let orders=[], providers=[], orderType=[], orderDateCreated=[], orderAction=[], orderUrgency=[], orderNumber= []
          let testCount = orders.length;
          providers= encounterDetail.data.providers[0]      
          let providersName= providers.name;
  
  
          let msh, pid, orc, order_all='', pv1;
          let obr, isLabOrder= false;
  
          msh = "MSH|^~\\&|EMR|AaBET|POLYTECH|LAB1|" + (encounterDateTime === undefined ? "" : encounterDateTime) + "||ORM^O01|1|P|2.3|||";
          
          pid = "PID|1|" + (patientid === undefined ? "" : patientid) + "|" + (patientid === undefined ? "" : patientid) + "||" + 
          (name === undefined ? "" : name) +  "||" + 
          (bdate === undefined ? "" : bdate) + "|" + 
          (gender === undefined ? "N" : utils.sexInitial(gender)) + "|||||||||||||||||||||||"
  
          pv1 = "PV1||||||" + 
          (locationName === undefined ? "" : locationName) +  "|^" + 
          (providersName === undefined ? "" : providersName) +  "||" 
  
          orc = "ORC|NW||||||||||||||" + 
          (patientUuid === undefined ? "" : patientUuid) + "|" + (locationUuid === undefined ? "" : locationUuid)+ "|" + 
          (encounterUuid === undefined ? "" : encounterUuid)+ "|||"
  
          orders = encounterDetail.data.orders;
          order_all = msh + "\r" + pid + "\r" + pv1 + "\r" + orc 
  
          var conceptClass, testNameArray =[], testNameJsonArray, testNameJson;
  
          for(var i=0; i< orders.length; i++){
            if(orders[i].orderType == "Lab Order"){
              obr = "OBR|" + (i+1) + "|||" + orders[i].concept.name + "|" +
              (orders[i].urgency === undefined ? "R" : orders[i].urgency) + "||||" + 
              (locationName === undefined ? "" : locationName) +  "|||||||||||||||||||||||||" +
              (providersName === undefined ? "" : providersName) + "|" +
              (providersName === undefined ? "" : providersName) + "|||||||||||" +
              (orders[i].concept.uuid === undefined ? "" : orders[i].concept.uuid) + "|" +
              (orders[i].concept.conceptClass === undefined ? "" : orders[i].concept.conceptClass) + "|" 
              order_all += "\r" + obr     
              testNameJson = '{"testUuid": ' + '"' + orders[i].concept.uuid + '"' +
                              ', "testName": ' + '"' + orders[i].concept.name + '"' +
                              ', "conceptClass": ' + '"' + orders[i].concept.conceptClass + '"}';
              testNameArray.push(testNameJson);
              console.log("testNameJSON => " + testNameJson)
            }
          }  
          
          testNameJsonArray = '{"testNameArray": ' + '[' + testNameArray + '] }';
          console.log("testNameJSONArray => " + testNameJsonArray)
        
  
          var post_options = {
              host: process.env.MEDIATOR_HOST,
              port: process.env.APP_PORT,
              path: '/api/labresults/insertTestName',
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(testNameJsonArray)
              }
            };
          
                      // Set up the request
          var post_req = http.request(post_options, function(res) {
                //res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('Response : ' + chunk);
                });
          });
          
          // post the data
          post_req.write(testNameJsonArray);
            //post_req.write(JSON.parse(data_json));
          post_req.end();
  
  
          console.log("HL7 Order Format-------" + order_all)
          try{
            server.send(process.env.LIS_HOST, process.env.LIS_PORT , order_all, await function (err, ackData) {         
              // async callback code here
              if(err) {
                success= false;              
              }
              else {
                console.log('successful HL7 format');
                const headers = { 'content-type': 'application/text' }
                success= true;
                sendToLIS= true;
              }
            })
          }
          catch(err){
            console.log('error message ' + err.message);
            success= false;
            return;
          }
  
        }
      }
      catch (err) {
        const headers = { 'content-type': 'application/text' }
        res.set('Content-Type', 'application/json+openhim')
        res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error reading encounter details from OpenMRS'))
        return
      } 
    }

    if(success && sendToLIS){
      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Successful', 200, headers, 'Successfully send data to Polytech'))
      return
    }
    else if (success && !sendToLIS){
      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Successful', 200, headers, 'Nothing to import this time!'))
      return
    }
    else{
      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error sending data to Polytech'))
      return
    }
    
  });

  app.post('/labResultsID', async (req, res) => {
   try{
     let accessionID= req.body;
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

  app.post('/labresult', async (req, res) => {
   
    app.use(bodyParser.json());
    let order_data, indexes
    let order_array = req.body;

    try{

      let order_array = req.body;
      let msh = order_array.msh, pid = order_array.pid, pv1 = order_array.pv1, orc = order_array.orc, obx = order_array.obx, accessionUuID;
      let obr = order_array.obr
      let msh_array = msh.split("|")
      indexes = utils.entryIndexes("msh")

      let created = msh_array[indexes.created]
      let result_msh = '"dateTime" : "' + created + '"';

      let pid_array = pid.split("|")
      indexes = utils.entryIndexes("pid")     
      let patientid = pid_array[indexes.patient_id];
      let patientFirstName, patientLastName
      let patientName = pid_array[indexes.patient_name].split(" ");
      patientFirstName= patientName[0];
      patientLastName= patientName[1];

      let result_pid = '"patientIdentifier": "AaBET - ' + patientid + 
                        '", "patientFirstName": "' + patientFirstName + '", "patientLastName": "' + patientLastName + '"';  
      console.log("PID" + result_pid)  
                     
      let orc_array = orc.split("|")
      indexes = utils.entryIndexes("orc")

      let result_orc = '"patientUuid": "' + orc_array[indexes.patientUuid] + '", "locationUuid": "' + orc_array[indexes.locationUuid] +
                       '", "accessionUuid": "' + orc_array[indexes.encounterUuid]  + '"';

     accessionUuID= orc_array[indexes.encounterUuid];
     console.log("ORC" + result_orc)
     //OBX
     let result_obx, obx_array, minNormal, maxNormal, testResults= '{';
     let testDetails=[], observations =[], resultStatus;
     testDetails =  order_array.testDetails;
     indexes = utils.entryIndexes("obx")
     for(var i=0; i< testDetails.length; i++){
       obx_array = testDetails[i].split("|");
       let range = obx_array[indexes.range].split(" - ");
       minNormal = range[0].replace("(","");
       maxNormal = range[1].replace(")","");
       let test_name = obx_array[indexes.testName].split("^")
       let dbResponse, panelUuid, testUuid;

       //let fetchTestURL= 'http://' + process.env.MEDIATOR_HOST +':' + process.env.APP_PORT +'/api/labresults/getTestName/'+ test_name[1]
       let fetchTestURL= 'http://'+ process.env.MEDIATOR_HOST + ':' + process.env.APP_PORT + '/api/labresults/getTestName/'+ test_name[1]
       console.log("fetchtesturl => " + fetchTestURL)
       let testData = await axios({
         method: 'GET',
         url: fetchTestURL,
         headers: {
           Accept: 'application/json',
         }
       });
       let testDataDetails = testData.data  
       console.log('test data ======> ' + JSON.stringify(testDataDetails))
      // Set up the request
      if(testDataDetails.data.conceptClass=="LabSet"){
        panelUuid= testDataDetails.data.testUuid;
        testUuid= ""
      }
      else if(testDataDetails.data.conceptClass=="LabTest"){
        panelUuid= ""
        testUuid= testDataDetails.data.testUuid;
      }
      if(obx_array[indexes.rsltStatus] === 'F')
         resultStatus= "Results final"
      let abnormal = utils.testResultAbnormal(obx_array[indexes.abnormal])

      //console.log("panelUuid =>" + panelUuid + "       " + "testUuid  =>" + testUuid)
       if(testResults == '{') { 
          testResults += '"testName": "' + test_name[0] +
                  '", "testUnitOfMeasurement": "' + obx_array[indexes.units] + 
                  '", "panelUuid": "' + panelUuid + 
                  '", "testUuid": "' + testUuid + 
                  '", "minNormal": "' + minNormal +
                  '", "maxNormal": "' + maxNormal + 
                  '", "resultUuid": "' + 
                  '", "notes": "' + 
                  '", "result": "' + obx_array[indexes.result] + 
                  '", "abnormal": "' + abnormal +
                  '", "resultType": "' +
                  '", "status": "' + resultStatus +
                  '", "uploadedFileName": " ' +
                  '", "providerUuid": "' +
                  '", "dateTime": "' + obx_array[indexes.datetime] + '"}'
       }
       else {
        testResults += ',{"testName": "' + test_name[0] +
                  '", "testUnitOfMeasurement": "' + obx_array[indexes.units] + 
                  '", "panelUuid": "' + panelUuid + 
                  '", "testUuid": "' + testUuid + 
                  '", "minNormal": "' + minNormal +
                  '", "maxNormal": "' + maxNormal + 
                  '", "resultUuid": "' + 
                  '", "notes": "' + 
                  '", "result": "' + obx_array[indexes.result] + 
                  '", "abnormal": "' + abnormal +
                  '", "resultType": "' +
                  '", "status": "' + resultStatus +
                  '", "uploadedFileName": " ' +
                  '", "providerUuid": "' +
                  '", "dateTime": "' + obx_array[indexes.datetime] + '"}'
       }
     }
     result_obx = '"testDetails":[' + testResults + ']';
     let result_string = '{' + result_msh + "," + result_pid + "," + result_orc + "," + result_obx + '}';
     
     // let result_string = '{' + result_msh + '}';
     let lab_results =  '{ "id": ' + '"' + accessionUuID + '"' +',' + ' "content": ' + '[' + 
     result_string  + ']' +' }';
     console.log('lab results ====>' + lab_results)

    var post_options = {
        host: process.env.MEDIATOR_HOST,
        port: process.env.APP_PORT,
        path: '/api/labresults',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(lab_results)
        }
       };
    
                // Set up the request
    var post_req = http.request(post_options, function(res) {
          //res.setEncoding('utf8');
          res.on('data', function (chunk) {
              console.log('Response : ' + chunk);
          });
    });
    
    // post the data
    post_req.write(lab_results);
      //post_req.write(JSON.parse(data_json));
    post_req.end();
    // Publish events
      let encounter_id =  '{ "id": ' + '"' + accessionUuID + '" }';
      var post_encounter = {
        host: process.env.MEDIATOR_HOST,
        port: process.env.APP_PORT,
        path: '/labResultsID',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(encounter_id)
        }
      };
      // Set up the request
      var post_req_encounter = http.request(post_encounter, function(res) {
          //res.setEncoding('utf8');
          res.on('data', function (chunk) {
              console.log('Response : ' + chunk);
          });
      });
      // post the data
      post_req_encounter.write(encounter_id);
      //post_req.write(JSON.parse(data_json));
      post_req_encounter.end();

      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Successful', 404, headers, 'Successfuly send lab result to EMR'))
      return
    }
    catch(err){
      const headers = { 'content-type': 'application/text' }
      res.set('Content-Type', 'application/json+openhim')
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, 'Error while mapping the hl7 file to json'))
      return
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
        console.log('Failed to register this mediator, check your config')
        console.log(err.stack)
        process.exit(1)
      }
      apiConf.api.urn = mediatorConfig.urn
      medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
        console.log('Received initial config:')
        //console.log(JSON.stringify(newConfig))
        config = newConfig
        if (err) {
          console.log('Failed to fetch initial config')
          console.log(err.stack)
          process.exit(1)
        } else {
          console.log('Successfully registered mediator!')
          let app = setupApp()
          const server = app.listen(process.env.APP_PORT, () => {
            if (apiConf.heartbeat) {
              let configEmitter = medUtils.activateHeartbeat(apiConf.api)
              configEmitter.on('config', (newConfig) => {
                console.log('Received updated config:')
                //winston.info(JSON.stringify(newConfig))
                // set new config for mediator
                config = newConfig

                // we can act on the new config received from the OpenHIM here
                //winston.info(config)
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
  start(() => console.log(`Listening on ${process.env.APP_PORT}...`))
}
