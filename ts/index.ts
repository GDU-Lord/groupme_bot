import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import Admin from "./admin.js";
import * as bot from "./bot.js";
import Community from "./community.js";
import Member from "./member.js";
import Group from "./group.js";
import { Join, ObjectId } from "mongodb";
import "dotenv/config";
import JoinRequest from "./joinRequest.js";

console.log("ready!");

await Community.load();
await JoinRequest.load();

async function verifyAuthority(msg_query: Message | CallbackQuery, owner = false, community?: Community) {
  const msg = msg_query as Message;
  const query = msg_query as CallbackQuery;
  if (msg.chat != null) {
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    if (msg.chat.type !== "supergroup") {
      await bot.replyToMessage(msg, "Це не груповий суперчат!", buttons);
      return false;
    }
    let community = Community.list[msg.chat.id];
    if (community == null) {
      await bot.replyToMessage(msg, "Спільнота не налаштована!\n\n/setup - налаштувати спільноту", buttons);
      return false;
    }
    const user = msg.from! ?? {} as TelegramBot.User;
    const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
    if (admin == null) {
      await bot.replyToMessage(msg, "Ви не адміністратор спільноти!", buttons);
      return false;
    }
    return true;
  }
  const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
  if (query.message == null) {
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendMessage(query.from.id, "Помилка!", buttons);
    return false;
  }
  if(query.message.chat.type !== "private") {
    if (query.message.chat.type !== "supergroup") {
      await bot.replyToMessage(query.message, "Це не груповий суперчат!", buttons);
      return false;
    }
    community = Community.list[query.message.chat.id];
    if (community == null) {
      await bot.replyToMessage(msg, "Спільнота не налаштована!\n\n/setup - налаштувати спільноту", buttons);
      return false;
    }
  }
  const user = query.from ?? {} as TelegramBot.User;
  if(community == null) {
    await bot.replyToMessage(msg, "Помилка!", buttons);
    return false;
  }
  const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
  if (admin == null) {
    await bot.replyToMessage(msg, "Ви не адміністратор спільноти!", buttons);
    return false;
  }
  return true;
}

export async function onCommunityUpdate(community: Community) {
  
}

function getGroupLists(community: Community) {
  const allMembers = community.getMemberCount();
  let groups = community.groups.map(group => {
    const [mentions, number] = mentionMembers(group.members);
    const percentage = (number / allMembers.length * 100).toFixed(0);
    console.log(percentage, number, allMembers.length);
    return `<b><u>Група "${group.name}"</u></b> ${percentage}% (${number})\n${group.description}\n\n${mentions}`;
  });
  return ["<b><u><i>СПИСОК ГРУП</i></u></b>", ...groups].join("\n- - - - - - - - - - - - - - - - - - - - - - - - \n");
}

function mentionMembers(members: Group["members"]): [string, number] {
  const mentions: string[] = [];
  for (const i in members) {
    const member = members[i];
    mentions.push(`<a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>`);
  }
  if (mentions.length === 0)
    return ["НЕМАЄ УЧАСНИКІВ", 0]
  return [mentions.join(" "), mentions.length];
}

function setupListeners() {
  // command listeners
  bot.addCommandListener("setup", async (msg) => {
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    if (msg.chat.type !== "supergroup") {
      await bot.replyToMessage(msg, "Це не груповий суперчат!", buttons);
      return false;
    }
    let community = Community.list[msg.chat.id];
    if (community != null) {
      await bot.replyToMessage(msg, "Спільнота вже налаштована!", buttons);
      return false;
    }
    community = new Community(msg.chat.id, [], []);
    await community.initPromise;
    const user = msg.from!;
    const admin = new Admin(user.id, user.first_name, user.username, community.chatId, true);
    await admin.initPromise;
    await bot.replyToMessage(msg, "Спільноту успішно налаштовано!\n/addgroup - додати нову групу\n/editgroup - редагувати групу\n/delgroup - видалити існуючу групу\n/addadmin - додати адміністратора\n/deladmin - видалити адміністратора\n/passowner - передати управління спільнотою\n\n/grouplist - cписок груп\n/adminlist - список адміністраторів\n\n/setinfo - обрати канал для списку груп", buttons);
    return true;
  });

  bot.addCommandListener("addgroup", async msg => {
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    if (!await verifyAuthority(msg)) return true;
    await bot.replyToMessage(msg, "Введіть назву групи\n\n/cancel - cкасувати команду", buttons);
    const nameCancelListener = bot.addCommandListener("cancel", async nameCancelMsg => {
      if (nameCancelMsg.from?.id !== msg.from?.id) return false;
      nameListener.remove();
      nameCancelListener.remove();
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameCancelMsg.message_id]]), "hide_message");
      await bot.replyToMessage(nameCancelMsg, 'Команду скасовано', buttons);
      return true;
    });
    const nameListener = bot.addMessageListener(async nameMsg => {
      if (nameMsg.from?.id !== msg.from?.id) return false;
      const name = nameMsg.text;
      if (name == null || name === "") return false;
      nameListener.remove();
      nameCancelListener.remove();
      if (!await verifyAuthority(msg)) return true;
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameMsg.message_id]]), "hide_message");
      await bot.replyToMessage(nameMsg, 'Введіть опис групи "' + name + '"\n\n/cancel - cкасувати команду', buttons);
      const descCancelListener = bot.addCommandListener("cancel", async descCancelMsg => {
        if (descCancelMsg.from?.id !== msg.from?.id) return false;
        descListener.remove();
        descCancelListener.remove();
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descCancelMsg.message_id]]), "hide_message");
        await bot.replyToMessage(descCancelMsg, 'Команду скасовано', buttons);
        return true;
      });
      const descListener = bot.addMessageListener(async descMsg => {
        if (descMsg.from?.id !== msg.from?.id) return false;
        const desc = descMsg.text;
        if (desc == null || desc === "") return false;
        descListener.remove();
        descCancelListener.remove();
        if (!await verifyAuthority(msg)) return true;
        const community = Community.list[msg.chat.id];
        const group = new Group(name, desc, community.chatId);
        await community.addGroup(group);
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descMsg.message_id]]), "hide_message");
        await bot.replyToMessage(descMsg, 'Групу "' + name + '" додано до списку!', buttons);
        return true;
      });
      setTimeout(() => descListener.remove(), +process.env.COMMAND_TIMEOUT!);
      setTimeout(() => descCancelListener.remove(), +process.env.COMMAND_TIMEOUT!);
      return true;
    });
    setTimeout(() => nameListener.remove(), +process.env.COMMAND_TIMEOUT!);
    setTimeout(() => nameCancelListener.remove(), +process.env.COMMAND_TIMEOUT!);
    return true;
  });

  bot.addCommandListener("delgroup", async msg => {
    if (!await verifyAuthority(msg, true)) return true;
    const community = Community.list[msg.chat.id];
    const groups = community.groups.map(group => {
      return [group.name, [group.id, msg.message_id]] as bot.option;
    });
    const buttons = bot.getButtonsMarkup(bot.arrange(groups, 4, [["Скасувати", msg.message_id]]), [...groups.map(() => "delete_group"), "hide_message"]);
    await bot.replyToMessage(msg, "Оберіть групу, яку хочете <b>ВИДАЛИТИ</b>", buttons);
    return true;
  });

  bot.addCommandListener("editgroup", async initMsg => {
    if (!await verifyAuthority(initMsg)) return true;
    const community = Community.list[initMsg.chat.id];
    const groups = community.groups.map(group => {
      return [group.name, [group.id, initMsg.message_id]] as bot.option;
    });
    const buttons = bot.getButtonsMarkup(bot.arrange(groups, 4, [["Скасувати", initMsg.message_id]]), [...groups.map(() => "edit_group"), "cancel_edit"]);
    await bot.replyToMessage(initMsg, "Оберіть групу, яку хочете <b>РЕДАГУВАТИ</b>", buttons);
    const editCancelQueryListener = bot.addQueryListener("cancel_edit", async (query, msg_id) => {

      if (query.from?.id !== initMsg.from?.id) return false;
      const msg = query.message;
      if (msg == null) return false;
      editQueryListener.remove();
      editCancelQueryListener.remove();
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Команду скасовано', buttons);
      return true;
    });
    const editQueryListener = bot.addQueryListener("edit_group", async (query, [group_id, msg_id]: [ObjectId, number]) => {

      if (query.from?.id !== initMsg.from?.id) return false;
      const msg = query.message;
      if (msg == null) return false;
      editQueryListener.remove();
      editCancelQueryListener.remove();
      if (!await verifyAuthority(query)) return true;
      const community = Community.list[msg.chat.id];
      const group = community.groups.find(group => group.id.toString() === group_id.toString());
      if (group == null) {
        const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
        await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Помилка!', buttons);
        return true;
      }
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Введіть нову назву групи "' + group.name + '"\n\n/cancel - cкасувати команду', buttons);
      const nameCancelListener = bot.addCommandListener("cancel", async nameCancelMsg => {
        if (nameCancelMsg.from?.id !== initMsg.from?.id) return false;
        nameListener.remove();
        nameCancelListener.remove();
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameCancelMsg.message_id]]), "hide_message");
        await bot.replyToMessage(nameCancelMsg, 'Команду скасовано', buttons);
        return true;
      });
      const nameListener = bot.addMessageListener(async nameMsg => {
        if (nameMsg.from?.id !== initMsg.from?.id) return false;
        const name = nameMsg.text;
        if (name == null || name === "") return false;
        nameListener.remove();
        nameCancelListener.remove();
        if (!await verifyAuthority(query)) return true;
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameMsg.message_id]]), "hide_message");
        await bot.replyToMessage(nameMsg, 'Введіть опис групи "' + name + '"\n\n/cancel - cкасувати команду', buttons);
        const descCancelListener = bot.addCommandListener("cancel", async descCancelMsg => {
          if (descCancelMsg.from?.id !== initMsg.from?.id) return false;
          descListener.remove();
          descCancelListener.remove();
          const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descCancelMsg.message_id]]), "hide_message");
          await bot.replyToMessage(descCancelMsg, 'Команду скасовано', buttons);
          return true;
        });
        const descListener = bot.addMessageListener(async descMsg => {
          if (descMsg.from?.id !== initMsg.from?.id) return false;
          const desc = descMsg.text;
          if (desc == null || desc === "") return false;
          descListener.remove();
          descCancelListener.remove();
          if (!await verifyAuthority(initMsg)) return true;
          const community = Community.list[initMsg.chat.id];
          const group = community.groups.find(group => group.id.toString() === group_id.toString());
          if (group == null) {
            const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
            await bot.sendThreadMessage(initMsg.chat.id, bot.getThreadId(initMsg), 'Помилка!', buttons);
            return true;
          }
          group.name = name;
          group.description = desc;
          await community.updateGroup(group);
          const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descMsg.message_id]]), "hide_message");
          await bot.replyToMessage(descMsg, 'Групу "' + name + '" оновлено!', buttons);
          return true;
        });
        setTimeout(() => descListener.remove(), +process.env.COMMAND_TIMEOUT!);
        setTimeout(() => descCancelListener.remove(), +process.env.COMMAND_TIMEOUT!);
        return true;
      });
      setTimeout(() => nameListener.remove(), +process.env.COMMAND_TIMEOUT!);
      setTimeout(() => nameCancelListener.remove(), +process.env.COMMAND_TIMEOUT!);
      return true;
    });
    setTimeout(() => editQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
    setTimeout(() => editCancelQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
    return true;
  });

  bot.addCommandListener("setinfo", async msg => {
    if (!await verifyAuthority(msg, true)) return true;
    const community = Community.list[msg.chat.id];
    const infoMessage = await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), getGroupLists(community));
    if (infoMessage == null) {
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
      await bot.replyToMessage(msg, "Помилка", buttons);
      return true;
    }
    await community.setInfoMessageContent(infoMessage.text ?? "");
    await community.setInfoMessageId(infoMessage.message_id);
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    return true;
  });

  bot.addCommandListener("setchat", async msg => {
    if (!await verifyAuthority(msg, true)) return true;
    const community = Community.list[msg.chat.id];
    await community.setBotThreadId(bot.getThreadId(msg));
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    await bot.replyToMessage(msg, "Чат для взаємодії з ботом встановлено!", buttons);
    return true;
  });

  bot.addCommandListener("update", async msg => {
    if (!await verifyAuthority(msg, true)) return true;
    const community = Community.list[msg.chat.id];
    if(community == null) return true;
    updateInfo(community);
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    await bot.replyToMessage(msg, "Список груп оновлено!", buttons);
    return true;
  });

  bot.addCommandListener("addmember", async initMsg => {
    if (!await verifyAuthority(initMsg)) return true;
    const community = Community.list[initMsg.chat.id];
    const groups = community.groups.map(group => {
      return [group.name, [group.id, initMsg.message_id]] as bot.option;
    });
    const buttons = bot.getButtonsMarkup(bot.arrange(groups, 4, [["Скасувати", initMsg.message_id]]), [...groups.map(() => "add_member"), "cancel_add_member"]);
    await bot.replyToMessage(initMsg, "Оберіть групу, в яку хочете додати учасника", buttons);
    const addCancelQueryListener = bot.addQueryListener("cancel_add_member", async (query, msg_id) => {
      if (query.from?.id !== initMsg.from?.id) return false;
      const msg = query.message;
      if (msg == null) return false;
      addQueryListener.remove();
      addCancelQueryListener.remove();
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Команду скасовано', buttons);
      return true;
    });
    const addQueryListener = bot.addQueryListener("add_member", async (query, [group_id, msg_id]: [ObjectId, number]) => {
      if (query.from?.id !== initMsg.from?.id) return false;
      const msg = query.message;
      if (msg == null) return false;
      addQueryListener.remove();
      addCancelQueryListener.remove();
      if (!await verifyAuthority(query)) return true;
      const community = Community.list[msg.chat.id];
      const group = community.groups.find(group => group.id.toString() === group_id.toString());
      if (group == null) {
        const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
        await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Помилка!', buttons);
        return true;
      }
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Згадайте учасника спільноти, якого хочете додати до групи "' + group.name + '" (використовуйте "@")\n\n/cancel - cкасувати команду', buttons);
      const mentionCancelListener = bot.addCommandListener("cancel", async mentionCancelMsg => {
        if (mentionCancelMsg.from?.id !== initMsg.from?.id) return false;
        mentionListener.remove();
        mentionCancelListener.remove();
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", mentionCancelMsg.message_id]]), "hide_message");
        await bot.replyToMessage(mentionCancelMsg, 'Команду скасовано', buttons);
        return true;
      });
      const mentionListener = bot.addMessageListener(async mentionMsg => {
        if (mentionMsg.from?.id !== initMsg.from?.id) return false;
        const name = mentionMsg.text;
        if (name == null || name === "") return false;
        mentionListener.remove();
        mentionCancelListener.remove();
        if (!await verifyAuthority(query)) return true;
        // ADD MEMBER
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", mentionMsg.message_id]]), "hide_message");
        await bot.replyToMessage(mentionMsg, 'Учасника "' + name +'" додано до групи "' + group.name + '"!', buttons);
        return true;
      });
      setTimeout(() => mentionListener.remove(), +process.env.COMMAND_TIMEOUT!);
      setTimeout(() => mentionCancelListener.remove(), +process.env.COMMAND_TIMEOUT!);
      return true;
    });
    setTimeout(() => addQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
    setTimeout(() => addCancelQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
    return true;
  });

  // message listeners


  // callback listeners
  bot.addQueryListener("hide_message", async (query, msg_id: number) => {
    const msg = query.message;
    if (msg == null) return false;
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    if (msg_id == null) return true;
    await bot.deleteMessage(msg.chat.id, msg_id);
    return true;
  });

  bot.addQueryListener("delete_group", async (query, [group_id, msg_id]: [ObjectId, number]) => {
    const msg = query.message;
    if (msg == null) return false;
    if (!await verifyAuthority(query, true)) return true;
    const community = Community.list[msg.chat.id];
    const group = community.groups.find(group => group.id.toString() === group_id.toString());
    if (group == null) {
      const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Помилка!', buttons);
      return true;
    }
    await community.removeGroup(group);
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    await bot.deleteMessage(msg.chat.id, msg_id);
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Групу "' + group.name + '" видалено!', buttons);
    return true;
  });

  bot.addQueryListener("accept_join", async (query, data) => {
    const msg = query.message;
    if (msg == null) return false;
    if(data == null) return false;
    const req = JoinRequest.list[data];
    if(req == null) return false;
    const community = Community.list[req.community];
    if(community == null) return false;
    if (!await verifyAuthority(query, true, community)) return true;
    await req.accept();
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendMessage(msg.chat.id, "Користувача додано до спільноти!", buttons);
    return true;
  });

  bot.addQueryListener("reject_join", async (query, data) => {
    const msg = query.message;
    if (msg == null) return false;
    if(data == null) return false;
    const req = JoinRequest.list[data];
    if(req == null) return false;
    const community = Community.list[req.community];
    if(community == null) return false;
    if (!await verifyAuthority(query, true, community)) return true;
    await req.reject();
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendMessage(msg.chat.id, "Заявку користувача відхилено!", buttons);
    return true;
  });

  function updateInfo(community: Community) {
    const newContent = getGroupLists(community);
    if (community.infoMessageContent === newContent) return;
    community.setInfoMessageContent(newContent);
    bot.bot.editMessageText(newContent, {
      chat_id: community.chatId,
      message_id: community.infoMessageId,
      parse_mode: "HTML"
    }).then(() => {}).catch(() => {});
  }

  function initGroupMe(id?: number, username?: string, first_name?: string, communityChatId?: TelegramBot.ChatId) {
    if(id != null && (first_name ?? username) != null && communityChatId == null)
      throw "initGroupme Error: communityChatId not defined!";
    return async (initMsg: Message | null) => {
      let user: {
        id: number,
        username?: string,
        first_name?: string;
      };
      if(id != null && (first_name ?? username) != null) {
        user = {
          id, username,
          first_name
        }
      }
      else
        user = initMsg?.from! ?? null;
      if(user == null) return false;
      if(initMsg != null && initMsg.chat.type !== "supergroup") {
        const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
        await bot.replyToMessage(initMsg, "Це не груповий чат!", buttons);
        return false;
      }
      const community = Community.list[initMsg?.chat.id ?? communityChatId!];
      if (community == null) return false;
      const member = new Member(user.id, user.first_name, user.username);
      const groups = community.groups.map(group => {
        let found = false;
        for (const i in group.members) {
          const m = group.members[i];
          if (m.id !== member.id) continue;
          found = true;
          break;
        }
        return [getSign(found) + group.name, [group.id, !found]] as bot.option;
      });
      let buttons = bot.getButtonsMarkup(bot.arrange(groups, +process.env.BUTTONS_MARKUP!, [["ГОТОВО", initMsg?.message_id ?? null]]), [...groups.map(() => "set_group"), "close_menu"]);
      let buttons_hash = JSON.stringify(buttons);
      let menuMessage: Message | null = null;
      let menuPrivateMessage: Message | null = null;
      if(initMsg != null)
        menuMessage = await bot.replyToMessage(initMsg, `<a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme`, buttons);
      else {
        menuPrivateMessage = await bot.sendMessage(user.id, `Ласкаво просимо! <a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme у груповому чаті!`, buttons);
        if(community.botThreadId === -1)
          menuMessage = await bot.sendMessage(community.chatId, `Ласкаво просимо! <a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme`, buttons);
        else
          menuMessage = await bot.sendThreadMessage(community.chatId, community.botThreadId, `Ласкаво просимо! <a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme`, buttons);
      }
      if(menuMessage == null) return true;
      const abortListener = bot.addCommandListener("groupme", async msg => {
          if(msg.from?.id !== user.id) return false;
          abortListener.remove();
          menuCloseQueryListener.remove();
          menuQueryListener.remove();
          if(menuMessage == null) return false;
          await bot.deleteMessage(msg.chat.id, menuMessage.message_id);
          if(initMsg == null) return false;
          await bot.deleteMessage(msg.chat.id, initMsg.message_id);
          if(menuPrivateMessage == null) return false;
          await bot.deleteMessage(menuPrivateMessage.chat.id, menuPrivateMessage.message_id);
          return false;
      });
      const menuCloseQueryListener = bot.addQueryListener("close_menu", async (query, msg_id) => {
        if (query?.from.id !== user.id) return false;
        const msg = query.message;
        if (msg == null) return false;
        if(menuMessage == null) return false;
        if(msg.message_id !== menuMessage.message_id) return false;
        menuCloseQueryListener.remove();
        menuQueryListener.remove();
        abortListener.remove();
        await bot.deleteMessage(msg.chat.id, msg.message_id);
        if(msg_id != null)
          await bot.deleteMessage(msg.chat.id, msg_id);
        updateInfo(community);
        return true;
      });
      const menuQueryListener = bot.addQueryListener("set_group", async (query, [group_id, state]: [string, boolean]) => {
        if (query?.from.id !== user.id) return false;
        const msg = query.message;
        if (msg == null) return false;
        if(menuMessage == null) return false;
        if(msg.message_id !== menuMessage.message_id) return false;
        const community = Community.list[msg.chat.id];
        if (community == null) return false;
        const group = community.groups.find(g => g.id.toString() === group_id.toString());
        if (group == null) return false;
        // menuQueryListener.remove();
        if (state)
          group.addMember(member);
        else
          group.removeMember(member);
        await community.updateGroup(group);
        const groups = community.groups.map(group => {
          let found = false;
          for (const i in group.members) {
            const m = group.members[i];
            if (m.id !== member.id) continue;
            found = true;
            break;
          }
          return [getSign(found) + group.name, [group.id, !found]] as bot.option;
        });
        const buttons = bot.getButtonsMarkup(bot.arrange(groups, +process.env.BUTTONS_MARKUP!, [["ГОТОВО", initMsg?.message_id ?? null]]), [...groups.map(() => "set_group"), "close_menu"]);
        let new_buttons_hash = JSON.stringify(buttons);
        if (new_buttons_hash === buttons_hash) return true;
        buttons_hash = new_buttons_hash;
        try {
          await bot.bot.editMessageReplyMarkup(buttons, {
            chat_id: community.chatId,
            message_id: menuMessage.message_id
          });
        } catch {}
        // setTimeout(async () => {
        //   menuQueryListener.restore();
        // }, 10);
        return true;
      });
      setTimeout(() => menuCloseQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
      setTimeout(() => menuQueryListener.remove(), +process.env.COMMAND_TIMEOUT!);
      setTimeout(() => abortListener.remove(), +process.env.COMMAND_TIMEOUT!);
      return false;
    };
  }

  bot.addCommandListener("groupme", initGroupMe());

  function getSign(bool: boolean) {
    if (bool) return "✅";
    return "";
  }

  JoinRequest.onAccept = (req: JoinRequest, com: Community): Promise<void> => {
    return new Promise((res, rej) => {
      bot.bot.approveChatJoinRequest(com.chatId, req.id).then(async () => {
        setTimeout(() => initGroupMe(req.id, req.username, req.name, com.chatId)(null), +process.env.NEW_USER_TIMEOUT!);
        res();
      }).catch((err) => {});
    });
  };

  JoinRequest.onReject = (req: JoinRequest, com: Community): Promise<void> => {
    return new Promise((res, rej) => {
      bot.bot.declineChatJoinRequest(com.chatId, req.id).then(() => {
        res();
      }).catch(() => {});
    });
  };

  bot.addEventListener("chat_join_request", async msg => {
    const user = msg.from;
    const chat = msg.chat;
    const community = Community.list[chat.id];
    if(community == null) return;
    const req = new JoinRequest(user.id, user.username, user.first_name, community.chatId);
    await req.initPromise;
    const owner = community.getOwner();
    if(owner == null) return;
    const buttons = bot.getButtonsMarkup(bot.arrange([["Прийняти", req._id], ["Відхилити", req._id]]), ["accept_join", "reject_join"]);
    await bot.sendMessage(owner.id, `Користувач <a href="tg://user?id=${req.id}">@${req.username ?? req.name}</a> хоче приєднатися до групи!`, buttons);
  });

  bot.onUnhandledQuery(async query => {
    try {
      if(query.data == null || query.data === "") return;
      const json = JSON.parse(query.data);
      if(json == null) return;
      if(json[0] !== "hide_message" && json[0] !== "close_menu" && json[0] !== null) return;
      const msg = query.message;
      if(msg == null) return;
      const replyTo = msg.reply_to_message?.message_id;
      await bot.deleteMessage(msg.chat.id, msg.message_id);
      if(replyTo == null) return;
      await bot.deleteMessage(msg.chat.id, replyTo);
    } catch {}
  });

  console.log("listening...");

}

setTimeout(() => setupListeners(), +process.env.STARTUP_TIMEOUT!);

