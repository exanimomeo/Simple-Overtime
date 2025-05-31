/** -----------------------------------------------------------
 * Simple Over-Time – rolls damage each turn from AE flag
 *  Flag shape (Actor or Item ActiveEffect):
 *    flags.simpleOverTime = {
 *      formula : "2d4[acid]",  // required
 *      phase   : "start",      // start|end   (default "start")
 *      save    : "dex",        // ability or null
 *      dc      : 14,           // number or null
 *      onSave  : "none"        // none|half    (default "none")
 *    }
 * ---------------------------------------------------------- */

Hooks.once("init", () => console.log("SimpleOverTime | init"));

/* ---------- turn START ---------- */
Hooks.on("updateCombat", async (combat, changed) => {
  if (!("turn" in changed)) return;             // not a new turn
  const token = combat.combatant?.token;
  if (!token?.actor) return;
  await processOverTime(token.actor, "start");
});

/* ---------- turn END (hook just BEFORE turn increments) --- */
Hooks.on("preUpdateCombat", async (combat, changed) => {
  if (!("turn" in changed)) return;             // not leaving turn
  const token = combat.combatant?.token;
  if (!token?.actor) return;
  await processOverTime(token.actor, "end");
});

/* ---------------------------------------------------------- */
async function processOverTime(actor, phase) {
  for (const ef of actor.effects) {
    const cfg = ef.getFlag("simpleOverTime");
    if (!cfg) continue;
    if ((cfg.phase ?? "start") !== phase) continue;

    /* ---------- saving throw (optional) ------------- */
    let saveFailed = true;
    if (cfg.save && cfg.dc) {
      const roll = await actor.rollAbilitySave(cfg.save, {
        dc: cfg.dc,
        chatMessage: true,
        flavor: `**${ef.label}** – ${cfg.save.toUpperCase()} vs DC ${cfg.dc}`
      });
      saveFailed = (roll.total < cfg.dc);
      if (!saveFailed && cfg.onSave === "none") continue;
    }

    /* ---------- damage roll ------------------------- */
    const formula = cfg.formula;
    if (!formula) continue;

    let dmgRoll = await new Roll(formula).roll({async: true});
    if (!saveFailed && cfg.onSave === "half") {
      dmgRoll = await new Roll(formula).roll({async: true});
      dmgRoll.total = Math.floor(dmgRoll.total / 2);
    }

    /* ---------- post to chat ------------------------ */
    dmgRoll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor : `**${ef.label}** (${phase}-of-turn)`
    });

    /* Optional: Ready-Set-Roll instead ----------------
    // await game.readysetroll.requestDamage(actor, formula,
    //       undefined, {flavor:`${ef.label} (${phase})`});
    */
  }
}
