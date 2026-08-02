const fs = require("fs");
const https = require("https");
const token = process.env.SB_TOKEN;
const query = fs.readFileSync("supabase/migrations/008_santiye_olustur.sql", "utf8");
const body = JSON.stringify({ query });
const req = https.request(
  {
    hostname: "api.supabase.com",
    path: "/v1/projects/uapnesublybddrtstzrw/database/query",
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      console.log("STATUS=" + res.statusCode);
      console.log(d.slice(0, 800));
      process.exit(res.statusCode >= 400 ? 1 : 0);
    });
  }
);
req.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
req.write(body);
req.end();
