const fs = require("node:fs");
const path = require("node:path");

class RequestQueue {
  constructor(file) {
    this.file = file;
    this.requests = [];
    this.load();
  }

  load() {
    try {
      this.requests = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (!Array.isArray(this.requests)) this.requests = [];
    } catch {
      this.requests = [];
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.requests, null, 2));
  }

  add({ userId, username, song }) {
    const request = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      userId,
      username,
      song,
      status: "pending",
      createdAt: new Date().toISOString(),
      approvedAt: null,
      playedAt: null
    };
    this.requests.push(request);
    this.save();
    return request;
  }

  approve(id) {
    const request = this.find(id);
    if (!request) return null;
    request.status = "approved";
    request.approvedAt = new Date().toISOString();
    this.save();
    return request;
  }

  reject(id) {
    const request = this.find(id);
    if (!request) return null;
    request.status = "rejected";
    this.save();
    return request;
  }

  markPlayed(id) {
    const request = this.find(id);
    if (!request) return null;
    request.status = "played";
    request.playedAt = new Date().toISOString();
    this.save();
    return request;
  }

  find(id) {
    return this.requests.find(r => r.id === id);
  }

  findApprovedBySong(song) {
    const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const wanted = normalize(song);
    return this.requests.find(r =>
      r.status === "approved" &&
      normalize(r.song) &&
      (normalize(r.song) === wanted ||
       normalize(r.song).includes(wanted) ||
       wanted.includes(normalize(r.song)))
    );
  }

  pending() {
    return this.requests.filter(r => r.status === "pending");
  }

  approved() {
    return this.requests.filter(r => r.status === "approved");
  }

  all(limit = 10) {
    return this.requests.slice(-limit).reverse();
  }
}

module.exports = RequestQueue;
