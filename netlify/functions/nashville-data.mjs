export default async (request, context) => {
  try {
    var urls = [
      "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query?where=1%3D1&outFields=*&f=json&returnGeometry=true",
      "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/0/query?where=1%3D1&outFields=*&f=json&returnGeometry=true",
      "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query?where=OBJECTID%3E0&outFields=*&f=json&returnGeometry=true",
      "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/0/query?where=OBJECTID%3E0&outFields=*&f=json&returnGeometry=true"
    ];

    for (var i = 0; i < urls.length; i++) {
      var res = await fetch(urls[i]);
      var text = await res.text();
      try {
        var json = JSON.parse(text);
        if (json.features && json.features.length > 0) {
          return new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, s-maxage=3600, max-age=3600"
            }
          });
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      error: "All queries returned 0 features",
      lastResponse: text ? text.substring(0, 500) : "empty"
    }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Fetch failed: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
