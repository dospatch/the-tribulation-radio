# Tribulation Radio Discord Bot

Tribulation Radio Discord bot with 24/7 Discord voice playback, FFmpeg stream handling, automatic reconnects, radio controls, song requests, and persistent configuration.

Commands:
- /setup-radio
- /radio start
- /radio stop
- /radio restart
- /radio status
- /radio volume
- /radio stream
- /request

Required environment variables:
- DISCORD_TOKEN
- CLIENT_ID
- GUILD_ID
- RADIO_NAME
- RADIO_VOLUME
- RADIO_STREAM_URL

The real Discord token must be entered in the hosting provider's environment variables and must never be committed to GitHub.
