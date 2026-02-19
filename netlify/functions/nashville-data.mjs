export default async (request, context) => {
  try {
    var params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      outSR: "4326",
      f: "json",
      resultRecordCount: "4000",
      returnGeometry: "true"
    });

    var url = "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Development_Tracker_Cases_view/FeatureServer/1/query?" + params.toString();
    var res = await fetch(url);
    var text = await res.text();

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
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
