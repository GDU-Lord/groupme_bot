import TelegramBot from "node-telegram-bot-api";
import Community from "../community.js";
import { Listener } from "../core/listener.js";
import { setup } from "./shared.js";

export default function _onLeave() {

  // $left_chat_member
  const listener = new Listener(setup, async update => {
    const userId = update.left_chat_member.id;
    const chatId = update.chat.id;
    const community = Community.list[chatId];
    if(userId == null || community == null) return true;
    for(const i in community.members) {
      if(community.members[i].id === userId)
        community.members.splice(+i, 1);
    }
    community.groups.forEach(g => {
      if(userId in g.members)
        delete g.members[userId];
    });
    await community.update();
    return false;
  });
  listener.event = "left_chat_member";
  listener.init();
  
}