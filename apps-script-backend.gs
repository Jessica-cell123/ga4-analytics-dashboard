/**
 * GA4 & GSC Data API - Google Apps Script 后端
 * 
 * 使用方法：
 * 1. 打开 https://script.google.com
 * 2. 创建新项目，删除默认代码，粘贴此文件内容
 * 3. 点击「部署」→「新建部署」→「Web 应用」
 * 4. 执行身份选择「自己」，点「部署」
 * 5. 首次运行会要求授权，同意即可
 * 6. 复制生成的 Web App URL
 * 7. 打开仪表盘，在「设置」中粘贴此 URL
 */

// ==================== GA4 数据 ====================

function fetchGA4Data(params) {
  const propertyId = params.propertyId;
  const startDate = params.startDate;
  const endDate = params.endDate;
  const requestBody = params.requestBody;

  if (!propertyId) throw new Error('缺少 GA4 Property ID');

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code !== 200) {
    const err = JSON.parse(response.getContentText());
    throw new Error(`GA4 API Error (${code}): ${err.error?.message || JSON.stringify(err)}`);
  }

  return JSON.parse(response.getContentText());
}

// ==================== GSC 数据 ====================

function fetchGSCData(params) {
  const siteUrl = params.siteUrl;
  const startDate = params.startDate;
  const endDate = params.endDate;
  const requestBody = params.requestBody;

  if (!siteUrl) throw new Error('缺少 GSC 网站地址');

  const encoded = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/v1/sites/${encoded}/searchAnalytics/query`;

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code !== 200) {
    const err = JSON.parse(response.getContentText());
    throw new Error(`GSC API Error (${code}): ${err.error?.message || JSON.stringify(err)}`);
  }

  return JSON.parse(response.getContentText());
}

// ==================== Web App 入口 ====================

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: 'ok',
      message: 'GA4 数据分析后端运行中。请使用 POST 请求。',
      endpoints: {
        fetchGA4: 'POST { propertyId, startDate, endDate, requestBody }',
        fetchGSC: 'POST { siteUrl, startDate, endDate, requestBody }'
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const params = data.params || {};

    let result;

    switch (action) {
      case 'fetchGA4':
        result = fetchGA4Data(params);
        break;
      case 'fetchGSC':
        result = fetchGSCData(params);
        break;
      default:
        throw new Error(`未知操作: ${action}。可用操作: fetchGA4, fetchGSC`);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', data: result })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
