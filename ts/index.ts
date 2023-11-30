import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import Admin from "./admin.js";
import * as bot from "./bot.js";
import Community from "./community.js";
import Member from "./member.js";
import Group from "./group.js";
import { ObjectId } from "mongodb";
import "dotenv/config";

console.log("ready!");

await Community.load();

async function verifyAuthority(msg_query: Message | CallbackQuery, owner = false) {
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
  if (query.message.chat.type !== "supergroup") {
    await bot.replyToMessage(query.message, "Це не груповий суперчат!", buttons);
    return false;
  }
  let community = Community.list[query.message.chat.id];
  if (community == null) {
    await bot.replyToMessage(msg, "Спільнота не налаштована!\n\n/setup - налаштувати спільноту", buttons);
    return false;
  }
  const user = query.from ?? {} as TelegramBot.User;
  const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
  if (admin == null) {
    await bot.replyToMessage(msg, "Ви не адміністратор спільноти!", buttons);
    return false;
  }
  return true;
}

export async function onCommunityUpdate(community: Community) {
  if (community.infoMessageContent === "") return;
  const newContent = getGroupLists(community);
  if (community.infoMessageContent === newContent) return;
  community.setInfoMessageContent(newContent);
  // console.log("EDIT");
  // await bot.TryCatch(async () => {
  //   return await bot.bot.editMessageText(newContent, {
  //     chat_id: community.chatId,
  //     message_id: community.infoMessageId,
  //     parse_mode: "HTML"
  //   });
  // });
}

function getGroupLists(community: Community) {
  let groups = community.groups.map(group => {
    return `<b><u>Група "${group.name}"</u></b>\n${group.description}\n\n${mentionMembers(group.members)}`;
  });
  return ["<b><u><i>СПИСОК ГРУП</i></u></b>", ...groups].join("\n- - - - - - - - - - - - - - - - - - - - - - - - \n");
}

function mentionMembers(members: Group["members"]) {
  const mentions: string[] = [];
  for (const i in members) {
    const member = members[i];
    mentions.push(`<a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>`);
  }
  if (mentions.length === 0)
    return "НЕМАЄ УЧАСНИКІВ"
  return mentions.join(" ");
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
      setTimeout(() => descListener.remove(), +process.env.TIMEOUT!);
      setTimeout(() => descCancelListener.remove(), +process.env.TIMEOUT!);
      return true;
    });
    setTimeout(() => nameListener.remove(), +process.env.TIMEOUT!);
    setTimeout(() => nameCancelListener.remove(), +process.env.TIMEOUT!);
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
        setTimeout(() => descListener.remove(), +process.env.TIMEOUT!);
        setTimeout(() => descCancelListener.remove(), +process.env.TIMEOUT!);
        return true;
      });
      setTimeout(() => nameListener.remove(), +process.env.TIMEOUT!);
      setTimeout(() => nameCancelListener.remove(), +process.env.TIMEOUT!);
      return true;
    });
    setTimeout(() => editQueryListener.remove(), +process.env.TIMEOUT!);
    setTimeout(() => editCancelQueryListener.remove(), +process.env.TIMEOUT!);
    return true;
  });

  bot.addCommandListener("setinfo", async msg => {
    if (!await verifyAuthority(msg, true)) return true;
    const community = Community.list[msg.chat.id];
    const infoMessage = await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), getGroupLists(community));
    await community.setInfoMessageContent(infoMessage.text ?? "");
    if (infoMessage == null) {
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
      await bot.replyToMessage(msg, "Помилка", buttons);
      return true;
    }
    await community.setInfoMessageId(infoMessage.message_id);
    await bot.deleteMessage(msg.chat.id, msg.message_id);
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

  async function updateInfo(community: Community) {
    if (community.infoMessageContent === "") return;
    const newContent = getGroupLists(community);
    if (community.infoMessageContent === newContent) return;
    community.setInfoMessageContent(newContent);
    await bot.TryCatch(async () => {
      return await bot.bot.editMessageText(newContent, {
        chat_id: community.chatId,
        message_id: community.infoMessageId,
        parse_mode: "HTML"
      });
    });
  }

  function initGroupMe(_user?: TelegramBot.User) {
    return async (initMsg: Message) => {
      const user = _user ?? initMsg.from;
      if (user == null) return false;
      const community = Community.list[initMsg.chat.id];
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
        return [group.name + getSign(found), [group.id, !found]] as bot.option;
      });
      const buttons = bot.getButtonsMarkup(bot.arrange(groups, 2, [["ГОТОВО", initMsg.message_id]]), [...groups.map(() => "set_group"), "close_menu"]);
      let buttons_hash = JSON.stringify(buttons);
      const menuMessage = await bot.replyToMessage(initMsg, `<a href="tg://user?id=${member.id}">@${member.username ?? member.name}</a>, обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!\n\nТи зможеш надалі змінювати список своїх груп за допомогою команди /groupme`, buttons);
      const menuCloseQueryListener = bot.addQueryListener("close_menu", async (query, msg_id) => {
        if (query?.from.id !== user.id) return false;
        const msg = query.message;
        if (msg == null) return false;
        menuCloseQueryListener.remove();
        menuQueryListener.remove();
        await bot.deleteMessage(msg.chat.id, msg.message_id);
        await bot.deleteMessage(msg.chat.id, msg_id);
        await updateInfo(community);
        return true;
      });
      const menuQueryListener = bot.addQueryListener("set_group", async (query, [group_id, state]: [string, boolean]) => {
        if (query?.from.id !== user.id) return false;
        const msg = query.message;
        if (msg == null) return false;
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
          return [group.name + getSign(found), [group.id, !found]] as bot.option;
        });
        const buttons = bot.getButtonsMarkup(bot.arrange(groups, 2, [["ГОТОВО", initMsg.message_id]]), [...groups.map(() => "set_group"), "close_menu"]);
        let new_buttons_hash = JSON.stringify(buttons);
        if (new_buttons_hash === buttons_hash) return true;
        buttons_hash = new_buttons_hash;
        await bot.TryCatch(async () => {
          return await bot.bot.editMessageReplyMarkup(buttons, {
            chat_id: community.chatId,
            message_id: menuMessage.message_id
          });
        });
        // setTimeout(async () => {
        //   menuQueryListener.restore();
        // }, 10);
        return true;
      });
      setTimeout(() => menuCloseQueryListener.remove(), +process.env.TIMEOUT!);
      setTimeout(() => menuQueryListener.remove(), +process.env.TIMEOUT!);
      return true;
    };
  }

  bot.addCommandListener("groupme", initGroupMe());

  function getSign(bool: boolean) {
    if (bool) return "✅";
    return "";
  }

  // bot.bot.on("chat_member", async msg => {
  //   if (msg.new_chat_member == null) return false;
  //   const community = Community.list[msg.chat.id];
  //   if (community == null) return false;
  //   await initGroupMe(msg.new_chat_member.user)(msg);
  //   return true;
  // });
}

