# Tribulation Radio — Render Status Mirror

This is a read-only status page for the main Tribulation Radio service.

- The Discord bot, voice playback, music library, and editable station dashboard remain on Wispbyte.
- This Render service only reads the Wispbyte JSON health endpoint.
- It does not log in to Discord and must never be configured with DISCORD_TOKEN.
- Render Free web services sleep after 15 minutes without incoming traffic and can take about a minute to wake up. This is a status mirror, not the 24/7 radio host.

## Deploy

1. In Render, choose New → Blueprint.
2. Connect dospatch/the-tribulation-radio.
3. Select the main branch and let Render detect the root render.yaml.
4. Review the service. It should be named tribulation-radio-status and use the Free plan.
5. Apply the Blueprint.

The service uses render-dashboard/ as its root directory and starts with npm start.

## Health source

The default RADIO_STATUS_URL is https://tribulationradio.freesrv.com/?health=1.
If the Wispbyte host changes, update that environment variable in Render.

## Local test

```bash
cd render-dashboard
npm start
```

Open http://localhost:10000.
