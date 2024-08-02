import { cancelButton, hideButton, mode, setup, state, updateInfoList } from "./shared.js";
import { StateMessageResponse, StateQueryResponse } from "../custom/stateResponse.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyAuthority, verifyMode } from "../custom/hooks.js";
import {DeleteButtonMenuOption } from "../core/options/button.js";
import { getThreadId, Insert, isReply } from "../core/utils.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import State from "../core/state.js";
import Community from "../community.js";
import { getCommunity, getSign, getState, setStateMode } from "../custom/utils.js";
import { ExtendedQuery } from "../core/listener.js";
import TelegramBot from "node-telegram-bot-api";

export default function setchat() {

  const menu = new DeleteButtonMenuOption(new Insert("{i.n}"), []);

  const emitGroupChosen = new StateInsertEmitter(setup, "Для цього чату обрано групу \"{data.groupName}\"", responseTarget.LOCAL)
    .addOption(hideButton);

  const emitChooseGroups = new StateInsertEmitter(setup, {
    getInstanceData: async (state: State<state>) => {
      const user_groups = state.state.data.chat_groups as [string, string][];
      interface group {
        n: string;
        $: {
          d?: number
        }
      }
      const res: group[] = user_groups.map(([text, id], index) => {
        return {
          n: text,
          $: {
            d: index
          }
        };
      });
      return res;
    },
    toString: () => 'Оберіть групу для цього чату:'
  }, responseTarget.LOCAL)
    .addOption(menu)
    .addOption(cancelButton)

  function updateChatGroups() {
    return setData<ExtendedQuery<any> | TelegramBot.Message>("chat_groups", msg => {
      const state = getState(msg);
      const community = state?.data.community as Community;
      const groups = community.groups.map(group => {
        let found = group.groupChat === state?.data.chatThreadId;
        return [getSign(found) + group.name, group.id];
      });
      return groups;
    });
  }

  // [{...community.groups}] [cancel]
  const respondMenuQuery = new StateQueryResponse(async () => true, mode.SETCHAT, setup, emitGroupChosen)
    .check(verifyAuthority(true))
    .check(async (query) => {
      const state = getState(query);
      const community = state?.data.community as Community;
      const chat = state?.data.chatThreadId;
      const data = query.data as any;
      const index = data.d;
      if(!('d' in data))
        return chain.escape;
      try {
        await setup.bot.deleteMessage(query.message?.chat.id!, query.message?.message_id!);
      } catch (err) { };
      const group = community.groups[index];

      for(const g of community.groups) {
        if(g.id !== group.id && g.groupChat === chat)
          g.groupChat = null;
      }
      
      group.groupChat = chat;

      state!.data.groupName = group.name;
      setStateMode(query, mode.NONE);

      await community.updateGroup(group);
      return chain.on;
    })
    .check(updateChatGroups())
    .check(updateInfoList())
    .init();

  // /setchat
  const respondSetChat = new StateMessageResponse(mode.SETCHAT, mode.ANY, setup, emitChooseGroups, 1)
    .check(verifyAuthority(true))
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(async msg => {
      if(isReply(msg))
        return chain.break;
      return chain.on;
    })
    .check(setMode(mode.SETCHAT))
    .check(setData("community", msg => {
      return getCommunity(msg);
    }))
    .check(setData("chatThreadId", msg => {
      return getThreadId(msg);
    }))
    .check(updateChatGroups())
    .next(breakChain())
    .init();

}