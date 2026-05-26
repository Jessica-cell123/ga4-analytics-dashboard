function doGet() {
  return ContentService.createTextOutput(JSON.stringify({status:'ok',message:'GA4后端运行中'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';
    const p = data.params || {};
    const token = ScriptApp.getOAuthToken();
    
    if (action === 'fetchGA4') {
      return handleGA4(p, token);
    }
    if (action === 'fetchGSC') {
      return handleGSC(p, token);
    }
    if (action === 'diagnose') {
      return handleDiagnose(p, token);
    }
    throw new Error('未知操作: ' + action);
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({status:'error',message:err.message + '\n' + (err.stack||'')})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGA4(p, token) {
  const q = p.requestBody || {};
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${p.propertyId}:runReport`;
  const res = UrlFetchApp.fetch(url, {
    method:'POST',
    headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
    payload:JSON.stringify(q),
    muteHttpExceptions:true
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('GA4('+code+'): '+res.getContentText().slice(0,500));
  return ContentService.createTextOutput(
    JSON.stringify({status:'ok',data:JSON.parse(res.getContentText())})
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleGSC(p, token) {
  const q = p.requestBody || {};
  const url = `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(p.siteUrl)}/searchAnalytics/query`;
  const res = UrlFetchApp.fetch(url, {
    method:'POST',
    headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
    payload:JSON.stringify(q),
    muteHttpExceptions:true
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('GSC('+code+'): '+res.getContentText().slice(0,500));
  return ContentService.createTextOutput(
    JSON.stringify({status:'ok',data:JSON.parse(res.getContentText())})
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleDiagnose(p, token) {
  const result = {checks:{}};
  
  // Test GA4
  if (p.propertyId) {
    try {
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${p.propertyId}:runReport`;
      const body = {dateRanges:[{startDate:'30daysAgo',endDate:'today'}],metrics:[{name:'sessions'}],limit:1};
      const r = UrlFetchApp.fetch(url, {
        method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
        payload:JSON.stringify(body), muteHttpExceptions:true
      });
      result.checks.ga4 = {status: r.getResponseCode()===200 ? 'ok' : 'error', code: r.getResponseCode(), body: r.getContentText().slice(0,200)};
    } catch(e) { result.checks.ga4 = {status:'error', error: e.message}; }
  }
  
  // Test GSC
  if (p.siteUrl) {
    try {
      const url = `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(p.siteUrl)}/searchAnalytics/query`;
      const body = {startDate:'30daysAgo',endDate:'today',dimensions:['query'],rowLimit:1};
      const r = UrlFetchApp.fetch(url, {
        method:'POST', headers:{Authorization:'Bearer '+token, 'Content-Type':'application/json'},
        payload:JSON.stringify(body), muteHttpExceptions:true
      });
      result.checks.gsc = {status: r.getResponseCode()===200 ? 'ok' : 'error', code: r.getResponseCode(), body: r.getContentText().slice(0,200)};
    } catch(e) { result.checks.gsc = {status:'error', error: e.message}; }
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({status:'ok',data:result})
  ).setMimeType(ContentService.MimeType.JSON);
}
