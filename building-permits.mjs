// Paginated fetcher for Nashville Building Permits
// Nashville on-premise: maps.nashville.gov/arcgis/rest/services/Codes/BuildingPermits/MapServer/0
// Actual fields: CASE_TYPE_DESC, SUB_TYPE_DESC, CASE_NUMBER, STATUS_CODE, DATE_ACCEPTED,
//   CONSTVAL, DATE_ISSUED, LOCATION, APN, OID, SCOPE, BLDG_SQ_FT, FINALDATE, FINALCODE, UNITS

var BASE = "https://maps.nashville.gov/arcgis/rest/services/Codes/BuildingPermits/MapServer/0/query";
var PAGE = 1000;

export default async (request, context) => {
  try {
    var allFeatures = [];
    var offset = 0;
    var hasMore = true;
    var fields = null;
    var geomType = null;
    var spatialRef = null;

    while (hasMore) {
      var params = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        outSR: "4326",
        f: "json",
        resultRecordCount: String(PAGE),
        resultOffset: String(offset),
        returnGeometry: "true",
        orderByFields: "OID ASC"
      });

      var url = BASE + "?" + params.toString();
      var res = await fetch(url);
      var text = await res.text();
      var json;

      try {
        json = JSON.parse(text);
      } catch (e) {
        break;
      }

      if (json.error) {
        // Some older MapServers don't support resultOffset; try without pagination
        if (offset === 0) {
          var p2 = new URLSearchParams({
            where: "1=1",
            outFields: "*",
            outSR: "4326",
            f: "json",
            resultRecordCount: "2000",
            returnGeometry: "true"
          });
          var r2 = await fetch(BASE + "?" + p2.toString());
          json = await r2.json();
          if (json.features) allFeatures = json.features;
          if (json.fields) fields = json.fields;
          if (json.geometryType) geomType = json.geometryType;
          if (json.spatialReference) spatialRef = json.spatialReference;
        }
        hasMore = false;
        continue;
      }

      if (!fields && json.fields) fields = json.fields;
      if (!geomType && json.geometryType) geomType = json.geometryType;
      if (!spatialRef && json.spatialReference) spatialRef = json.spatialReference;

      if (json.features && json.features.length > 0) {
        allFeatures = allFeatures.concat(json.features);
        offset += json.features.length;
      }

      if (!json.features || json.features.length < PAGE || !json.exceededTransferLimit) {
        hasMore = false;
      }

      if (offset >= 100000) hasMore = false;
    }

    var result = {
      geometryType: geomType,
      spatialReference: spatialRef,
      fields: fields,
      features: allFeatures,
      totalCount: allFeatures.length
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

export var config = {
  path: "/api/building-permits"
};
