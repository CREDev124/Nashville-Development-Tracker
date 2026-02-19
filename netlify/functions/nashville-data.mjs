// Nashville Development Tracker - Unified Data Function
// Handles both MPC cases and Building Permits with pagination
// Usage:
//   /.netlify/functions/nashville-data?source=mpc    (default)
//   /.netlify/functions/nashville-data?source=bp

var SOURCES = {
  mpc: {
    url: "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Development_Tracker_Cases_view/FeatureServer/1/query",
    oid: "OBJECTID",
    page: 2000
  },
  bp: {
    url: "https://maps.nashville.gov/arcgis/rest/services/Codes/BuildingPermits/MapServer/0/query",
    oid: "OID",
    page: 1000
  }
};

export default async (request, context) => {
  try {
    var url = new URL(request.url);
    var source = url.searchParams.get("source") || "mpc";
    var cfg = SOURCES[source] || SOURCES.mpc;

    var allFeatures = [];
    var offset = 0;
    var hasMore = true;
    var fields = null;
    var geomType = null;
    var spatialRef = null;
    var useOffset = true;

    while (hasMore) {
      var params = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        outSR: "4326",
        f: "json",
        resultRecordCount: String(cfg.page),
        returnGeometry: "true"
      });

      // Add pagination params
      if (useOffset && offset > 0) {
        params.set("resultOffset", String(offset));
      }

      // Try ordering by OID for consistent pagination
      params.set("orderByFields", cfg.oid + " ASC");

      var fetchUrl = cfg.url + "?" + params.toString();
      var res = await fetch(fetchUrl);
      var text = await res.text();
      var json;

      try {
        json = JSON.parse(text);
      } catch (e) {
        break;
      }

      // Handle errors - fall back to simpler query
      if (json.error) {
        if (offset === 0) {
          // Try without orderByFields and offset (older MapServers)
          var p2 = new URLSearchParams({
            where: "1=1",
            outFields: "*",
            outSR: "4326",
            f: "json",
            resultRecordCount: String(cfg.page),
            returnGeometry: "true"
          });
          var r2 = await fetch(cfg.url + "?" + p2.toString());
          var t2 = await r2.text();
          try {
            json = JSON.parse(t2);
          } catch (e2) {
            break;
          }
          if (json.error) break;
          useOffset = false;
          // If this simpler query works, get what we can
          if (json.features) allFeatures = json.features;
          if (json.fields) fields = json.fields;
          if (json.geometryType) geomType = json.geometryType;
          if (json.spatialReference) spatialRef = json.spatialReference;

          // If there are more records but we can't paginate with offset,
          // try using OID-based pagination
          if (json.exceededTransferLimit && json.features && json.features.length > 0) {
            var lastOid = 0;
            json.features.forEach(function(f) {
              var oid = f.attributes[cfg.oid] || f.attributes.OBJECTID || f.attributes.OID || 0;
              if (oid > lastOid) lastOid = oid;
            });

            // Page through using WHERE clause on OID
            var morePaging = true;
            while (morePaging) {
              var p3 = new URLSearchParams({
                where: cfg.oid + " > " + lastOid,
                outFields: "*",
                outSR: "4326",
                f: "json",
                resultRecordCount: String(cfg.page),
                returnGeometry: "true"
              });
              var r3 = await fetch(cfg.url + "?" + p3.toString());
              var t3 = await r3.text();
              var j3;
              try { j3 = JSON.parse(t3); } catch (e3) { break; }
              if (j3.error || !j3.features || j3.features.length === 0) {
                morePaging = false;
                break;
              }
              allFeatures = allFeatures.concat(j3.features);
              j3.features.forEach(function(f) {
                var oid = f.attributes[cfg.oid] || f.attributes.OBJECTID || f.attributes.OID || 0;
                if (oid > lastOid) lastOid = oid;
              });
              if (!j3.exceededTransferLimit || j3.features.length < cfg.page) morePaging = false;
              if (allFeatures.length >= 100000) morePaging = false;
            }
          }
          hasMore = false;
          continue;
        }
        break;
      }

      if (!fields && json.fields) fields = json.fields;
      if (!geomType && json.geometryType) geomType = json.geometryType;
      if (!spatialRef && json.spatialReference) spatialRef = json.spatialReference;

      if (json.features && json.features.length > 0) {
        allFeatures = allFeatures.concat(json.features);
        offset += json.features.length;
      }

      if (!json.features || json.features.length < cfg.page || !json.exceededTransferLimit) {
        hasMore = false;
      }

      if (offset >= 100000) hasMore = false;
    }

    var result = {
      geometryType: geomType,
      spatialReference: spatialRef,
      fields: fields,
      features: allFeatures,
      totalCount: allFeatures.length,
      source: source
    };

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
      JSON.stringify({ error: "Fetch failed: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
