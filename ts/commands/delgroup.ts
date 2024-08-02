import { cancelButton, editInfoMessage, hideButton, mode, setup, updateInfoList } from "./shared.js";
import { StateMessageResponse, StateQueryResponse } from "../custom/stateResponse.js";
import { chain, responseTarget } from "../core/response.js";
import { breakChain, setData, setMode, verifyAuthority, verifyMode } from "../custom/hooks.js";
import { ButtonDeleteOption } from "../core/options/button.js";
import StateInsertEmitter from "../custom/stateInsertEmitter.js";
import Community from "../community.js";
import { getCommunity, getState } from "../custom/utils.js";
import MessageOption from "../core/options/message.js";
import Group from "../group.js";

export default function delgroup() {

  const emitDeleted = new StateInsertEmitter(setup, 'Групу "{data.group_to_delete.name}" видалено!', responseTarget.LOCAL)
    .addOption(hideButton);

  // [delete] [cancel]
  const respondApproveDelete = new StateQueryResponse(async () => true, mode.DELGROUP, setup, emitDeleted)
    .check(async msg => {
      const state = getState(msg);
      const com = state?.data.community as Community;
      const group = state?.data.group_to_delete as Group;
      if(com == null || group == null) return chain.escape;
      await com.removeGroup(group);
      return chain.on;
    })
    .next(updateInfoList())
    .next(editInfoMessage())
    .next(setMode(mode.NONE));

  const deleteButton = new ButtonDeleteOption("Видалити").setResponse(respondApproveDelete);

  const emitSureToDelete = new StateInsertEmitter(setup, `Ви впевнені, що хочете видалити групу "{data.group_to_delete.name}"?`, responseTarget.LOCAL)
    .addOption(deleteButton)
    .addOption(cancelButton);

  // {group_to_delete: number}
  const respondGroupNumber = new StateMessageResponse("", mode.DELGROUP, setup, emitSureToDelete)
    .check(setData("group_to_delete", msg => {
      const n = Number(msg.text?.trim()) - 1;
      const state = getState(msg);
      const group = state?.data?.community?.groups[n] as Group;
      return group;
    }))
    .check(async (msg) => {
      const state = getState(msg);
      const group = state?.data.group_to_delete;
      if(group == null)
        return chain.escape;
      else
        return chain.on;
    })
    .next(breakChain());
    

  const chooseGroupNumberOption = new MessageOption()
    .setResponse(respondGroupNumber);

  const emitGroupsToDelete = new StateInsertEmitter(setup, "Введіть номер групи, яку хочете <b>ВИДАЛИТИ</b>:\n\n{data.groups_to_delete}", responseTarget.LOCAL)
    .addOption(cancelButton)
    .addOption(chooseGroupNumberOption);
  
  // /delgroup
  const respondDelGroup = new StateMessageResponse(mode.DELGROUP, mode.ANY, setup, emitGroupsToDelete, 1)
    .check(verifyAuthority(true))
    .check(verifyMode(mode.NONE, chain.on, chain.break))
    .check(setMode(mode.DELGROUP))
    .check(setData("community", msg => { 
      return getCommunity(msg);
    }))
    .check(setData("groups_to_delete", msg => {
      const community = getState(msg)?.data.community as Community;
      return community?.groups.map((g, i) => `<b>${i+1})</b> "${g.name}"`).join("\n");
    }))
    .check(setData("group_to_delete", () => null))
    .next(breakChain())
    .init();

}