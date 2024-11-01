import Community from "../community.js";
import { chain, responseTarget } from "../core/response.js";
import { getThreadId } from "../core/utils.js";
import { breakChain, setData, verifyMode, verifyRole } from "../custom/hooks.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import { StateMessageResponse } from "../custom/stateResponse.js";
import { getCommunity, getState } from "../custom/utils.js";
import Member from "../member.js";
import { mentionMembers, mode, setup } from "./shared.js";

export default function gather () {

  const emitCall = new StateInsertEmitter(setup, "Користувач <a href=\"tg://user?id={data.caller.id}\">@{data.caller.username}</a> викликає всіх групи!\n\n{data.called}", responseTarget.LOCAL);

  // /gather
  const respondGather = new StateMessageResponse(mode.GATHER, mode.ANY, setup, emitCall)
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(verifyRole(chain.on, chain.break))
    .check(setData("community", msg => {
      return getCommunity(msg);
    }))
    .check(setData("caller", msg => {
      let user: {
        id: number,
        username?: string,
        first_name?: string;
      };
      user = msg.from! ?? null;
      return new Member(user.id, user.first_name, user.username ?? user.first_name);
    }))
    .check(async (msg) => {
      const state = getState(msg);
      const user = state?.data.caller;
      const community = state?.data.community as Community;
      community.groups.forEach(group => {
        for(const i in group.members) {
          const member = group.members[i];
          if(member.id === user.id)
            member.username = user.username ?? user.first_name;
        }
      });
      await community.update();
      return chain.on;
    })
    .check(setData("called", (msg) => {
      const state = getState(msg);
      const community = state?.data.community as Community;
      const members: {
        [key: string]: Member;
      } = {};
      community.members.forEach(m => {
        members[m.id] = m;
      });
      return mentionMembers(members, true)[0];
    }))
    .next(async (msg, meta) => {
      await setup.bot.deleteMessage(msg.chat.id, msg.message_id);
      return chain.escape;
    })
    .next(breakChain())
    .init();

}