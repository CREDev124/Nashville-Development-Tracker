export default async (request, context) => {
  const url =
    "https://maps.nashville.gov/arcgis/rest/services/Planning/DevTracker_Cases/FeatureServer/1/query" +
    "?where=1%3D1" +
    "&outFields=*" +
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
```

The `netlify.toml` and `index.html` don't need to change — just update this one function file in GitHub. Once Netlify redeploys, test that same URL again:
```
https://YOUR-SITE.netlify.app/.netlify/functions/nashville-data
