# 📻 Tribulation Radio Discord Bot

Tribulation Radio is a 24/7 Discord radio station built for Discord voice playback with FFmpeg, automatic reconnects, station automation, song requests, persistent configuration, and a secure web dashboard.

## Current Features

- 24/7 Discord voice playback
- Server-deafened radio bot that can still transmit/play audio
- FFmpeg stream handling with automatic reconnects
- Built-in station music library
- Station IDs and announcement priority playback
- Song request queue and approval controls
- Persistent station configuration
- Editable Discord station panel
- Secure web dashboard for station settings
- Automatic station startup when music is available
- Health/status endpoints
- Node.js 20+ support

## Discord Commands

- `/setup-radio`
- `/radio start`
- `/radio stop`
- `/radio restart`
- `/radio status`
- `/radio volume`
- `/radio stream`
- `/radio announce`
- `/radio panel`
- `/radio requests`
- `/radio approve`
- `/radio reject`
- `/request`

## Music Library

Place station audio files in:

```
music/
```

Supported formats include MP3, WAV, OGG, M4A, FLAC, and AAC.

Station IDs belong in:

```
station-ids/
```

Station announcements belong in:

```
announcements/
```

The station watches these folders for changes and refreshes the library automatically.

See [music/README.md](music/README.md) for the recommended audio workflow.

## Radio Playback

The Discord voice connection uses server deafening so the bot does not listen to Discord voice audio while it continues broadcasting the radio station.

The radio player also reconnects automatically when FFmpeg, the stream, or the Discord voice connection drops.

## Dashboard

The web dashboard can manage:

- Station name
- Station panel title and message
- Announcement channel
- Now Playing channel
- Song request channel
- Radio chat channel
- Voice channel
- Radio Staff role
- Volume

Set the dashboard password through the hosting provider's environment variables. Never commit the dashboard password or Discord token to GitHub.

## Environment Variables

Required:

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `RADIO_NAME`
- `RADIO_VOLUME`
- `RADIO_STREAM_URL`

Optional station/channel configuration can also be supplied through environment variables.

## Local Development

Requires Node.js 20 or newer.

```bash
npm install
npm run deploy
npm start
```

The real Discord token must be entered only through environment variables and must never be committed to GitHub.
