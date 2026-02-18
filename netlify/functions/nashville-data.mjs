export default async (request, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      outSR: "4326",
      f: "json",
      resultRecordCount: "4000",
      returnGeometry: "true"
    });

    const res = await fetch(
      "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query?" + params.toString()
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "ArcGIS HTTP " + res.status }),
        { status: 502, headers }
      );
    }

    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, s-maxage=3600, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Fetch failed: " + err.message }),
      { status: 500, headers }
    );
  }
};
```

The key change: instead of manually building the URL string with `%3D` encoding, I'm using `URLSearchParams` which handles encoding correctly. This ensures `where=1=1` is properly formatted in the request.

After updating, wait for Netlify to redeploy, then test the function URL again:
```
https://nashvilledevelopmenttracker.netlify.app/.netlify/functions/nashville-data
