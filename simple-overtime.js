/*───────────────────────────────────────────────────────────────
  Simple Over-Time  –  Foundry V12
  Register key AFTER dnd5e is ready (same trick ATL & MidiQOL use)
────────────────────────────────────────────────────────────────*/

/* 0 ─ init */
Hooks.once("init", () => console.log("🟢 SimpleOverTime | init"));

const MODULE_ID = "simple-overtime";
const FLAG_KEY  = `flags.${MODULE_ID}`;

Hooks.once("ready", () => {
  /* dnd5e core list (used by the vanilla AE sheet) */
  if (Array.isArray(CONFIG?.DND5E?.effectKeys) &&
      !CONFIG.DND5E.effectKeys.includes(FLAG_KEY)) {
    CONFIG.DND5E.effectKeys.push(FLAG_KEY);
  }

  /* generic suggestions array (other systems / fallback) */
  if (Array.isArray(CONFIG?.ActiveEffect?.keySuggestions) &&
      !CONFIG.ActiveEffect.keySuggestions.includes(FLAG_KEY)) {
    CONFIG.ActiveEffect.keySuggestions.push(FLAG_KEY);
  }

  /* DAE’s custom list (used by DAEActiveEffectConfig!) */
  if (game.dae && Array.isArray(CONFIG?.DAE?.customEffectKeys) &&
      !CONFIG.DAE.customEffectKeys.includes(FLAG_KEY)) {
    CONFIG.DAE.customEffectKeys.push(FLAG_KEY);
  }

  console.log(`🟢 ${MODULE_ID} | key registered in AE dropdown(s)`);
});

/* 2 ─ turn START */
Hooks.on("updateCombat", async combat => {
  const token = combat.combatant?.token;
  if (token?.actor) await tick(token.actor, "start");
});

/* 3 ─ turn END (pre-increment) */
Hooks.on("preUpdateCombat", async combat => {
  const token = combat.combatant?.token;
  if (token?.actor) await tick(token.actor, "end");
});

/* 4 ─ worker */
async function tick(actor, phase) {
  for (const ef of actor.effects) {
    const cfg = ef.getFlag(MODULE_ID);          // flags.simple-overtime
    if (!cfg) continue;
    if ((cfg.phase ?? "start") !== phase) continue;

    /* optional save */
    let fail = true;
    if (cfg.save && cfg.dc) {
      const sv = await actor.rollAbilitySave(cfg.save, {dc: cfg.dc, chatMessage: true});
      fail = sv.total < cfg.dc;
      if (!fail && cfg.onSave === "none") continue;
      if (!fail && cfg.onSave === "half") cfg.half = true;
    }

    /* damage */
    if (!cfg.formula) continue;
    const roll = await new Roll(cfg.formula).roll({async: true});
    if (cfg.half) roll.total = Math.floor(roll.total / 2);

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor : `**${ef.label}** (${phase}-of-turn)`
    });
  }
}
