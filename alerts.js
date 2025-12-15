import fs from "fs";

const WEBHOOK = process.env.DISCORD_WEBHOOK;

const CITIES = {
  "Phoenix, AZ": [33.4484, -112.0740],
  "Seattle, WA": [47.6062, -122.3321],
  "San Francisco, CA": [37.7749, -122.4194],
  "Sunnyvale, CA": [37.3688, -122.0363],
  "San Diego, CA": [32.7157, -117.1611],
};

const SEEN_FILE = "seen.json";
const HEADERS = {
  "User-Agent": "GitHub-NWS-Discord (you@example.com)",
  "Accept": "application/geo+json"
};

let seen = new Set();
if (fs.existsSync(SEEN_FILE)) {
  seen = new Set(JSON.parse(fs.readFileSync(SEEN_FILE)));
}

async function send(embed) {
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] })
  });
}

async function checkCity(city, lat, lon) {
  const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();

  for (const alert of data.features) {
    if (seen.has(alert.id)) continue;
    seen.add(alert.id);

    const p = alert.properties;

    await send({
      title: p.event,
      description: p.headline,
      color: p.severity === "Extreme" ? 15158332 : 16776960,
      fields: [
        { name: "City", value: city, inline: true },
        { name: "Severity", value: p.severity, inline: true },
        { name: "Certainty", value: p.certainty, inline: true },
        { name: "Expires", value: p.expires || "N/A", inline: false }
      ],
      url: p.uri
    });

    console.log(`Sent: ${p.event} for ${city}`);
  }
}

for (const [city, [lat, lon]] of Object.entries(CITIES)) {
  await checkCity(city, lat, lon);
}

fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen]));
