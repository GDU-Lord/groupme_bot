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
  if(msg.chat != null) {
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
    if(msg.chat.type !== "supergroup") {
      await bot.replyToMessage(msg, "Це не груповий суперчат!", buttons);
      return false;
    }
    let community = Community.list[msg.chat.id];
    if(community == null) {
      await bot.replyToMessage(msg, "Спільнота не налаштована!\n\n/setup - налаштувати спільноту", buttons);
      return false;
    }
    const user = msg.from! ?? {} as TelegramBot.User;
    const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
    if(admin == null) {
      await bot.replyToMessage(msg, "Ви не адміністратор спільноти!", buttons);
      return false;
    }
    return true;
  }
  const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
  if(query.message == null) {
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendMessage(query.from.id, "Помилка!", buttons);
    return false;
  }
  if(query.message.chat.type !== "supergroup") {
    await bot.replyToMessage(query.message, "Це не груповий суперчат!", buttons);
    return false;
  }
  let community = Community.list[query.message.chat.id];
  if(community == null) {
    await bot.replyToMessage(msg, "Спільнота не налаштована!\n\n/setup - налаштувати спільноту", buttons);
    return false;
  }
  const user = query.from ?? {} as TelegramBot.User;
  const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
  if(admin == null) {
    await bot.replyToMessage(msg, "Ви не адміністратор спільноти!", buttons);
    return false;
  }
  return true;
}

// command listeners
bot.addCommandListener("setup", async (msg) => {
  const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg.message_id]]), "hide_message");
  if(msg.chat.type !== "supergroup") {
    await bot.replyToMessage(msg, "Це не груповий суперчат!", buttons);
    return false;
  }
  let community = Community.list[msg.chat.id];
  if(community != null) {
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
  if(!await verifyAuthority(msg)) return true;
  await bot.replyToMessage(msg, "Введіть назву групи\n\n/cancel - cкасувати команду", buttons);
  const nameCancelListener = bot.addCommandListener("cancel", async nameCancelMsg => {
    if(nameCancelMsg.from?.id !== msg.from?.id) return false;
    nameListener.remove();
    nameCancelListener.remove();
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameCancelMsg.message_id]]), "hide_message");
    await bot.replyToMessage(nameCancelMsg, 'Команду скасовано', buttons);
    return true;
  });
  const nameListener = bot.addMessageListener(async nameMsg => {
    if(nameMsg.from?.id !== msg.from?.id) return false;
    const name = nameMsg.text;
    if(name == null || name === "") return false;
    nameListener.remove();
    nameCancelListener.remove();
    if(!await verifyAuthority(msg)) return true;
    const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameMsg.message_id]]), "hide_message");
    await bot.replyToMessage(nameMsg, 'Введіть опис групи "' + name +'"\n\n/cancel - cкасувати команду', buttons);
    const descCancelListener = bot.addCommandListener("cancel", async descCancelMsg => {
      if(descCancelMsg.from?.id !== msg.from?.id) return false;
      descListener.remove();
      descCancelListener.remove();
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descCancelMsg.message_id]]), "hide_message");
      await bot.replyToMessage(descCancelMsg, 'Команду скасовано', buttons);
      return true;
    });
    const descListener = bot.addMessageListener(async descMsg => {
      if(descMsg.from?.id !== msg.from?.id) return false;
      const desc = descMsg.text;
      if(desc == null || desc === "") return false;
      descListener.remove();
      descCancelListener.remove();
      if(!await verifyAuthority(msg)) return true;
      const community = Community.list[msg.chat.id];
      const group = new Group(name, desc, community.chatId);
      await community.addGroup(group);
      const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descMsg.message_id]]), "hide_message");
      await bot.replyToMessage(descMsg, 'Групу "' + name +'" додано до списку!', buttons);
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
  if(!await verifyAuthority(msg, true)) return true;
  const community = Community.list[msg.chat.id];
  const groups = community.groups.map(group => {
    return [group.name, [group.id, msg.message_id]] as bot.option;
  });
  const buttons = bot.getButtonsMarkup(bot.arrange(groups, 4, [["Скасувати", msg.message_id]]), [...groups.map(() => "delete_group"), "hide_message"]);
  await bot.replyToMessage(msg, "Оберіть групу, яку хочете **ВИДАЛИТИ**", buttons);
  return true;
});

bot.addCommandListener("editgroup", async initMsg => {
  try {
    if(!await verifyAuthority(initMsg)) return true;
    const community = Community.list[initMsg.chat.id];
    const groups = community.groups.map(group => {
      return [group.name, [group.id, initMsg.message_id]] as bot.option;
    });
    const buttons = bot.getButtonsMarkup(bot.arrange(groups, 4, [["Скасувати", initMsg.message_id]]), [...groups.map(() => "edit_group"), "cancel_edit"]);
    await bot.replyToMessage(initMsg, "Оберіть групу, яку хочете **РЕДАГУВАТИ**", buttons);
    const editCancelQueryListener = bot.addQueryListener("cancel_edit", async (query, msg_id) => {
      try {
        if(query.from?.id !== initMsg.from?.id) return false;
        const msg = query.message;
        if(msg == null) return false;
        editQueryListener.remove();
        editCancelQueryListener.remove();
        await bot.bot.deleteMessage(msg.chat.id, msg.message_id);
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
        await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Команду скасовано', buttons);
        return true;
      } catch(err) { console.error(err) }
    });
    const editQueryListener = bot.addQueryListener("edit_group", async (query, [group_id, msg_id]: [ObjectId, number]) => {
      try {
        if(query.from?.id !== initMsg.from?.id) return false;
        const msg = query.message;
        if(msg == null) return false;
        editQueryListener.remove();
        editCancelQueryListener.remove();
        if(!await verifyAuthority(query)) return true;
        const community = Community.list[msg.chat.id];
        const group = community.groups.find(group => group.id.toString() === group_id.toString());
        if(group == null) {
          const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
          await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Помилка!', buttons);
          return true;
        }
        await bot.bot.deleteMessage(msg.chat.id, msg.message_id);
        const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", msg_id]]), "hide_message");
        await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Введіть нову назву групи "' + group.name +'"\n\n/cancel - cкасувати команду', buttons);
        const nameCancelListener = bot.addCommandListener("cancel", async nameCancelMsg => {
          try {
            if(nameCancelMsg.from?.id !== initMsg.from?.id) return false;
            nameListener.remove();
            nameCancelListener.remove();
            const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameCancelMsg.message_id]]), "hide_message");
            await bot.replyToMessage(nameCancelMsg, 'Команду скасовано', buttons);
            return true;
          } catch(err) { console.error(err) }
        });
        const nameListener = bot.addMessageListener(async nameMsg => {
          try {
            if(nameMsg.from?.id !== initMsg.from?.id) return false;
            const name = nameMsg.text;
            if(name == null || name === "") return false;
            nameListener.remove();
            nameCancelListener.remove();
            if(!await verifyAuthority(query)) return true;
            const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", nameMsg.message_id]]), "hide_message");
            await bot.replyToMessage(nameMsg, 'Введіть опис групи "' + name +'"\n\n/cancel - cкасувати команду', buttons);
            const descCancelListener = bot.addCommandListener("cancel", async descCancelMsg => {
              if(descCancelMsg.from?.id !== initMsg.from?.id) return false;
              descListener.remove();
              descCancelListener.remove();
              const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descCancelMsg.message_id]]), "hide_message");
              await bot.replyToMessage(descCancelMsg, 'Команду скасовано', buttons);
              return true;
            });
            const descListener = bot.addMessageListener(async descMsg => {
              if(descMsg.from?.id !== initMsg.from?.id) return false;
              const desc = descMsg.text;
              if(desc == null || desc === "") return false;
              descListener.remove();
              descCancelListener.remove();
              if(!await verifyAuthority(initMsg)) return true;
              const community = Community.list[initMsg.chat.id];
              const group = community.groups.find(group => group.id.toString() === group_id.toString());
              if(group == null) {
                const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
                await bot.sendThreadMessage(initMsg.chat.id, bot.getThreadId(initMsg), 'Помилка!', buttons);
                return true;
              }
              group.name = name;
              group.description = desc;
              await community.updateGroup(group);
              const buttons = bot.getButtonsMarkup(bot.arrange([["Сховати", descMsg.message_id]]), "hide_message");
              await bot.replyToMessage(descMsg, 'Групу "' + name +'" оновлено!', buttons);
              return true;
            });
            setTimeout(() => descListener.remove(), +process.env.TIMEOUT!);
            setTimeout(() => descCancelListener.remove(), +process.env.TIMEOUT!);
            return true;
          } catch(err) { console.error(err) }
        });
        setTimeout(() => nameListener.remove(), +process.env.TIMEOUT!);
        setTimeout(() => nameCancelListener.remove(), +process.env.TIMEOUT!);
        return true;
      } catch(err) { console.error(err) }
    });
    setTimeout(() => editQueryListener.remove(), +process.env.TIMEOUT!);
    setTimeout(() => editCancelQueryListener.remove(), +process.env.TIMEOUT!);
    return true;
  } catch(err) { console.error(err) }
});

// message listeners


// callback listeners
bot.addQueryListener("hide_message", async (query, msg_id: number) => {
  try {
    const msg = query.message;
    if(msg == null) return false;
    await bot.bot.deleteMessage(msg.chat.id, msg.message_id);
    if(msg_id == null) return true;
    await bot.bot.deleteMessage(msg.chat.id, msg_id);
    return true;
  } catch(err) { console.error(err) }
});

bot.addQueryListener("delete_group", async (query, [group_id, msg_id]: [ObjectId, number]) => {
  try {
    const msg = query.message;
    if(msg == null) return false;
    if(!await verifyAuthority(query, true)) return true;
    const community = Community.list[msg.chat.id];
    const group = community.groups.find(group => group.id.toString() === group_id.toString());
    if(group == null) {
      const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
      await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Помилка!', buttons);
      return true;
    }
    await community.removeGroup(group);
    await bot.bot.deleteMessage(msg.chat.id, msg.message_id);
    await bot.bot.deleteMessage(msg.chat.id, msg_id);
    const buttons = bot.getButtonsMarkup(bot.arrange(["Сховати"]), "hide_message");
    await bot.sendThreadMessage(msg.chat.id, bot.getThreadId(msg), 'Групу "' + group.name +'" видалено!', buttons);
    return true;
  } catch(err) { console.log(err) }
});

bot.addMessageListener(async msg => {
  if(msg.new_chat_members == null) return false;
  const community = Community.list[msg.chat.id];
  if(community == null) return false;
  const users = msg.new_chat_members;
  for(const user of users) {
    const member = new Member(user.id, user.first_name, user.username);
    // const buttons = bot.getButtonsMarkup([
      
    // ]);
    // bot.sendMessage(msg.chat.id, `[@${member.username ?? member.name}](tg://user?id=${member.id}), ласкаво просимо! Обери, будь ласка, групи, до яких хочеш приєднатися та натисни "ГОТОВО"!`, buttons);
  }
});