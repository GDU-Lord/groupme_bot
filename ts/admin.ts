import Community from "./community.js";
import Member from "./member.js";

export default class Admin extends Member {

  initPromise: Promise<void>;

  constructor(id: number, name: string, username: string | undefined, public community: Community["chatId"], public owner = false) {
    super(id, name, username);
    this.initPromise = this.init();
  }

  async init() {
    await Community.list[this.community]?.addAdmin(this);
  }

  async setOwner(value: boolean) {
    this.owner = value;
    await Community.list[this.community]?.updateAdmin(this);
  }

}