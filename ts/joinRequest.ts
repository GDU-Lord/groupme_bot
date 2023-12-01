import { ObjectId } from "mongodb";
import TelegramBot from "node-telegram-bot-api";
import db from "./db.js";
import Community from "./community.js";

export default class JoinRequest {

  static list: {
    [key: string]: JoinRequest;
  } = {};

  
  static onAccept: (request: JoinRequest, community: Community) => Promise<void> = async () => {};
  static onReject: (request: JoinRequest, community: Community) => Promise<void> = async () => {};

  static async load() {
    try {
      const list = await db.collection("join_requests").find().toArray() as JoinRequest[];
      for(const entry of list) {
        const req = new JoinRequest(entry.id, entry.username, entry.name, entry.community, entry._id);
        this.list[req._id.toString()] = req;
      }
    } catch {}
  }

  initPromise: Promise<void> = (async () => {})();
  _id: ObjectId;
  
  constructor(
    public id: TelegramBot.User["id"],
    public username: TelegramBot.User["username"],
    public name: TelegramBot.User["first_name"],
    public community: TelegramBot.ChatId,
    _id?: ObjectId
  ) {
    this._id = _id ?? new ObjectId;
    if(_id == null)
      this.initPromise = this.init();
  }

  async init() {
    JoinRequest.list[this._id.toString()] = this;
    try {
      await db.collection("join_requests").insertOne(this);
    } catch {}
  }

  async remove() {
    if(!(this._id.toString() in JoinRequest.list)) return;
    delete JoinRequest.list[this._id.toString()];
    try {
      await db.collection("join_requests").deleteOne({ _id: this._id });
    } catch {}
  }

  async reject() {
    const community = Community.list[this.community];
    if(community == null) return;
    await JoinRequest.onReject(this, community);
    this.remove();
  }

  async accept() {
    const community = Community.list[this.community];
    if(community == null) return;
    await JoinRequest.onAccept(this, community);
    this.remove();
  }
}