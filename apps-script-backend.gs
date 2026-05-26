function doGet(e) {
  return handle(e, true);
}
function doPost(e) {
  return handle(e, false);
}
function handle(e, isGet) {
  try {
    var p = isGet ? e.parameter : JSON.parse(e.postData.contents);
    var action = p.action || '';
    var token = ScriptApp.getOAuthToken();
    var result;
    if (action === 'fetchGA4') result = fetchGA4_(p, token);
    else if (action === 'fetchGSC') result = fetchGSC_(p, token);
    else if (action === 'diagnose') result = diagnose_(p, token);
    else if (action === 'ping') result = {status:'ok',message:'GA4后端运行中'};
    else throw new Error('未知操作: ' + action);
    return HtmlService.createHtmlOutput(
      '<script>window.parent.postMessage(' + JSON.stringify({status:'ok',id:p.id,data:result}) + ',"*");</script>'
    ).setXFrameHeadersMode(HtmlService.XFrameHeadersMode.ALLOWALL);
  } catch(err) {
    return HtmlService.createHtmlOutput(
      '<script>window.parent.postMessage(' + JSON.stringify({status:'error',id:p.id,message:err.message}) + ',"*");</script>'
    ).setXFrameHeadersMode(HtmlService.XFrameHeadersMode.ALLOWALL);
  }
}
function fetchGA4_(p, token) {
  var q = JSON.parse(p.body || '{}');
  var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + p.propertyId + ':runReport';
  var r = UrlFetchApp.fetch(url, {method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'}, payload:JSON.stringify(q), muteHttpExceptions:true});
  if (r.getResponseCode() !== 200) throw new Error('GA4('+r.getResponseCode()+'): '+r.getContentText().slice(0,300));
  return JSON.parse(r.getContentText());
}
function fetchGSC_(p, token) {
  var q = JSON.parse(p.body || '{}');
  var url = 'https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(p.siteUrl) + '/searchAnalytics/query';
  var r = UrlFetchApp.fetch(url, {method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'}, payload:JSON.stringify(q), muteHttpExceptions:true});
  if (r.getResponseCode() !== 200) throw new Error('GSC('+r.getResponseCode()+'): '+r.getContentText().slice(0,300));
  return JSON.parse(r.getContentText());
}
function diagnose_(p, token) {
  var r = {checks:{}};
  if (p.propertyId) {try{var b={dateRanges:[{startDate:'30daysAgo',endDate:'today'}],metrics:[{name:'sessions'}],limit:1};var resp=UrlFetchApp.fetch('https://analyticsdata.googleapis.com/v1beta/properties/'+p.propertyId+':runReport',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},payload:JSON.stringify(b),muteHttpExceptions:true});r.checks.ga4={status:resp.getResponseCode()===200?'ok':'error',body:resp.getContentText().slice(0,300)}}catch(e){r.checks.ga4={status:'error',error:e.message}}}
  if (p.siteUrl) {try{var b={startDate:'30daysAgo',endDate:'today',dimensions:['query'],rowLimit:1};var resp=UrlFetchApp.fetch('https://searchconsole.googleapis.com/v1/sites/'+encodeURIComponent(p.siteUrl)+'/searchAnalytics/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},payload:JSON.stringify(b),muteHttpExceptions:true});r.checks.gsc={status:resp.getResponseCode()===200?'ok':'error',body:resp.getContentText().slice(0,300)}}catch(e){r.checks.gsc={status:'error',error:e.message}}}
  return r;
}
