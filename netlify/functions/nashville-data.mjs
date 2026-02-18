export default async (request, context) => {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    var params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      outSR: "4326",
      f: "json",
      resultRecordCount: "4000",
      returnGeometry: "true",
      returnCentroid: "true"
    });

    var url0 = "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/0/query?" + params.toString();
    var url1 = "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query?" + params.toString();

    var res = await fetch(url1);
    var text = await res.text();
    var json = JSON.parse(text);

    if (!json.features || json.features.length === 0) {
      res = await fetch(url0);
      text = await res.text();
    }

    return new Response(text, {
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
      { status: 500, headers: headers }
    );
  }
};
