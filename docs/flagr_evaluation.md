# How Evaluation Works

When you evaluate a flag for an **entity** (a user, device, or request — anything with an ID and optional context), Flagr walks a fixed path and returns **one variant**, or none. Understanding this path removes most of the surprises around segments, rollouts, and distributions.

## The evaluation path

1. **Is the flag enabled?** A disabled flag returns no variant — evaluation stops here.
2. **Walk the segments top to bottom.** Segments are ordered, and the **first one that matches wins**. Once a segment matches, Flagr stops looking at the segments below it.
3. **Does the entity match the segment's constraints?** All constraints in a segment are combined with `AND`. A segment with **no constraints matches everyone**.
4. **Is the entity within the rollout?** The matched segment has a **rollout %** — the share of matching entities actually included. Rollout is deterministic per entity (the same entity always lands the same way), so a 20% rollout always includes the same 20%.
5. **Pick a variant from the distribution.** For an included entity, the segment's **distribution** decides which variant it gets (for example 50% `on` / 50% `off`).

!> Order matters: put your most specific segments first. If a broad segment (e.g. "everyone") sits above a narrow one, the broad one matches first and the narrow one is never reached. Drag a segment by its handle to reorder it.

## Rollout vs. distribution

These are two different steps, and a common source of confusion:

- **Rollout %** answers *"is this entity in the segment at all?"* — it gates inclusion.
- **Distribution** answers *"which variant does an included entity get?"* — it splits the included traffic across variants.

So a segment at **100% rollout** with a **50/50 distribution** gives everyone in the segment a variant — half `on`, half `off`. A segment at **20% rollout** only includes 20% of matching entities; the other 80% get **no variant**.

!> **A matched segment ends evaluation.** "First match wins" means the first segment whose *constraints* match. Once that happens, Flagr does **not** look at lower segments — even if the entity then falls outside the rollout and gets no variant. Fall-through to the next segment only happens when the constraints *don't* match. So a narrow segment at 20% rollout placed above a catch-all will leave 80% of its matching entities with no variant, rather than passing them down to the catch-all.

## Why it's deterministic

Rollout and distribution don't roll dice — they hash the entity into one of **1000 buckets**:

```
bucket = crc32( flagID + entityID ) mod 1000
```

The hash is salted with the **flag's ID**, which has two consequences:

- **Stable per entity, per flag.** The same `entityID` always lands in the same bucket for a given flag, so a user keeps the same variant across calls (sticky), and a 20% rollout always includes the *same* 20%.
- **Independent across flags.** Because the salt is the flag ID, the same user falls into a *different* bucket in every flag — being in the treatment group of one experiment tells you nothing about another. No cross-flag correlation.

The 1000 buckets are split between variants by the **distribution** percentages (a 50/50 split owns buckets 0–499 and 500–999). The **rollout %** is then applied *within* the entity's variant band: at 100% rollout every bucket in the band is included; at 20% only the first fifth of the band is. This is why rollout and distribution are two different gates — the bucket first picks a variant, then the rollout decides whether that bucket is included at all.

To get a non-sticky one-off result, send an empty `entityID` — Flagr generates a random one for that single call (it still runs through the same hash, so the result is internally consistent, just not repeatable).

## When do I get no variant?

A few situations return no variant. These are usually configuration mistakes, and the flag page now warns about the last two:

- **The flag is disabled.**
- **No segment matched** — the entity's context satisfied no segment's constraints, and there's no catch-all segment.
- **The entity matched a segment but fell outside its rollout %** — for example the rollout is 0%, so no one is included.
- **The matched segment has no distribution** — there's no variant to hand out.

!> The flag page flags the last two for you: a segment at 0% rollout, or with no distribution, shows a warning so an experiment never silently goes live with no one in it.

## See it for a real entity

You don't have to reason about this in your head:

- **Debug Console** (on the flag page) sends a sample entity through the flag and shows which segment matched and which variant it got — read-only, it never affects live traffic.
- **Evaluation Flow** (a tab on the flag page) visualizes this whole path for a sample entity.

!> Quote string constraint values — `"CA"`, not `CA`. An unquoted value is parsed as a variable and silently never matches.
