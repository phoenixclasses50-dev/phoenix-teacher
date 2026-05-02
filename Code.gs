// Phoenix Classes - Apps Script (GET-only method, JSONP)

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cb = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'load';
    
    if (action === 'saveChunk' && e.parameter.data && e.parameter.section) {
      var section = e.parameter.section;
      var chunkData = JSON.parse(decodeURIComponent(e.parameter.data));
      var chunkPayload = chunkData.data !== undefined ? chunkData.data : chunkData;
      var wrapper = {};
      wrapper[section] = chunkPayload;
      // Handle 'misc' section
      if (section === 'misc') {
        if (chunkPayload.notices !== undefined) saveNotices(ss, chunkPayload.notices);
        if (chunkPayload.schedule !== undefined) saveSchedule(ss, chunkPayload.schedule);
        if (chunkPayload.starStudent !== undefined) saveStarStudent(ss, chunkPayload.starStudent);
        if (chunkPayload.remarks !== undefined) saveRemarks(ss, chunkPayload.remarks);
        if (chunkPayload.materials !== undefined) saveMaterials(ss, chunkPayload.materials);
      } else {
        saveData(ss, wrapper);
      }
      return makeResponse({status:'ok', section:section}, cb);
    } else if (action === 'save' && e.parameter.data) {
      var payload = JSON.parse(decodeURIComponent(e.parameter.data));
      saveData(ss, payload.payload);
      return makeResponse({status:'ok', message:'Saved!'}, cb);
    } else {
      return makeResponse({status:'ok', data:loadData(ss)}, cb);
    }
  } catch(err) {
    var cb2 = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    return makeResponse({status:'error', message:err.message}, cb2);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var raw = '';
    if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e.parameter && e.parameter.data) {
      raw = decodeURIComponent(e.parameter.data);
    }
    var data = JSON.parse(raw);
    if (data.action === 'save' && data.payload) {
      saveData(ss, data.payload);
      var out = ContentService.createTextOutput(JSON.stringify({status:'ok',message:'Saved!'}));
      out.setMimeType(ContentService.MimeType.JSON);
      return out;
    }
    var out2 = ContentService.createTextOutput(JSON.stringify({status:'ok'}));
    out2.setMimeType(ContentService.MimeType.JSON);
    return out2;
  } catch(err) {
    var out3 = ContentService.createTextOutput(JSON.stringify({status:'error',message:err.message}));
    out3.setMimeType(ContentService.MimeType.JSON);
    return out3;
  }
}

function makeResponse(obj, callback) {
  var json = JSON.stringify(obj);
  var out;
  if (callback) {
    out = ContentService.createTextOutput(callback+'('+json+')');
    out.setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    out = ContentService.createTextOutput(json);
    out.setMimeType(ContentService.MimeType.TEXT);
  }
  return out;
}

function saveData(ss, payload) {
  if (payload.students !== undefined) saveStudents(ss, payload.students);
  if (payload.attendance !== undefined) saveAttendance(ss, payload.attendance);
  if (payload.marks !== undefined) saveMarks(ss, payload.marks);
  if (payload.fees !== undefined) saveFees(ss, payload.fees);
  if (payload.notices !== undefined) saveNotices(ss, payload.notices);
  if (payload.schedule !== undefined) saveSchedule(ss, payload.schedule);
  if (payload.starStudent !== undefined) saveStarStudent(ss, payload.starStudent);
  if (payload.feedback !== undefined) saveFeedback(ss, payload.feedback);
  if (payload.remarks !== undefined) saveRemarks(ss, payload.remarks);
  if (payload.materials !== undefined) saveMaterials(ss, payload.materials);
}

function saveStudents(ss, students) {
  var sheet = getSheet(ss, 'Student');
  sheet.clearContents();
  sheet.appendRow(['ID','Name','Class','Subject','Phone']);
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    sheet.appendRow([s.id, s.name, s.cls, s.subject, s.phone||'']);
  }
}

function saveAttendance(ss, attendance) {
  var sheet = getSheet(ss, 'Attendance');
  sheet.clearContents();
  sheet.appendRow(['Date_Class','StudentID','Status']);
  var keys = Object.keys(attendance);
  for (var i = 0; i < keys.length; i++) {
    var rec = attendance[keys[i]];
    var sids = Object.keys(rec);
    for (var j = 0; j < sids.length; j++) {
      sheet.appendRow([keys[i], sids[j], rec[sids[j]]]);
    }
  }
}

function saveMarks(ss, marks) {
  var sheet = getSheet(ss, 'Marks');
  sheet.clearContents();
  sheet.appendRow(['TestID','TestName','Class','Subject','MaxMarks','Date','StudentID','Score']);
  var tests = marks.tests || [];
  var data = marks.data || {};
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var tdata = data[t.id] || {};
    var sids = Object.keys(tdata);
    if (sids.length === 0) {
      sheet.appendRow([t.id, t.testName, t.cls, t.subject, t.maxMarks, t.date,'','']);
    } else {
      for (var j = 0; j < sids.length; j++) {
        sheet.appendRow([t.id, t.testName, t.cls, t.subject, t.maxMarks, t.date, sids[j], tdata[sids[j]]]);
      }
    }
  }
}

function saveFees(ss, fees) {
  var sheet = getSheet(ss, 'Fees');
  sheet.clearContents();
  sheet.appendRow(['Type','Key','Value']);
  var cf = fees.classFee || {};
  var cls = Object.keys(cf);
  for (var i = 0; i < cls.length; i++) {
    sheet.appendRow(['classFee', cls[i], cf[cls[i]]]);
  }
  var pays = fees.payments || {};
  var sids = Object.keys(pays);
  for (var i = 0; i < sids.length; i++) {
    var list = pays[sids[i]] || [];
    for (var j = 0; j < list.length; j++) {
      var p = list[j];
      sheet.appendRow(['payment', sids[i], JSON.stringify({date:p.date,amount:p.amount,note:p.note||''})]);
    }
  }
}

function loadData(ss) {
  return {
    students: loadStudents(ss),
    attendance: loadAttendance(ss),
    marks: loadMarks(ss),
    fees: loadFees(ss),
    notices: loadNotices(ss),
    schedule: loadSchedule(ss),
    starStudent: loadStarStudent(ss),
    feedback: loadFeedback(ss),
    remarks: loadRemarks(ss),
    materials: loadMaterials(ss)
  };
}

function loadStudents(ss) {
  var sheet = ss.getSheetByName('Student');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) result.push({id:Number(rows[i][0]),name:String(rows[i][1]),cls:String(rows[i][2]),subject:String(rows[i][3]),phone:String(rows[i][4]||'')});
  }
  return result;
}

function loadAttendance(ss) {
  var sheet = ss.getSheetByName('Attendance');
  if (!sheet) return {};
  var rows = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var key = String(rows[i][0]);
    if (!result[key]) result[key] = {};
    result[key][String(rows[i][1])] = String(rows[i][2]);
  }
  return result;
}

function loadMarks(ss) {
  var sheet = ss.getSheetByName('Marks');
  if (!sheet) return {tests:[],data:{}};
  var rows = sheet.getDataRange().getValues();
  var testsMap = {}, dataMap = {};
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var tid = Number(rows[i][0]);
    if (!testsMap[tid]) testsMap[tid]={id:tid,testName:String(rows[i][1]),cls:String(rows[i][2]),subject:String(rows[i][3]),maxMarks:Number(rows[i][4]),date:String(rows[i][5])};
    if (rows[i][6]) {
      if (!dataMap[tid]) dataMap[tid]={};
      dataMap[tid][String(rows[i][6])]=rows[i][7];
    }
  }
  var tests=[];
  var tids=Object.keys(testsMap);
  for(var i=0;i<tids.length;i++) tests.push(testsMap[tids[i]]);
  return {tests:tests,data:dataMap};
}

function loadFees(ss) {
  var sheet = ss.getSheetByName('Fees');
  if (!sheet) return {classFee:{'Class 8':3000,'Class 9':3500,'Class 10':4000},payments:{}};
  var rows = sheet.getDataRange().getValues();
  var classFee={'Class 8':3000,'Class 9':3500,'Class 10':4000};
  var payments={};
  for(var i=1;i<rows.length;i++){
    if(!rows[i][0]) continue;
    var type=String(rows[i][0]);
    if(type==='classFee'){classFee[String(rows[i][1])]=Number(rows[i][2]);}
    else if(type==='payment'){
      var sid=String(rows[i][1]);
      if(!payments[sid])payments[sid]=[];
      try{payments[sid].push(JSON.parse(String(rows[i][2])));}catch(e){}
    }
  }
  return {classFee:classFee,payments:payments};
}

function getSheet(ss, name) {
  var s=ss.getSheetByName(name);
  if(!s) s=ss.insertSheet(name);
  return s;
}

// ── NOTICES (append to saveData and loadData) ─────────────────────
// Note: Add these calls inside saveData() and loadData() functions above
// saveData: add -> if (payload.notices !== undefined) saveNotices(ss, payload.notices);
// loadData: add -> notices: loadNotices(ss)

function saveNotices(ss, notices) {
  var sheet = getSheet(ss, 'Notices');
  sheet.clearContents();
  sheet.appendRow(['ID','Title','Message','Class','Date']);
  for (var i = 0; i < notices.length; i++) {
    var n = notices[i];
    sheet.appendRow([n.id, n.title, n.message, n.cls||'All', n.date||'']);
  }
}

function loadNotices(ss) {
  var sheet = ss.getSheetByName('Notices');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      result.push({id:Number(rows[i][0]),title:String(rows[i][1]),message:String(rows[i][2]),cls:String(rows[i][3]||'All'),date:String(rows[i][4]||'')});
    }
  }
  return result;
}

function saveSchedule(ss, schedule) {
  var sheet = getSheet(ss, 'Schedule');
  sheet.clearContents();
  sheet.appendRow(['ID','Title','Class','Subject','Date','Notes']);
  for (var i = 0; i < schedule.length; i++) {
    var s = schedule[i];
    sheet.appendRow([s.id, s.title, s.cls, s.subject, s.date, s.notes||'']);
  }
}

function loadSchedule(ss) {
  var sheet = ss.getSheetByName('Schedule');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) result.push({id:Number(rows[i][0]),title:String(rows[i][1]),cls:String(rows[i][2]),subject:String(rows[i][3]),date:String(rows[i][4]),notes:String(rows[i][5]||'')});
  }
  return result;
}

function saveStarStudent(ss, star) {
  var sheet = getSheet(ss, 'StarStudent');
  sheet.clearContents();
  sheet.appendRow(['ID','Name','Class','Reason']);
  if (star) sheet.appendRow([star.id, star.name, star.cls, star.reason||'']);
}

function loadStarStudent(ss) {
  var sheet = ss.getSheetByName('StarStudent');
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2 || !rows[1][0]) return null;
  return {id:Number(rows[1][0]),name:String(rows[1][1]),cls:String(rows[1][2]),reason:String(rows[1][3]||'')};
}

function saveFeedback(ss, feedback) {
  var sheet = getSheet(ss, 'Feedback');
  sheet.clearContents();
  sheet.appendRow(['StudentID','Name','Class','Rating','Message','Date']);
  for (var i = 0; i < feedback.length; i++) {
    var f = feedback[i];
    sheet.appendRow([f.studentId, f.studentName, f.cls, f.rating, f.message, f.date]);
  }
}

function loadFeedback(ss) {
  var sheet = ss.getSheetByName('Feedback');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) result.push({studentId:rows[i][0],studentName:String(rows[i][1]),cls:String(rows[i][2]),rating:String(rows[i][3]),message:String(rows[i][4]),date:String(rows[i][5])});
  }
  return result;
}

function saveRemarks(ss, remarks) {
  var sheet = getSheet(ss, 'Remarks');
  sheet.clearContents();
  sheet.appendRow(['StudentID','Remark']);
  var keys = Object.keys(remarks);
  for (var i = 0; i < keys.length; i++) {
    sheet.appendRow([keys[i], remarks[keys[i]]]);
  }
}

function loadRemarks(ss) {
  var sheet = ss.getSheetByName('Remarks');
  if (!sheet) return {};
  var rows = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) result[String(rows[i][0])] = String(rows[i][1]);
  }
  return result;
}

function saveMaterials(ss, materials) {
  var sheet = getSheet(ss, 'Materials');
  sheet.clearContents();
  sheet.appendRow(['ID','Title','Type','Subject','Class','Link','Desc','Date']);
  for (var i = 0; i < materials.length; i++) {
    var m = materials[i];
    sheet.appendRow([m.id||'', m.title||'', m.type||'', m.subject||'', m.cls||'All', m.link||'', m.desc||'', m.date||'']);
  }
}

function loadMaterials(ss) {
  var sheet = ss.getSheetByName('Materials');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) result.push({
      id:String(rows[i][0]), title:String(rows[i][1]), type:String(rows[i][2]),
      subject:String(rows[i][3]), cls:String(rows[i][4]||'All'),
      link:String(rows[i][5]||''), desc:String(rows[i][6]||''), date:String(rows[i][7]||'')
    });
  }
  return result;
}
