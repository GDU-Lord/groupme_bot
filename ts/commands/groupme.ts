import { editInfoMessage, mode, setup, state, updateInfoList } from "./shared.js";
import { StateMessageResponse, StateQueryResponse } from "../custom/stateResponse.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyMode } from "../custom/hooks.js";
import {DeleteButtonMenuOption } from "../core/options/button.js";
import { getThreadId, Insert } from "../core/utils.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import State from "../core/state.js";
import Community from "../community.js";
import { getCommunity, getSign, getState, setStateMode } from "../custom/utils.js";
import { ExtendedQuery } from "../core/listener.js";
import Member from "../member.js";
import TelegramBot from "node-telegram-bot-api";

export default function groupme() {

  const menu = new DeleteButtonMenuOption(new Insert("{i.n}"), []);

  const emitChooseGroups = new StateInsertEmitter(setup, {
    getInstanceData: async (state: State<state>) => {
      const user_groups = state.state.data.user_groups as [string, [string, boolean]][];
      interface group {
        n: string;
        $: {
          d?: number,
          s?: boolean,
          r?: boolean
        }
      }
      const res: group[] = user_groups.map(([text, [id, state]], index) => {
        return {
          n: text,
          $: {
            d: index,
            s: state
          }
        };
      });
      res.push({
        n: "ГОТОВО",
        $: {
          r: true
        }
      });
      return res;
    },
    toString: () => 'Ласкаво просимо! <a href="tg://user?id={data.member.id}">@{data.member.username}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme'
  }, responseTarget.LOCAL)
    .addOption(menu);

  function updateUserGroups() {
    return setData<ExtendedQuery<any> | TelegramBot.Message>("user_groups", msg => {
      const state = getState(msg);
      const community = state?.data.community as Community;
      const member = state?.data.member as Member;
      const groups = community.groups.map(group => {
        let found = false;
        for (const i in group.members) {
          const m = group.members[i];
          if (m.id !== member.id) continue;
          found = true;
          break;
        }
        return [getSign(found) + group.name, [group.id, !found]];
      });
      return groups;
    });
  }

  // [{...community.groups}] [done]
  const respondMenuQuery = new StateQueryResponse(async () => true, mode.GROUPME, setup, emitChooseGroups)
    .check(async (query) => {
      const state = getState(query);
      const community = state?.data.community as Community;
      const member = state?.data.member;
      const data = query.data as any;
      const ready = data.r;
      const index = data.d;
      const joined = data.s;
      try {
        await setup.bot.deleteMessage(query.message?.chat.id!, query.message?.message_id!);
      } catch (err) { };

      if (ready) {
        setStateMode(query, mode.NONE);
        return chain.escape;
      }
      const group = community.groups[index];
      if (joined)
        group.addMember(member);
      else
        group.removeMember(member);
      await community.updateGroup(group);
      return chain.on;
    })
    .check(updateUserGroups())
    .next(updateInfoList())
    .next(editInfoMessage())
    .init();

  // /groupme
  const respondGroupME = new StateMessageResponse(mode.GROUPME, mode.ANY, setup, emitChooseGroups, 1)
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(setMode(mode.GROUPME))
    .check(setData("community", msg => {
      return getCommunity(msg);
    }))
    .check(setData("member", async msg => {
      let user: {
        id: number,
        username?: string,
        first_name?: string;
      };
      user = msg.from! ?? null;
      const state = getState(msg);
      const community = state?.data.community as Community;
      community.groups.forEach(group => {
        for(const i in group.members) {
          const member = group.members[i];
          if(member.id === user.id)
            member.username = user.username ?? user.first_name;
          const com_member = community.members.find(m => m.id === member.id);
          if(com_member != null)
            com_member.username = member.username;
        }
      });
      await community.update();
      return new Member(user.id, user.first_name, user.username ?? user.first_name);
    }))
    .check(updateUserGroups())
    .next(breakChain())
    .init();

}