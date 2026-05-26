function doGet(e) {
  return handleRequest(e, true);
}

function doPost(e) {
  return handleRequest(e, false);
}

function handleRequest(e, isGet) {
  try {
    var p = isGet ? e.parameter : JSON.parse(e.postData.contents);
    var action = p.action || '';
    var cb = p.callback || '';
    var token = ScriptApp.getOAuthToken();
    var result;
    
    if (action === 'fetchGA4') {
      result = fetchGA4_(p, token);
    } else if (action === 'fetchGSC') {
      result = fetchGSC_(p, token);
    } else if (action === 'diagnose') {
      result = diagnose_(p, token);
    } else if (action === 'ping') {
      result = {status:'ok',message:'GA4后端运行中'};
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({status:'error',message:'未知操作: '+action})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    var json = JSON.stringify({status:'ok',data:result});
    var output = cb ? cb + '(' + json + ')' : json;
    return ContentService.createTextOutput(output)
      .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  } catch(err) {
    var json = JSON.stringify({status:'error',message:err.message});
    var output = (p?p.callback:'') ? (p.callback+'('+json+')') : json;
    return ContentService.createTextOutput(output)
      .setMimeType((p&&p.callback) ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  }
}

function fetchGA4_(p, token) {
  var q = JSON.parse(p.body || '{}');
  var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + p.propertyId + ':runReport';
  var r = UrlFetchApp.fetch(url, {
    method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
    payload:JSON.stringify(q), muteHttpExceptions:true
  });
  if (r.getResponseCode() !== 200) throw new Error('GA4('+r.getResponseCode()+'): '+r.getContentText().slice(0,300));
  return JSON.parse(r.getContentText());
}

function fetchGSC_(p, token) {
  var q = JSON.parse(p.body || '{}');
  var url = 'https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(p.siteUrl) + '/searchAnalytics/query';
  var r = UrlFetchApp.fetch(url, {
    method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
    payload:JSON.stringify(q), muteHttpExceptions:true
  });
  if (r.getResponseCode() !== 200) throw new Error('GSC('+r.getResponseCode()+'): '+r.getContentText().slice(0,300));
  return JSON.parse(r.getContentText());
}

function diagnose_(p, token) {
  var r = {checks:{}};
  if (p.propertyId) {
    try {
      var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + p.propertyId + ':runReport';
      var body = {dateRanges:[{startDate:'30daysAgo',endDate:'today'}],metrics:[{name:'sessions'}],limit:1};
      var resp = UrlFetchApp.fetch(url, {method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'}, payload:JSON.stringify(body), muteHttpExceptions:true});
      r.checks.ga4 = {status: resp.getResponseCode()===200 ? 'ok' : 'error', body: resp.getContentText().slice(0,300)};
    } catch(e) {r.checks.ga4 = {status:'error', error: e.message};}
  }
  if (p.siteUrl) {
    try {
      var url = 'https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(p.siteUrl) + '/searchAnalytics/query';
      var body = {startDate:'30daysAgo',endDate:'today',dimensions:['query'],rowLimit:1};
      var resp = UrlFetchApp.fetch(url, {method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'}, payload:JSON.stringify(body), muteHttpExceptions:true});
      r.checks.gsc = {status: resp.getResponseCode()===200 ? 'ok' : 'error', body: resp.getContentText().slice(0,300)};
    } catch(e) {r.checks.gsc = {status:'error', error: e.message};}
  }
  return r;
}
