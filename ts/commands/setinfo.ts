import { chain } from "../core/response.js";
import { getThreadId, isReply } from "../core/utils.js";
import { breakChain, setData, verifyAuthority } from "../custom/hooks.js";
import { StateMessageResponse } from "../custom/stateResponse.js";
import { getCommunity } from "../custom/utils.js";
import { emitGroupsInfo, getGroupLists, mode, setup } from "./shared.js";

export default function setinfo () {

  // /setinfo
  const respondSetInfo = new StateMessageResponse(mode.SETINFO, mode.ANY, setup, emitGroupsInfo)
    .check(verifyAuthority(true))
    .check(async msg => {
      if(isReply(msg))
        return chain.break;
      return chain.on;
    })
    .check(setData("groupsInfo", msg => {
      const community = getCommunity(msg)!;
      return getGroupLists(community);
    }))
    .next(async (msg, meta) => {
      await setup.bot.deleteMessage(msg.chat.id, msg.message_id);
      const { emitted } = respondSetInfo.useData(msg.message_id);
      const community = getCommunity(msg)!;
      await community.setInfoThreadId(getThreadId(msg));
      await community.setInfoMessageId(emitted.message_id);
      await community.setInfoMessageContent(emitted.text ?? "");
      return chain.on;
    })
    .next(breakChain())
    .init();

}