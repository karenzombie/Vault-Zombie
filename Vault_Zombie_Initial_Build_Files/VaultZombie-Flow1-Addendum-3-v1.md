# Vault Zombie: Flow 1 Build, Addendum 3

**Applies to:** `VaultZombie-Flow1-Build-Stages.md`
**Date:** September 12, 2026

Read both documents. Where this addendum covers something, it governs. Everything else in the stages document is unchanged, including Addendums 1 and 2.

---

## C1. Gift redemption order

Section 2.5 is amended. Redemption runs in this order:

1. The recipient follows the link in their gift email, or clicks **Redeem a gift code** on the site. No account is needed to get this far.
2. They enter the code.
3. They sign in, or sign up for a free account.
4. They land on the vault details form for the gifted tier, ready to pick a vault type, fill in the subject names, and name the vault, exactly as a host who paid for that tier does.

The code survives sign-up and sign-in, including email verification. It is never lost and never typed twice. **Redeem a gift code** stays available in the header for a signed-out visitor and does not disappear after sign-up while an unredeemed code is in hand.

What does not change: a redeemed code still creates an unspent entitlement at the tier the gifter paid for, and the details form spends it. No Vault ID is typed anywhere.

**Why it changed.** Asking for sign-in first dropped the code on sign-up, then showed a paid-for host the tier chooser, offering to sell them a vault they already owned.

---

## C2. The baby's name may be left blank

Section 2.4 is amended for the New Baby vault type only.

The `[Baby]` subject name is optional. A host who does not yet know the name leaves it blank, and a line of helper text beneath the field reads exactly:

> Leave this blank if the name is not decided yet.

It is plain helper text in Text 2 `#55514A` at the small body size, not a tooltip bubble and not an icon.

A New Baby vault can be created **and sealed** with the name blank, so seal readiness exempts `[Baby]` on that vault type. Every other subject name on every vault type stays required, at creation and at sealing.

**Why it changed.** Guests are meant to predict the baby's name, so asking the host for it up front either gives it away or blocks a host who does not know it.

---

## C3. Name substitution, and what a blank name renders as

Name substitution is specified in Build Brief section 9 and was never built. It is built now, and this addendum records the one detail section 9 does not cover.

**When `[Baby]` is blank, it renders as:** the baby

So the prompt reads "What day will the baby actually arrive?" This is how the Baby bank was originally written before the import converted that prose to a token, so the prompts read naturally either way.

This blank form applies to `[Baby]` alone. No other subject name can be blank, so no other token has one.

Everything else about substitution follows Build Brief section 9 unchanged: it runs over prompt text and option strings, never decided by answer type, possessives keep their apostrophe s, and `[Year]` resolves per reveal date rather than to a name.
