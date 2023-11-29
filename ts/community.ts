import { ObjectId } from "mongodb";
import Admin from "./admin.js";
import db from "./db.js";
import Group from "./group.js";
import TelegramBot from "node-telegram-bot-api";

export default class Community {

  static async load() {
    try {
      const list = await db.collection("communities").find().toArray() as Community[];
      for(const entry of list)
        new Community(entry.chatId, entry.admins, entry.groups, entry._id, entry.infoChannelThread);
    } catch(err) {
      console.error(err);
    }
  }

  static list: {
    [key: TelegramBot.ChatId]: Community 
  } = {};

  initPromise: Promise<void>;
  _id: ObjectId;
  admins: Admin[];
  groups: Group[];

  constructor(public chatId: TelegramBot.ChatId, admins: Admin[], groups: Group[], _id?: ObjectId, public infoChannelThread: number = -1) {
    this._id = _id ?? new ObjectId;
    this.admins = admins.map(admin => new Admin(admin.id, admin.name, admin.username, admin.community, admin.owner));
    this.groups = groups.map(group => new Group(group.name, group.description, group.community, group.id, group.members));
    this.initPromise = this.init(_id == null);
  }

  private async init(create: boolean) {
    try {
      if(create)
        await db.collection("communities").insertOne(this);
      Community.list[this.chatId] = this;
    } catch(err) {
      console.error(err);
    }
  }

  async remove() {
    try {
      await db.collection("communities").deleteOne({ _id: this._id });
      delete Community.list[this.chatId];
    } catch(err) {
      console.error(err);
    }
  }

  async update() {
    try {
      await db.collection("communities").updateOne({ _id: this._id }, {
        $set: this
      });
    } catch(err) {
      console.error(err);
    }
  }

  async addAdmin(admin: Admin) {
    this.admins.push(admin);
    await this.update();
  }

  async updateAdmin(admin: Admin) {
    const index = this.admins.findIndex(findEntity<Admin>(admin));
    if(index === -1) return console.error("Community error: 'admin' not found at 'updateAdmin(admin)': " + admin);
    this.admins[index] = admin;
    await this.update();
  }

  async removeAdmin(admin: Admin) {
    const index = this.admins.findIndex(findEntity<Admin>(admin));
    if(index === -1) return console.error("Community error: 'admin' not found at 'removeAdmin(admin)': " + admin);
    this.admins.splice(index, 1);
    await this.update();
  }

  async addGroup(group: Group) {
    this.groups.push(group);
    await this.update();
  }

  async updateGroup(group: Group) {
    const index = this.groups.findIndex(findEntity<Group>(group));
    if(index === -1) return console.error("Community error: 'group' not found at 'updateGroup(group)': " + group);
    this.groups[index] = group;
    await this.update();
  }

  async removeGroup(group: Group) {
    const index = this.groups.findIndex(findEntity<Group>(group));
    if(index === -1) return console.error("Community error: 'group' not found at 'removeGroup(group)': " + group);
    this.groups.splice(index, 1);
    await this.update();
  }

  async setInfoChannelThread(infoChannelThread: number) {
    this.infoChannelThread = infoChannelThread;
    await this.update();
  }

}

function findEntity<type extends (Admin | Group)>(match: type) {
  return (entry: type) => entry.id === match.id;
}