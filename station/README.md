# Tribulation Radio Station Audio

This folder contains the audio owned and supplied by the station operator.

## Add music

Put your legally owned/licensed audio files in:

- `music/` — regular songs
- `station-ids/` — short station IDs, sweepers, or legal branding audio
- `announcements/` — recorded announcements

Supported formats:

- MP3
- WAV
- OGG
- M4A
- FLAC
- AAC

The station engine automatically scans these folders and plays the files 24/7.

## Important

No copyrighted music is included with this repository. Only use audio you own, have permission to broadcast, or are otherwise licensed to use.

The engine uses FFmpeg to normalize the station output to a live 128 kbps MP3 stream.
