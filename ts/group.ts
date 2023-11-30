import Member from "./member.js";
import { ObjectId } from "mongodb";
import Community from "./community.js";

export default class Group {

  constructor(
    public name: string,
    public description: string,
    public community: Community["chatId"],
    public id: ObjectId = new ObjectId,
    public members: {
      [key: string]: Member
    } = {}
  ) {}

  addMember(member: Member) {
    this.members[member.id] = member;
  }

  removeMember(member: Member) {
    if(this.members[member.id] == null)
      return console.error("Group error: 'member' not found at removeMember(member): " + member);
    delete this.members[member.id];
  }

}