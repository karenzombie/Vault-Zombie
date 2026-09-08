# VaultZombie Question Bank: Travel Vault

For a big trip, gap year, or move abroad (guests at a send-off predict how the adventure goes). Works on the shorter schedules for a single trip and the longer ones for a move abroad. Single subject, so this type leans on number, multiple choice, and free text.

## How to read this

- **Three levels:** Vault type (Travel) > Sub-category (8 below) > Questions.
- **Placeholder:** "[Traveler]" resolves to the traveler's name at setup.
- **Answer type** is fixed per question. Three used here:
  - **Number:** guest enters a figure (a count, a number of months).
  - **Multiple choice:** guest picks from the defined options listed.
  - **Free text:** guest types an answer, hard-capped at 140 characters.
  - (Name-pick is not used in this single-subject type. It can be added from the admin panel if you ever want one.)
- **No reveal date is attached to a question.** The operator picks one reveal schedule at vault setup (Weekly Sprint, Monthly x3, Monthly Year, Half-then-Annual, or Annual Keepsake), and that schedule produces the vault's reveal dates. When a guest answers, they pick one of those dates for each answer. See the master build brief, section 4.
- All content is editable, reorderable, and expandable from the admin panel without code changes.

**Count:** 96 questions across 8 sub-categories (12 each).

---

## 1. The Route & Destinations

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | How many countries will [Traveler] visit on this trip? | Number | |
| 2 | What will be [Traveler]'s favorite destination? | Free text | 140 char |
| 3 | Stick to the plan or wander off it? | Multiple choice | Sticks to the itinerary / Goes with the flow / Throws the plan out entirely |
| 4 | What place will [Traveler] fall unexpectedly in love with? | Free text | 140 char |
| 5 | Which continent will surprise [Traveler] most? | Multiple choice | Europe / Asia / Africa / South America / Australia or Oceania / North America |
| 6 | How many cities will [Traveler] visit in total? | Number | |
| 7 | Off the beaten path or the classics? | Multiple choice | Off the beaten path / The famous spots / A mix of both |
| 8 | What place will [Traveler] skip that everyone expects? | Free text | 140 char |
| 9 | Will [Traveler] extend the trip to somewhere new? | Multiple choice | Yes / No / They will want to |
| 10 | What will be the longest [Traveler] stays in one place? | Free text | 140 char |
| 11 | Will [Traveler] end up somewhere completely unplanned? | Multiple choice | Yes / No / More than once |
| 12 | What destination will [Traveler] vow to return to? | Free text | 140 char |

---

## 2. Highs & Adventures

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | What will be the highlight of the whole trip? | Free text | 140 char |
| 2 | What bold or daring thing will [Traveler] try? | Free text | 140 char |
| 3 | Do something totally out of their comfort zone? | Multiple choice | Yes / No / More than once |
| 4 | What adventure activity will [Traveler] say yes to? | Multiple choice | Diving or water sports / Hiking or climbing / Something with an engine / Something they swore they never would |
| 5 | What will be [Traveler]'s proudest moment out there? | Free text | 140 char |
| 6 | See a bucket-list sight in person? | Multiple choice | Yes / No / An even better one |
| 7 | What unexpected experience will steal the show? | Free text | 140 char |
| 8 | Chase adrenaline or chill and soak it in? | Multiple choice | Adrenaline / Relaxation / Both in turns |
| 9 | What photo will [Traveler] be most proud of? | Free text | 140 char |
| 10 | Catch a once-in-a-lifetime moment (festival, view, wildlife)? | Multiple choice | Yes / No / They will just miss one |
| 11 | What story will [Traveler] tell for years? | Free text | 140 char |
| 12 | Best moment planned or a total accident? | Multiple choice | Planned / Total accident / A little of both |

---

## 3. Mishaps & Chaos

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Will [Traveler] miss a flight, train, or bus? | Multiple choice | Yes / No / More than one |
| 2 | What will go hilariously wrong? | Free text | 140 char |
| 3 | Lose something important (passport, phone, luggage)? | Multiple choice | Yes / No / Loses then finds it |
| 4 | What travel mishap will become the best story? | Free text | 140 char |
| 5 | Get lost and stumble onto something great? | Multiple choice | Yes / No / Lost the whole time, honestly |
| 6 | Have a language mix-up moment? | Multiple choice | Yes, a classic / No / An unforgettable one |
| 7 | What will [Traveler] forget to pack? | Free text | 140 char |
| 8 | Eat something that does not agree with them? | Multiple choice | Yes / No / Lives dangerously anyway |
| 9 | What will be the biggest "we survived that" moment? | Free text | 140 char |
| 10 | Overpack or underpack? | Multiple choice | Overpacks wildly / Underpacks / Somehow just right |
| 11 | What plan will fall apart and turn out better? | Free text | 140 char |
| 12 | Blow the budget somewhere unexpected? | Multiple choice | Yes / No / Right at the end |

---

## 4. People & Connections

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | How many new friends will [Traveler] make? | Number | |
| 2 | Meet someone they stay in touch with for years? | Multiple choice | Yes / No / A whole crew |
| 3 | Will there be a travel romance? | Multiple choice | Yes / No / It is complicated |
| 4 | Who will [Traveler] miss most from home? | Free text | 140 char |
| 5 | Solo, with a group, or both? | Multiple choice | Solo the whole way / Meets a group / A mix |
| 6 | What kind of people will [Traveler] gravitate toward? | Free text | 140 char |
| 7 | Reconnect with someone they know abroad? | Multiple choice | Yes / No / A surprise run-in |
| 8 | What local will leave a lasting impression? | Free text | 140 char |
| 9 | The planner or the free spirit in a travel group? | Multiple choice | The planner / The free spirit / The wildcard |
| 10 | Who from the send-off will [Traveler] video-call the most? | Free text | 140 char |
| 11 | Make a friendship that changes their path? | Multiple choice | Yes / No / Maybe one |
| 12 | What connection will surprise everyone? | Free text | 140 char |

---

## 5. Money & Logistics

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Will [Traveler] stick to the budget? | Multiple choice | Nails it / Goes a bit over / Budget, what budget |
| 2 | Run low on money at some point? | Multiple choice | Yes / No / A close call |
| 3 | What will [Traveler] splurge on that is worth every penny? | Free text | 140 char |
| 4 | How will [Traveler] mostly get around? | Multiple choice | Trains and buses / Flights / On foot and hitching / A rented vehicle |
| 5 | Where will [Traveler] sleep most nights? | Multiple choice | Hostels / Hotels / Couches and homestays / A tent or van |
| 6 | What will [Traveler] spend way more on than expected? | Free text | 140 char |
| 7 | Find a clever way to travel cheap? | Multiple choice | Yes, a pro / Sort of / Pays full price and smiles |
| 8 | How many bags will [Traveler] end up traveling with? | Number | |
| 9 | Pick up work or a gig along the way? | Multiple choice | Yes / No / They will consider it |
| 10 | What item will turn out to be the best thing [Traveler] packed? | Free text | 140 char |
| 11 | Come home with money left or scraping by? | Multiple choice | Money to spare / Right on zero / Calling for a loan |
| 12 | What souvenir will [Traveler] absolutely bring back? | Free text | 140 char |

---

## 6. Food & Culture

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | What food will [Traveler] fall in love with? | Free text | 140 char |
| 2 | Adventurous eater or play it safe? | Multiple choice | Tries everything / Plays it safe / Surprises themselves |
| 3 | What dish will [Traveler] refuse to try? | Free text | 140 char |
| 4 | Learn a few words of a new language? | Multiple choice | Yes, gets good / A few phrases / Points and smiles |
| 5 | What custom or tradition will [Traveler] embrace? | Free text | 140 char |
| 6 | Pick up a local habit they keep at home? | Multiple choice | Yes / No / One or two |
| 7 | What will be [Traveler]'s go-to meal on the road? | Free text | 140 char |
| 8 | Take a cooking class or food tour? | Multiple choice | Yes / No / They will mean to |
| 9 | What flavor or smell will forever remind [Traveler] of this trip? | Free text | 140 char |
| 10 | Find a hidden gem restaurant? | Multiple choice | Yes / No / The best meal of the trip |
| 11 | What cultural moment will move [Traveler] most? | Free text | 140 char |
| 12 | Come back with a new favorite cuisine? | Multiple choice | Yes / No / Undecided forever |

---

## 7. Change & Growth

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | How will [Traveler] come back different? | Free text | 140 char |
| 2 | Find a new passion on this trip? | Multiple choice | Yes / No / A spark of one |
| 3 | What fear will [Traveler] conquer out there? | Free text | 140 char |
| 4 | Come home more confident? | Multiple choice | Much more / A little / Same wonderful self |
| 5 | What belief or view will [Traveler] rethink? | Free text | 140 char |
| 6 | Will this trip change [Traveler]'s life direction? | Multiple choice | Yes / No / Plants a seed |
| 7 | What habit will [Traveler] build on the road? | Free text | 140 char |
| 8 | Discover something about themselves? | Multiple choice | Yes, big / A little / They already knew |
| 9 | What will [Traveler] appreciate more about home? | Free text | 140 char |
| 10 | Bitten by the travel bug or ready to settle? | Multiple choice | Bitten by the bug / Ready to settle / Torn between both |
| 11 | What lesson will [Traveler] carry home? | Free text | 140 char |
| 12 | Same person or transformed? | Multiple choice | Transformed / Subtly changed / Exactly the same |

---

## 8. The Return & Wildcards

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Will [Traveler] come home on schedule? | Multiple choice | Right on time / Comes back early / Extends the trip |
| 2 | Decide to move abroad? | Multiple choice | Yes / No / Seriously considers it |
| 3 | What is the wildest thing [Traveler] will do on this trip? | Free text | 140 char |
| 4 | Plan the next trip before this one ends? | Multiple choice | Already booking / Maybe / Needs a break first |
| 5 | What will [Traveler] miss most about being away? | Free text | 140 char |
| 6 | Trip as planned or totally different? | Multiple choice | As planned / A little different / Completely different |
| 7 | What is one thing nobody predicts about this trip? | Free text | 140 char |
| 8 | Come back with a tattoo, a story, or a new outlook? | Multiple choice | A tattoo / An unforgettable story / A whole new outlook |
| 9 | What will be the first thing [Traveler] does back home? | Free text | 140 char |
| 10 | How many months until [Traveler] is itching to leave again? | Number | |
| 11 | What is one prediction about this trip guaranteed to come true? | Free text | 140 char |
| 12 | Trip of a lifetime or just the first of many? | Multiple choice | Trip of a lifetime / First of many / Both |
