// Nashville Development Tracker - Unified Data Function
// Handles both MPC cases and Building Permits with pagination
// Usage:
//   /.netlify/functions/nashville-data?source=mpc    (default)
//   /.netlify/functions/nashville-data?source=bp

var SOURCES = {
  mpc: {
    url: "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query",
    oid: "ESRI_OID",
    page: 2000
  },
  bp: {
    url: "https://maps.nashville.gov/arcgis/rest/services/Codes/BuildingPermits/MapServer/0/query",
    oid: "OID",
    page: 1000
  }
};

// Fallback: ArcGIS Online view (fewer records but always available)
var FALLBACK = {
  mpc: {
    url: "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Development_Tracker_Cases_view/FeatureServer/1/query",
    oid: "OBJECTID",
    page: 2000
  }
};

async function getCount(baseUrl) {
  var params = new URLSearchParams({
    where: "1=1",
    returnCountOnly: "true",
    f: "json"
  });
  try {
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 8000);
    var r = await fetch(baseUrl + "?" + params.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    var j = await r.json();
    return j.count || 0;
  } catch (e) {
    return -1;
  }
}

async function fetchPage(baseUrl, offset, pageSize, oidField) {
  var params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    outSR: "4326",
    f: "json",
    resultRecordCount: String(pageSize),
    resultOffset: String(offset),
    orderByFields: oidField + " ASC",
    returnGeometry: "true"
  });
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 15000);
  var r = await fetch(baseUrl + "?" + params.toString(), { signal: controller.signal });
  clearTimeout(timeout);
  return await r.json();
}

async function fetchPageByOID(baseUrl, minOid, pageSize, oidField) {
  var params = new URLSearchParams({
    where: oidField + " > " + minOid,
    outFields: "*",
    outSR: "4326",
    f: "json",
    resultRecordCount: String(pageSize),
    returnGeometry: "true"
  });
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 15000);
  var r = await fetch(baseUrl + "?" + params.toString(), { signal: controller.signal });
  clearTimeout(timeout);
  return await r.json();
}

async function fetchAllFromSource(cfg) {
  // Step 1: Get total count
  var totalCount = await getCount(cfg.url);
  
  var allFeatures = [];
  var fields = null;
  var geomType = null;
  var spatialRef = null;
  var method = "unknown";

  // Step 2: Try offset-based pagination
  var offset = 0;
  var offsetWorks = true;

  while (offset < Math.max(totalCount, 1) || offset === 0) {
    var json;
    try {
      json = await fetchPage(cfg.url, offset, cfg.page, cfg.oid);
    } catch (e) {
      offsetWorks = false;
      break;
    }

    if (json.error) {
      offsetWorks = false;
      break;
    }

    if (!fields && json.fields) fields = json.fields;
    if (!geomType && json.geometryType) geomType = json.geometryType;
    if (!spatialRef && json.spatialReference) spatialRef = json.spatialReference;

    if (json.features && json.features.length > 0) {
      allFeatures = allFeatures.concat(json.features);
      offset += json.features.length;
    } else {
      break;
    }

    if (json.features.length < cfg.page) break;
    if (allFeatures.length >= 100000) break;
  }

  if (offsetWorks && allFeatures.length > 0) {
    method = "offset";
  }

  // Step 3: If offset didn't work, try OID-based pagination
  if (!offsetWorks || allFeatures.length === 0) {
    allFeatures = [];
    var lastOid = -1;

    while (true) {
      var json2;
      try {
        json2 = await fetchPageByOID(cfg.url, lastOid, cfg.page, cfg.oid);
      } catch (e) {
        break;
      }
      if (json2.error || !json2.features || json2.features.length === 0) break;

      if (!fields && json2.fields) fields = json2.fields;
      if (!geomType && json2.geometryType) geomType = json2.geometryType;
      if (!spatialRef && json2.spatialReference) spatialRef = json2.spatialReference;

      allFeatures = allFeatures.concat(json2.features);

      var maxOid = -1;
      json2.features.forEach(function(f) {
        var oid = f.attributes[cfg.oid] || f.attributes.ESRI_OID || f.attributes.OBJECTID || f.attributes.OID || 0;
        if (oid > maxOid) maxOid = oid;
      });

      if (maxOid <= lastOid) break;
      lastOid = maxOid;

      if (json2.features.length < cfg.page) break;
      if (allFeatures.length >= 100000) break;
    }
    if (allFeatures.length > 0) method = "oid";
  }

  return {
    features: allFeatures,
    fields: fields,
    geometryType: geomType,
    spatialReference: spatialRef,
    totalCount: allFeatures.length,
    serverCount: totalCount,
    method: method
  };
}

export default async (request, context) => {
  try {
    var url = new URL(request.url);
    var source = url.searchParams.get("source") || "mpc";
    var cfg = SOURCES[source] || SOURCES.mpc;

    var result;
    var usedFallback = false;

    try {
      result = await fetchAllFromSource(cfg);
    } catch (e) {
      result = null;
    }

    // If primary source failed or returned 0, try fallback
    if ((!result || result.totalCount === 0) && FALLBACK[source]) {
      try {
        result = await fetchAllFromSource(FALLBACK[source]);
        usedFallback = true;
      } catch (e2) {
        // Both failed
      }
    }

    if (!result || result.totalCount === 0) {
      return new Response(
        JSON.stringify({ error: "No data retrieved from any source", source: source }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    result.source = source;
    result.usedFallback = usedFallback;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=3600, max-age=3600"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Fetch failed: " + err.message, stack: err.stack }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
