// Paginated fetcher for Nashville Building Permit Applications
// From Nashville Open Data (Codes Department) - different org than MPC cases
// Only fetches last 5 years of data to keep reasonable size

var BASE = "https://services2.arcgis.com/CyVvlIiUfRBmMQuu/arcgis/rest/services/Building_Permits_Applications_view/FeatureServer/0/query";
var PAGE = 2000;

export default async (request, context) => {
  try {
    // Calculate 5 years ago in epoch ms
    var fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    var epochMs = fiveYearsAgo.getTime();

    var allFeatures = [];
    var offset = 0;
    var hasMore = true;
    var fields = null;
    var geomType = null;
    var spatialRef = null;

    while (hasMore) {
      var params = new URLSearchParams({
        where: "date_entered >= " + epochMs,
        outFields: "*",
        outSR: "4326",
        f: "json",
        resultRecordCount: String(PAGE),
        resultOffset: String(offset),
        returnGeometry: "true",
        orderByFields: "OBJECTID ASC"
      });

      var res = await fetch(BASE + "?" + params.toString());
      var text = await res.text();
      var json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        // If date_entered field doesn't exist, try without date filter
        var params2 = new URLSearchParams({
          where: "1=1",
          outFields: "*",
          outSR: "4326",
          f: "json",
          resultRecordCount: String(PAGE),
          resultOffset: String(offset),
          returnGeometry: "true",
          orderByFields: "OBJECTID ASC"
        });
        var res2 = await fetch(BASE + "?" + params2.toString());
        text = await res2.text();
        json = JSON.parse(text);
      }

      if (json.error) {
        // If the date field name is wrong, retry with 1=1
        if (json.error.message && json.error.message.indexOf("date_entered") >= 0) {
          var params3 = new URLSearchParams({
            where: "1=1",
            outFields: "*",
            outSR: "4326",
            f: "json",
            resultRecordCount: String(PAGE),
            resultOffset: String(offset),
            returnGeometry: "true",
            orderByFields: "OBJECTID ASC"
          });
          var res3 = await fetch(BASE + "?" + params3.toString());
          json = await res3.json();

          if (json.error) {
            return new Response(JSON.stringify({ error: json.error }), {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } else {
          return new Response(JSON.stringify({ error: json.error }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
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

      // Safety cap
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
