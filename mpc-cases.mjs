// Paginated fetcher for Nashville MPC Development Tracker Cases
// Fetches ALL records by paging through 2000 at a time

var BASE = "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Development_Tracker_Cases_view/FeatureServer/1/query";
var PAGE = 2000;

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
        orderByFields: "OBJECTID ASC"
      });

      var res = await fetch(BASE + "?" + params.toString());
      var json = await res.json();

      if (json.error) {
        return new Response(JSON.stringify({ error: json.error }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      if (!fields && json.fields) fields = json.fields;
      if (!geomType && json.geometryType) geomType = json.geometryType;
      if (!spatialRef && json.spatialReference) spatialRef = json.spatialReference;

      if (json.features && json.features.length > 0) {
        allFeatures = allFeatures.concat(json.features);
        offset += json.features.length;
      }

      // Stop if we got fewer than requested or no exceededTransferLimit
      if (!json.features || json.features.length < PAGE || !json.exceededTransferLimit) {
        hasMore = false;
      }

      // Safety: cap at 50000 to avoid infinite loops
      if (offset >= 50000) hasMore = false;
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
  path: "/api/mpc-cases"
};
