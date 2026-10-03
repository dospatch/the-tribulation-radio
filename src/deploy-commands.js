require("dotenv").config({ override: true });
const https = require("node:https");

const token = (process.env.DISCORD_TOKEN || "").trim();
const clientId = (process.env.CLIENT_ID || "").trim();
const guildId = (process.env.GUILD_ID || "").trim();

if (!token || !clientId || !guildId) {
  console.error("DISCORD_TOKEN, CLIENT_ID, and GUILD_ID are required.");
  process.exit(1);
}

const commands = [
  require("./commands/radio").data.toJSON(),
  require("./commands/request").data.toJSON(),
  require("./commands/setup").data.toJSON()
];

const body = JSON.stringify(commands);
const path = "/api/v10/applications/" + clientId + "/guilds/" + guildId + "/commands";

const request = https.request({
  hostname: "discord.com",
  port: 443,
  path,
  method: "PUT",
  headers: {
    Authorization: "Bot " + token,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "User-Agent": "TribulationRadio/1.0"
  }
}, response => {
  let data = "";

  response.on("data", chunk => data += chunk);

  response.on("end", () => {
    console.log("Discord HTTP Status: " + response.statusCode);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const deployed = JSON.parse(data || "[]");
      console.log("Slash commands deployed successfully.");
      deployed.forEach(command => console.log("  /" + command.name));
      return;
    }

    console.error("Discord command deployment failed.");
    console.error(data || "(empty response)");
    process.exit(1);
  });
});

request.on("error", error => {
  console.error("Network error:", error.message);
  process.exit(1);
});

request.write(body);
request.end();
