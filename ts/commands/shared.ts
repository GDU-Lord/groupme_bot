import TelegramBot, { Metadata } from "node-telegram-bot-api";
import BotSetup from "../core/botSetup.js";
import MessageEmitter from "../core/message.js";
import { ButtonDeleteOption } from "../core/options/button.js";
import { responseTarget, QueryResponse, chain } from "../core/response.js";
import { setData, setMode } from "../custom/hooks.js";
import Insert from "../custom/insert.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import Community from "../community.js";
import Group from "../group.js";
import { ExtendedQuery, MessageListener } from "../core/listener.js";
import { init } from "../index.js";
import { getCommunity, getState } from "../custom/utils.js";

const bot = new TelegramBot(
  process.env.TOKEN as string,
  {
    polling: {
      interval: 2000,
      params: {
        allowed_updates: ["chat_member", "message", "chat_join_request", "callback_query", "chat_member_updated"]
      }
    }
  }
);

export enum mode {
  ADDGROUP = "/addgroup",
  DELGROUP = "/delgroup",
  SETINFO = "/setinfo",
  GROUPME = "/groupme",
  MEMBER = "/member",
  EDITGROUP = "/editgroup",
  SETCHAT = "/setchat",
  CALL = "/call",
  GATHER = "/gather",
  CANCEL = "/cancel",
  BOTCHAT = "/botchat",
  NONE = "NONE",
  ANY = "ANY",
};

export interface state {
  mode: mode;
  data: {
    [key: string]: any;
  };
}

export const setup = new BotSetup<state>(bot, {
  mode: mode.NONE,
  data: {},
}, {
  sendMessageOptions: {
    parse_mode: "HTML",
  }
}, init);

export const hideButton = new ButtonDeleteOption("Сховати", null, false)
  .setCallback(async () => true);

export const emitCancel = new MessageEmitter(setup, "Команду скасовано", responseTarget.LOCAL)
  .addOption(hideButton);

export const responseCancel = new QueryResponse(async () => true, setup, emitCancel, 2)
  .next(setMode(mode.NONE))
  .next(async (msg) => {
    return chain.on;
  });

export const cancelButton = new ButtonDeleteOption("Скасувати")
  .setResponse(responseCancel);

export const groupInfo = new Insert('<b><u>Група "{title}"</u></b> {percentage}% ({number})\n{description}\n\n{members}');
export const memberMention = new Insert('<a href="tg://user?id={id}">@{username}</a>');
export const memberMentionSymbol = new Insert('<a href="tg://user?id={id}">👤</a>');
export const emitGroupsInfo = new StateInsertEmitter(setup, "<b><i><u>СПИСОК ГРУП</u></i></b>\n- - - - - - - - - - - - - - - - - - - - - - - -\n{data.groupsInfo}", responseTarget.LOCAL);

export function getGroupLists(community: Community) {
  const allMembers = community.getMemberCount();
  let groups = community.groups.map(group => {
    const [members, number] = mentionMembers(group.members);
    const percentage = (number / allMembers.length * 100).toFixed(0);
    return groupInfo.getText({
      title: group.name,
      percentage,
      number,
      description: group.description,
      members
    });
  });
  return groups.join("\n- - - - - - - - - - - - - - - - - - - - - - - - \n");
}

export function mentionMembers(members: Group["members"], symbols: boolean = false): [string, number] {
  const mentions: string[] = [];
  for (const i in members) {
    const member = members[i];
    const mention = symbols ? memberMentionSymbol : memberMention;
    mentions.push(mention.getText({
      id: member.id,
      username: member.username ?? member.name
    }));
  }
  if (mentions.length === 0)
    return ["НЕМАЄ УЧАСНИКІВ", 0]
  return [mentions.join(" "), mentions.length];
}

export async function updateInfo(community: Community, msg: TelegramBot.Message | ExtendedQuery<any>, meta?: TelegramBot.Metadata) {
  try {
    await setup.bot.deleteMessage(community.chatId, community.infoMessageId);
  }
  catch {}
  const new_msg = await emitGroupsInfo.emit(community.chatId, undefined, community.infoThreadId, undefined, msg);
  await community.setInfoMessageId(new_msg.message_id);
  // await emitGroupsInfo.edit<[ExtendedQuery<any> | TelegramBot.Message, Metadata?]>(community.chatId, undefined, community.infoMessageId, msg, meta);
}

export function updateInfoList<msg extends (TelegramBot.Message | ExtendedQuery<any>) = TelegramBot.Message>() {
  return setData<msg>("groupsInfo", msg => {
    const community = getCommunity(msg)!;
    return getGroupLists(community);
  });
}

export function editInfoMessage() {
  return async (msg: TelegramBot.Message | ExtendedQuery<any>, meta?: Metadata) => {
    const community = getCommunity(msg)!;
    await updateInfo(community, msg, meta);
    return chain.on;
  }
}