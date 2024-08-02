import MessageEmitter from "../core/message.js";
import { chain, responseTarget } from "../core/response.js";
import { getThreadId, isReply } from "../core/utils.js";
import { verifyAuthority, verifyMode } from "../custom/hooks.js";
import { StateMessageResponse } from "../custom/stateResponse.js";
import { getCommunity } from "../custom/utils.js";
import { hideButton, mode, setup } from "./shared.js";

export default function botchat () {

  const emitChatSet = new MessageEmitter(setup, "Чат для взаємодії з ботом встановлено!", responseTarget.LOCAL)
    .addOption(hideButton);

  // /botchat
  const respondBotChat = new StateMessageResponse(mode.BOTCHAT, mode.ANY, setup, emitChatSet)
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(verifyAuthority(true))
    .check(async msg => {
      const community = getCommunity(msg);
      if(community == null)
        return chain.break;
      if(isReply(msg))
        return chain.break;
      await community.setBotThreadId(getThreadId(msg));
      return chain.on;
    })
    .init();

}