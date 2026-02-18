export default async (request, context) => {
  const url =
    "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query" +
    "?where=1%3D1" +
    "&outFields=MPCNUM,PERTYPE,CASE_TYPE,CASE_TYPE_DESC,SUB_TYPE_DESC,PROJECT_DESC,LOCATION_DESC,PERSTATUS,MPC_DATE,MPC_COMPLETE,MPC_ACTION,MPC_ACTION_DESC,MPC_VOTE,BILLNUM,CA_OBJECT_ID,APP_NAME,APP_REP,CD,PER_LEAD,CAPTION" +
    "&outSR=4326" +
    "&f=json" +
    "&resultRecordCount=4000";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const res = await fetch(url);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "ArcGIS HTTP " + res.status, status: res.status }),
        { status: 502, headers }
      );
    }

    const text = await res.text();

    // Sanity check: make sure we got JSON, not an HTML error page
    if (!text.startsWith("{")) {
      return new Response(
        JSON.stringify({ error: "ArcGIS returned non-JSON", preview: text.slice(0, 200) }),
        { status: 502, headers }
      );
    }

    return new Response(text, {
      status: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, s-maxage=3600, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Function fetch failed: " + err.message }),
      { status: 500, headers }
    );
  }
};
