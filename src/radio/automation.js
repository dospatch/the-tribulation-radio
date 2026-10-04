class StationAutomation {
  constructor({ station, requestQueue, channels, intervalMs = 60000 }) {
    this.station = station;
    this.requestQueue = requestQueue;
    this.channels = channels;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.lastStationIdAt = 0;
    this.stationIdEveryMs = 30 * 60 * 1000;
    this.announcementEveryMs = 60 * 60 * 1000;
    this.lastAnnouncementAt = 0;
    this.enabled = true;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(error =>
      console.error("Station automation error:", error.message)
    ), this.intervalMs);
    this.tick().catch(error =>
      console.error("Station automation startup error:", error.message)
    );
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (!this.enabled || !this.station.getStatus().running) return;

    const now = Date.now();

    if (
      now - this.lastStationIdAt >= this.stationIdEveryMs &&
      this.station.hasStationIds()
    ) {
      this.lastStationIdAt = now;
      this.station.queueStationId();
    }

    if (
      now - this.lastAnnouncementAt >= this.announcementEveryMs &&
      this.station.hasAnnouncements()
    ) {
      this.lastAnnouncementAt = now;
      this.station.queueAnnouncement();
    }
  }

  async announceNow(title, message) {
    const channel = this.channels.announcement;
    if (!channel) return false;

    await channel.send({
      embeds: [{
        title: "📢 " + title,
        description: message,
        footer: { text: "📻 Tribulation Radio • Broadcasting 24/7" },
        timestamp: new Date().toISOString()
      }]
    });

    return true;
  }
}

module.exports = StationAutomation;
