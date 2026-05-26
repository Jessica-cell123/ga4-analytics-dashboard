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
      const q = p.requestBody || {};
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${p.propertyId}:runReport`;
      const res = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        payload: JSON.stringify(q),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) throw new Error('GA4: ' + res.getContentText());
      return ContentService.createTextOutput(
        JSON.stringify({status:'ok',data:JSON.parse(res.getContentText())})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'fetchGSC') {
      const q = p.requestBody || {};
      const url = `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(p.siteUrl)}/searchAnalytics/query`;
      const res = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        payload: JSON.stringify(q),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) throw new Error('GSC: ' + res.getContentText());
      return ContentService.createTextOutput(
        JSON.stringify({status:'ok',data:JSON.parse(res.getContentText())})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    throw new Error('未知操作: ' + action);
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({status:'error',message:err.message})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
