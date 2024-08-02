import { cancelButton, editInfoMessage, mode, setup, state, updateInfoList } from "./shared.js";
import { StateMessageResponse, StateQueryResponse } from "../custom/stateResponse.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyAuthority, verifyMode } from "../custom/hooks.js";
import {DeleteButtonMenuOption } from "../core/options/button.js";
import { Insert } from "../core/utils.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import State from "../core/state.js";
import Community from "../community.js";
import { getCommunity, getSign, getState, setStateMode } from "../custom/utils.js";
import { ExtendedQuery } from "../core/listener.js";
import Member from "../member.js";
import TelegramBot from "node-telegram-bot-api";
import MessageOption from "../core/options/message.js";

export default function member() {
  
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
    toString: () => 'Оберіть групи для <a href="tg://user?id={data.member.id}">@{data.member.username}</a> та натисніть "ГОТОВО"!\n\nВін зможе надалі змінювати список своїх груп за допомогою команди /groupme'
  }, responseTarget.LOCAL)
    .addOption(menu)

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
  const respondMenuQuery = new StateQueryResponse(async () => true, mode.MEMBER, setup, emitChooseGroups)
    .check(verifyAuthority(false))
    .check(async (query) => {
      const state = getState(query);
      const community = state?.data.community as Community;
      const member = state?.data.member;
      const data = query.data as any;
      const ready = data.r;
      const index = data.d;
      const joined = data.s;
      if(!('r' in data) && !('d' in data) && !('s' in data))
        return chain.escape;
      try {
        await setup.bot.deleteMessage(query.message?.chat.id!, query.message?.message_id!);
      } catch (err) {
      };

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

  // {member: @mention}
  const respondEditMember = new StateMessageResponse("", mode.MEMBER, setup, emitChooseGroups)
    .check(verifyAuthority(false))
    .check(setData("member", msg => {
      if(msg.entities == null)
        return chain.escape;
      for(const e of msg.entities) {
        if(e.type === "text_mention") {
          const user = e.user ?? null;
          if(user == null) return null;
          return new Member(user.id, user.first_name, user.username ?? user.first_name);
        }
        if(e.type === "mention") {
          const username = msg.text?.match(/@[A-Za-z0-9_]{0,}/g)?.[0].replace("@", "");
          const community = getState(msg)?.data.community! as Community;
          for(const m of community.members) {
            if(m.username === username)
              return m;
          }
          return null;
        }
      }
      return null;
    }))
    .check(async msg => {
      const state = getState(msg);
      if(state?.data.member == null)
        return chain.escape;
      return chain.on;
    })
    .check(updateUserGroups())
    .next(breakChain());

  const tagMemberOption = new MessageOption()
    .setResponse(respondEditMember);

  const emitTagMember = new StateInsertEmitter(setup, "Тегніть користувача, групи якого ви хочете змінити", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(tagMemberOption);

  // /member
  const respondMember = new StateMessageResponse(mode.MEMBER, mode.ANY, setup, emitTagMember, 1)
    .check(verifyAuthority(false))
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(setMode(mode.MEMBER))
    .check(setData("community", msg => {
      return getCommunity(msg);
    }))
    .check(setData("member", msg => null))
    .next(breakChain())
    .init();

}