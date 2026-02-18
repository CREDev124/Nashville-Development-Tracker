export default async (request, context) => {
  const ARCGIS_URL = "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query";
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "MPCNUM,PERTYPE,CASE_TYPE,CASE_TYPE_DESC,SUB_TYPE_DESC,PROJECT_DESC,LOCATION_DESC,PERSTATUS,MPC_DATE,MPC_COMPLETE,MPC_ACTION,MPC_ACTION_DESC,MPC_VOTE,BILLNUM,CA_OBJECT_ID,APP_NAME,APP_REP,CD,PER_LEAD,CAPTION",
    outSR: "4326",
    f: "json",
    resultRecordCount: "4000",
  });

  try {
    const res = await fetch(`${ARCGIS_URL}?${params}`, {
      headers: {
        "User-Agent": "NashvilleDevTracker/1.0",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `ArcGIS returned HTTP ${res.status}` }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await res.text();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
