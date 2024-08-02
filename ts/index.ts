import "dotenv/config.js";
import addgroup from "./commands/addgroup.js";
import Community from "./community.js";
import JoinRequest from "./joinRequest.js";
import setinfo from "./commands/setinfo.js";
import delgroup from "./commands/delgroup.js";
import groupme from "./commands/groupme.js";
import editgroup from "./commands/editgroup.js";
import member from "./commands/member.js";
import setchat from "./commands/setchat.js";
import call from "./commands/call.js";
import _onJoin from "./commands/_onjoin.js";
import _onLeave from "./commands/_onleave.js";
import cancel from "./commands/cancel.js";
import botchat from "./commands/botchat.js";

await Community.load();
await JoinRequest.load();

function setupListeners() {

  delgroup();
  addgroup();
  editgroup();
  setinfo();
  groupme();
  member();
  setchat();
  call();
  cancel();
  botchat();
  _onJoin();
  _onLeave();

  console.log("setup");

}

export function init() {
  setTimeout(() => setupListeners(), +process.env.STARTUP_TIMEOUT!);
}