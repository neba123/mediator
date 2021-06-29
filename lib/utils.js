'use strict'
const URL = require('url')
const date = require('date-and-time');

exports.entryIndexes = function(type) {
  
  let indexes 
  if(type == "msh") {
    indexes = {"orgUnit": 3, "receiving_laboratory": 5, "created": 6}
  } else if(type == "pid") {
    indexes = {"patient_id": 2, "patient_name": 5, "date_of_birth": 7, "sex": 8, "address": 11, "phone_local": 13, "travel_history": 20, "nationality": 24, "kebele": 25, "phone_relative": 26, "passport_no": 27, "woreda": 28, "zone": 30, "region": 29, "country": 21, "city_town": 22, "return_date": 23}
  } else if(type == "pv1") {
    indexes = {"physician": 7}
  } else if(type == "obr") {
    indexes = {"specimen_id": 3, "observation_battery": 4, "specimen_collection_time": 7, "physician": 16, "testing_lab_actual": 10,"receiving_technician": 11, "symptoms": 28, "requesting_physician": 30, "COVID_19_Suspect_clinical_status": 24, "Community_patient_classification": 26, "Community_report_test_reason": 27, "type_of_test": 31, "conditions": 29 }
  } else if(type == "obx") {
    indexes = {"testName": 3, "units": 6, "range": 7, "result": 5, "abnormal": 8, "rsltStatus": 11, "datetime": 14}
  } else if(type == "uchem") {
    indexes = {"sample_id": 3, "time_result_issued": 7}
  } else if(type == "cbc_b") {
    indexes = {"sample_id": 3, "time_result_issued": 7}
  } else if(type == "orc") {
    indexes = {"accessionUuid": 3,"patientUuid": 15, "locationUuid": 16, "encounterUuid": 17}
  }
  
  return indexes
     
}

exports.nameInitial = function(name) {

  let initialChar 
  
  if(name != "") {
    initialChar = name.charAt(0);
  } else {
    initialChar = "";
  }

  return initialChar
     
}

exports.sexInitial = function(name) {

  let initialChar 
  
  if(name != "") {
    initialChar = name.charAt(0);
  } else {
    initialChar = "N";
  }

  return initialChar
     
}

exports.adaptSourceTable = function(sourceTable) {

  if(sourceTable == "UPIN Number") {
    return "U"
  } else if(sourceTable == "Provider Number") {
    return "P"
  } else if(sourceTable == "NPI Number") {
    return "N"
  } else if(sourceTable == "Local") {
    return "L"
  } else {
    return "NA"
  }
     
}

exports.adaptOrderControl = function(oc) {
  
  let orderControl = "NA"

  if(oc == "New") {
    orderControl = "NW"
  }
     
  return orderControl
}

exports.formatPhone = function(phone) {
  
  let newPhone = phone.replace("(", "").replace(")", "").replace("-", "")
     
  return newPhone
}

exports.adaptPhone = function(phone) {
  
  let newPhone

  phone = (phone.startsWith("+251") ? phone.substr(4) : phone)
  phone = (phone.startsWith("251") ? phone.substr(3) : phone)
  phone = (phone.startsWith("0") ? phone.substr(1) : phone).trim()

  newPhone = "(0" + phone.substr(0,2) + ")" + phone.substr(2,3) + "-" + phone.substr(5,4)
     
  return newPhone
}

exports.adaptPatientClassification = function(patientClass) {
  
  let newpatientClass=""

  if(patientClass="New"){
    newpatientClass = "Y"
  }
  return newpatientClass
}

exports.adaptTestReason = function(testReason) {
  
  let newtestReason=""

  if(testReason="Suspect"){
    newtestReason = "Y"
  }
  return newtestReason
}
exports.adaptClinicalStatus = function(clinicalStatus) {
  
  let newclinicalStatus=""

  if(clinicalStatus="Suspect"){
    newclinicalStatus = "Y"
  }
  return newclinicalStatus
}

exports.adaptDate = function(datetime) {
  let datePart, dateTimeArray, datePartArray
  
  dateTimeArray = datetime.split("T")
  datePart = dateTimeArray[0]
  datePartArray = datePart.split("-")
   
  return (datePartArray[0] + datePartArray[1] + datePartArray[2])
}

/* exports.formatDateTime = function(datetime) {
  let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2) + " " + 
              datetime.substr(8, 2) + ":" + datetime.substr(10)
  let dateValue = new Date(value)
  let formattedValue = date.format(dateValue, 'YYYY-MM-DD HH:mm:ssZ')

  return formattedValue
}

exports.formatDate = function(datetime) {
  let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2)
  let dateValue = new Date(value)
  let formattedValue = date.format(dateValue, 'YYYY-MM-DD')

  return formattedValue  2009-12-00 12:29
}*/

exports.formatDateTime = function(datetime) {
  let formattedValue = ""
  if(datetime.trim() != "") {
    let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2) + " " + 
              datetime.substr(8, 2) + ":" + datetime.substr(10)
    let dateValue = new Date(value)
    formattedValue = date.format(dateValue, 'YYYY-MM-DD HH:mm')
  }
  console.log('formatted value ' + formattedValue )
  return formattedValue
}


exports.clinical_status = function(clinical_status) {
  let status = ""
  if((clinical_status =='Y') || (clinical_status =='y'))
     status= "Community surveillance"
  return status
}

exports.sus_classf = function(suspect_classification_array) {
  let classification = ""
  if(suspect_classification_array[0] =='Y')
      classification= "New "
  if(suspect_classification_array[1] =='Y')
      classification += "SARI_Pneumonia "  
  if(suspect_classification_array[2] =='Y')
      classification += "Suspect " 
  if(suspect_classification_array[3] =='Y')
      classification += "Contact " 
  if(suspect_classification_array[4] =='Y')
      classification += "Dischargefrom Quarantine "
  if(suspect_classification_array[5] =='Y')
      classification += "Traveler"                          
  return classification
}

exports.rep_test = function(report_test_reason_array) {
  let test_reason = ""
  if(report_test_reason_array[0] =='Y')
    test_reason= "Repeat "
  if(report_test_reason_array[1] =='Y')
     test_reason += "Clinical Decision "  
  if(report_test_reason_array[2] =='Y')
     test_reason += "Follow Up I " 
  if(report_test_reason_array[3] =='Y')
    test_reason += "Follow Up II " 
  if(report_test_reason_array[4] =='Y')
    test_reason += "Follow Up III"                  
  return test_reason
}

exports.conditions = function(conditions_array) {
  let condition = ""
  if(conditions_array[0] =='Y')
    condition= "Diabetes Mellitus "
  if(conditions_array[1] =='Y')
    condition += "Hypertension "  
  if(conditions_array[2] =='Y')
    condition += "HIV " 
  if(conditions_array[3] =='Y')
    condition += "Respiratory Disease " 
  if(conditions_array[4] =='Y')
    condition += "Cardiac Disease "
  if(conditions_array[5] =='Y')
    condition += "Pregnant"                          
  return condition
}

exports.formatDate = function(datetime) {
  let formattedValue = ""
  if(datetime != "") {
    let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2)
    let dateValue = new Date(value)
    formattedValue = date.format(dateValue, 'YYYY-MM-DD')
  }
  return formattedValue
}



exports.adaptDateTime = function(datetime) {
  let datePart, timePart, dateTimeArray, datePartArray, timePartArray
  dateTimeArray = datetime.split("T")
  datePart = dateTimeArray[0]
  datePartArray = datePart.split("-")
  timePart = dateTimeArray[1]
  timePartArray = timePart.split(":")

  
  return (datePartArray[0] + datePartArray[1] + datePartArray[2] + timePartArray[0] + timePartArray[1])
}

exports.doencodeDHIS2 = function() {
  const encode = require('nodejs-base64-encode');
  var username = "admin";
  var password = "district";
  var tobeencoded = username + ":" + password;
  return encode.encode(tobeencoded, 'base64');
}
exports.doencode = function() {
  const encode = require('nodejs-base64-encode');
  var username = "superman";
  var password = "Orbit123!";
  var tobeencoded = username + ":" + password;
  return encode.encode(tobeencoded, 'base64');
}

exports.buildOrchestration = (name, beforeTimestamp, method, url, requestHeaders, requestContent, res, body) => {
  let uri = URL.parse(url)
  return {
    name: name,
    request: {
      method: method,
      headers: requestHeaders,
      body: requestContent,
      timestamp: beforeTimestamp,
      path: uri.path,
      querystring: uri.query
    },
    response: {
      status: res.statusCode,
      headers: res.headers,
      body: body,
      timestamp: new Date()
    }
  }
}

exports.buildReturnObject = (urn, status, statusCode, headers, responseBody, orchestrations, properties) => {
  var response = {
    status: statusCode,
    headers: headers,
    body: responseBody,
    timestamp: new Date().getTime()
  }
  return {
    'x-mediator-urn': urn,
    status: status,
    response: response,
    orchestrations: orchestrations,
    properties: properties
  }
}
