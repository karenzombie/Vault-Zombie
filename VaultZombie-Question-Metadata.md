# VaultZombie, Question Bank Metadata (v1)

**Status:** Complete. This document supplies the two pieces of metadata the question banks ship without, and closes open items 19.3 and 19.4 in the master build brief.

**What this covers:** every Number question and every Free text question across all ten banks. 89 number questions and 312 free text questions, 401 items total, matching the 401 unresolved items reported by the importer.

**What this does not cover:** name-pick and multiple choice questions need no added metadata. They score on an exact option match.

---

## 1. How to read this

### Number questions

Each carries four values.

- **Unit.** The label shown next to the input and used in reports.
- **Min** and **Max.** The accepted input range. Reject outside it at answer time with a plain message.
- **Close band.** How far from the true answer still scores half. Applied as plus or minus the stated value. A band of 0 means exact only, no half credit, and is a deliberate value, not a missing one.

Scoring, unchanged from the master brief: exact is a jackpot at full points, within the band is close at half points, beyond it is a miss at zero.

### Free text questions

Each carries one flag.

- **Scoreable.** The operator can state one true answer later without anyone arguing. These run through cluster grouping and feed the scoreboard.
- **Keepsake.** A joke, an opinion, or something with no single truth. Never scored, never feeds the scoreboard, shown to everyone at the reveal.

### The rule that produced these calls

Scoreable if the operator can state one true answer years later without argument. Keepsake if it is a joke, an opinion, or has no single truth. Where a question had a real answer but scoring it would force the operator to make an arbitrary declaration, it was flagged keepsake.

### Question identity

Questions are addressed here by bank, sub-category, and the number printed in the bank's own table. Those printed numbers restart at 1 in every table and are not identifiers, per decision 4 in the master brief. Match on bank plus sub-category plus printed number plus prompt text, then attach this metadata to the permanent generated ID.

---

## 2. Type corrections

Three questions were typed in a way that did not fit their answer. All three were resolved by the owner and are recorded here.

| Bank | Question | Resolution |
|---|---|---|
| Baby | 1.3 How much will the baby weigh at birth? | Stays Free text. Flagged scoreable, exact match only. No band applies. |
| Baby | 1.1 What day will the baby actually arrive? | Stays Free text. Flagged scoreable, exact date only. No band applies. Note that 1.7, how many days off from the due date, already covers the same guess as a banded number. |
| Travel | 1.10 What will be the longest [Traveler] stays in one place? | Stays Free text. Flagged keepsake. |

No question types are changed. No questions are retired.

---

## 3. Marriage

### Number questions, 12

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Home & Residence | 1 | How many times will they move homes? | moves | 0 | 10 | 1 |
| Home & Residence | 7 | How many bedrooms will their main home have? | bedrooms | 0 | 8 | 1 |
| Kids, Pets & Family | 1 | How many kids will they have? | children | 0 | 8 | 1 |
| Kids, Pets & Family | 5 | How many pets will they have in total? | pets | 0 | 12 | 1 |
| Kids, Pets & Family | 7 | In how many years will their first child arrive? | years | 0 | 15 | 1 |
| Cars & Big Purchases | 1 | How many cars will they own at once? | cars | 0 | 6 | 1 |
| Cars & Big Purchases | 11 | Roughly how much will they spend on their next car (in thousands)? | thousands of dollars | 0 | 200 | 5 |
| Careers & Money | 14 | How many different jobs will they hold between them over the years? | jobs | 0 | 20 | 2 |
| Travel & Adventure | 1 | How many countries will they visit together? | countries | 0 | 50 | 3 |
| Travel & Adventure | 13 | How many trips will they take in a typical year? | trips | 0 | 24 | 2 |
| Love & Conflict | 5 | How many date nights will they have in a typical month? | date nights | 0 | 30 | 1 |
| Milestones & Wildcards | 10 | How many years until their first "big" anniversary trip? | years | 0 | 25 | 1 |

### Free text questions, 20

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Home & Residence | 3 | What city or town will they call home? | Scoreable |
| Home & Residence | 11 | What is the one thing they will splurge on for the home? | Scoreable |
| Kids, Pets & Family | 8 | What will they name their first child? | Scoreable |
| Cars & Big Purchases | 5 | What is the first big thing they buy together? | Scoreable |
| Cars & Big Purchases | 8 | What color will their next car be? | Scoreable |
| Cars & Big Purchases | 13 | What big purchase will they argue about most? | Keepsake |
| Careers & Money | 6 | What is the dream job one of them secretly wants? | Keepsake |
| Careers & Money | 12 | What will they splurge on once money is comfortable? | Scoreable |
| Travel & Adventure | 2 | What is the first big trip they take as a married couple? | Scoreable |
| Travel & Adventure | 10 | What is the trip they will keep putting off? | Keepsake |
| Habits & Everyday Life | 3 | What hobby will one of them pick up and then abandon? | Scoreable |
| Habits & Everyday Life | 7 | What new hobby will they take up together? | Scoreable |
| Habits & Everyday Life | 12 | What chore will they always argue over? | Keepsake |
| Love & Conflict | 3 | What will they still be playfully arguing about years from now? | Keepsake |
| Love & Conflict | 7 | What is their signature recurring argument? | Keepsake |
| Love & Conflict | 12 | What nickname will stick between them? | Keepsake |
| Milestones & Wildcards | 2 | What anniversary will they make the biggest deal of? | Scoreable |
| Milestones & Wildcards | 5 | What is the wildest thing they will do together in the next 5 years? | Keepsake |
| Milestones & Wildcards | 8 | What tradition will they invent as a couple? | Keepsake |
| Milestones & Wildcards | 12 | What is one prediction nobody else would guess about them? | Keepsake |

---

## 4. Couple

### Number questions, 9

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| The Next Step | 2 | In how many years will they get engaged? | years | 0 | 10 | 1 |
| The Next Step | 6 | How long until they move in together? | months | 0 | 60 | 3 |
| Home & Living Situation | 3 | How many times will they move in the next few years? | moves | 0 | 8 | 1 |
| Home & Living Situation | 12 | How many bedrooms will their place have? | bedrooms | 0 | 8 | 1 |
| Careers & Money | 10 | How many jobs will they hold between them over the years? | jobs | 0 | 20 | 2 |
| Travel & Adventure | 1 | How many countries will they visit together? | countries | 0 | 50 | 3 |
| Travel & Adventure | 13 | How many trips will they take in a typical year? | trips | 0 | 24 | 2 |
| Love & Conflict | 4 | How many date nights will they have in a typical month? | date nights | 0 | 30 | 1 |
| Milestones & Wildcards | 11 | How many years until their next big life milestone? | years | 0 | 15 | 1 |

### Free text questions, 20

| Sub-category | # | Question | Flag |
|---|---|---|---|
| The Next Step | 8 | Where will the proposal happen? | Scoreable |
| The Next Step | 11 | What is the next big milestone they hit as a couple? | Scoreable |
| Home & Living Situation | 2 | What city or town will they end up in? | Scoreable |
| Home & Living Situation | 9 | What is the first thing they buy for their shared place? | Scoreable |
| Careers & Money | 6 | What is the dream job one of them secretly wants? | Keepsake |
| Careers & Money | 13 | What will they splurge on once money is comfortable? | Scoreable |
| Travel & Adventure | 2 | What is the first big trip they take together? | Scoreable |
| Travel & Adventure | 10 | What trip will they keep putting off? | Keepsake |
| Habits & Everyday Life | 3 | What hobby will one of them pick up and then abandon? | Scoreable |
| Habits & Everyday Life | 6 | What new hobby will they take up together? | Scoreable |
| Habits & Everyday Life | 11 | What show or franchise will they binge together? | Scoreable |
| Love & Conflict | 3 | What will they still be playfully arguing about years from now? | Keepsake |
| Love & Conflict | 6 | What is their signature recurring argument? | Keepsake |
| Love & Conflict | 11 | What nickname will stick between them? | Keepsake |
| Friends, Family & Social Life | 8 | What will friends always tease them about? | Keepsake |
| Friends, Family & Social Life | 12 | What tradition will they start with their friends? | Keepsake |
| Milestones & Wildcards | 1 | What is the biggest milestone they will hit in the next 5 years? | Scoreable |
| Milestones & Wildcards | 5 | What is the wildest thing they will do together in the next 5 years? | Keepsake |
| Milestones & Wildcards | 7 | What tradition will they invent as a couple? | Keepsake |
| Milestones & Wildcards | 12 | What is one prediction nobody else would guess about them? | Keepsake |

---

## 5. New Baby

### Number questions, 11

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Due Date & Arrival | 4 | How long will the baby be at birth (in inches)? | inches | 14 | 24 | 1 |
| Due Date & Arrival | 7 | How many days off from the due date will the birth be? | days | 0 | 21 | 2 |
| Due Date & Arrival | 11 | How many people will be in the waiting room? | people | 0 | 30 | 2 |
| The First Year | 1 | At what age will the baby take their first steps (in months)? | months | 6 | 24 | 1 |
| The First Year | 3 | At what age will the baby say their first word (in months)? | months | 4 | 24 | 1 |
| The First Year | 5 | At what age will the baby get their first tooth (in months)? | months | 0 | 18 | 1 |
| The First Year | 8 | When will the baby first sleep through the night (in months)? | months | 0 | 24 | 1 |
| Parents & Family Life | 9 | How many visitors will come in the first week? | visitors | 0 | 40 | 3 |
| Name & Identity | 5 | How many middle names will the baby have? | middle names | 0 | 4 | 0 |
| Everyday Chaos & Practical | 1 | How many diapers will the family go through in week one? | diapers | 30 | 150 | 10 |
| Everyday Chaos & Practical | 9 | How many outfits will the baby destroy on day one? | outfits | 0 | 10 | 1 |

Note on Name & Identity 5: the range is so narrow that a band of 1 would give half credit for almost any guess. Band 0, exact only, is intentional.

### Free text questions, 33

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Due Date & Arrival | 1 | What day will the baby actually arrive? | Scoreable |
| Due Date & Arrival | 3 | How much will the baby weigh at birth? | Scoreable |
| Due Date & Arrival | 12 | Who gets the "it's happening" call first? | Scoreable |
| Looks & First Impressions | 2 | What color hair will the baby have, if any? | Scoreable |
| Looks & First Impressions | 3 | What color eyes will the baby have? | Scoreable |
| Looks & First Impressions | 8 | What will be the baby's most talked-about feature? | Keepsake |
| Looks & First Impressions | 12 | What will everyone comment on first when they meet the baby? | Keepsake |
| Personality (Early Signs) | 5 | What will make the baby laugh the hardest? | Keepsake |
| Personality (Early Signs) | 8 | What will the baby's first tantrum be about? | Keepsake |
| Personality (Early Signs) | 11 | What word will best describe the baby's personality? | Keepsake |
| The First Year | 2 | What will the baby's first word be? | Scoreable |
| The First Year | 9 | What will make the parents cry happy tears first? | Keepsake |
| The First Year | 10 | What will be the baby's favorite toy or object? | Scoreable |
| The First Year | 12 | What milestone will happen sooner than expected? | Keepsake |
| Parents & Family Life | 7 | Which grandparent will spoil the baby the most? | Scoreable |
| Parents & Family Life | 11 | What will the parents disagree about most? | Keepsake |
| Name & Identity | 1 | What will the baby's name be? | Scoreable |
| Name & Identity | 4 | What nickname will actually stick? | Keepsake |
| Name & Identity | 7 | What letter will the baby's first name start with? | Scoreable |
| Name & Identity | 10 | What theme will guide the name (nature, vintage, pop culture)? | Keepsake |
| Name & Identity | 12 | What name will everyone guess but be wrong about? | Keepsake |
| Everyday Chaos & Practical | 2 | What baby gadget will turn out to be a lifesaver? | Scoreable |
| Everyday Chaos & Practical | 3 | What baby gadget will be a total waste of money? | Keepsake |
| Everyday Chaos & Practical | 5 | What will the parents be most unprepared for? | Keepsake |
| Everyday Chaos & Practical | 8 | What sound or trick will finally soothe the baby? | Scoreable |
| Everyday Chaos & Practical | 12 | What everyday moment will surprise the parents with joy? | Keepsake |
| Wildcards & The Future | 1 | What will the baby grow up to be? | Keepsake |
| Wildcards & The Future | 3 | What trait will the baby definitely inherit? | Keepsake |
| Wildcards & The Future | 4 | Who will the baby be closest to in the family? | Scoreable |
| Wildcards & The Future | 6 | What will be the baby's first Halloween costume? | Scoreable |
| Wildcards & The Future | 7 | What hobby or talent will show up early? | Scoreable |
| Wildcards & The Future | 9 | What will the family always laugh about from year one? | Keepsake |
| Wildcards & The Future | 11 | What is one thing nobody can predict about this baby? | Keepsake |

---

## 6. Child Growth

### Number questions, 10

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Looks & Physical | 8 | How tall will [Child] be as an adult (in inches)? | inches | 48 | 84 | 2 |
| School & Learning | 7 | How many schools will [Child] attend before graduating? | schools | 1 | 8 | 1 |
| Friends & Social Life | 5 | At what age will [Child] have their first crush? | years old | 4 | 18 | 1 |
| Hobbies, Talents & Sports | 12 | How many activities will [Child] juggle at once as a kid? | activities | 0 | 8 | 1 |
| Firsts & Milestones | 1 | At what age will [Child] take their first steps (in months)? | months | 6 | 24 | 1 |
| Firsts & Milestones | 3 | At what age will [Child] learn to ride a bike? | years old | 2 | 12 | 1 |
| Firsts & Milestones | 6 | At what age will [Child] get their first phone? | years old | 5 | 18 | 1 |
| Firsts & Milestones | 9 | At what age will [Child] learn to swim? | years old | 0 | 16 | 1 |
| Firsts & Milestones | 13 | How old will [Child] be for their first plane ride? | years old | 0 | 18 | 1 |
| Future & Grown-Up Life | 10 | How many different careers will [Child] try? | careers | 1 | 8 | 1 |

### Free text questions, 29

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Personality & Temperament | 5 | What word will best describe [Child] as a kid? | Keepsake |
| Personality & Temperament | 10 | What will [Child] be afraid of as a kid? | Keepsake |
| Personality & Temperament | 12 | What personality trait will [Child] be known for? | Keepsake |
| Looks & Physical | 2 | What color eyes will [Child] have? | Scoreable |
| Looks & Physical | 3 | What color hair will [Child] have? | Scoreable |
| Looks & Physical | 9 | Will [Child] have a signature look or style? | Keepsake |
| Looks & Physical | 12 | What will be [Child]'s most distinctive feature? | Keepsake |
| School & Learning | 1 | What will be [Child]'s favorite subject? | Scoreable |
| School & Learning | 4 | What subject will [Child] struggle with most? | Scoreable |
| School & Learning | 10 | What extracurricular will [Child] throw themselves into? | Scoreable |
| Friends & Social Life | 3 | What will [Child] and their friends get up to? | Keepsake |
| Friends & Social Life | 9 | What kind of friends will [Child] gravitate toward? | Keepsake |
| Friends & Social Life | 12 | What will [Child] be the friend everyone goes to for? | Keepsake |
| Hobbies, Talents & Sports | 2 | What sport or activity will [Child] love most? | Scoreable |
| Hobbies, Talents & Sports | 4 | What instrument might [Child] pick up? | Scoreable |
| Hobbies, Talents & Sports | 6 | What hobby will [Child] get obsessed with? | Scoreable |
| Hobbies, Talents & Sports | 10 | What hobby will [Child] pick up and then abandon? | Scoreable |
| Hobbies, Talents & Sports | 13 | What will [Child] be surprisingly good at? | Keepsake |
| Firsts & Milestones | 2 | What will [Child]'s first word be? | Scoreable |
| Firsts & Milestones | 7 | What will [Child] want to be when they grow up (as a little kid)? | Scoreable |
| Firsts & Milestones | 10 | What milestone will make the parents cry the most? | Keepsake |
| Future & Grown-Up Life | 1 | What career will [Child] end up in? | Scoreable |
| Future & Grown-Up Life | 5 | What city will [Child] live in as an adult? | Scoreable |
| Future & Grown-Up Life | 8 | What cause or passion will [Child] care about as an adult? | Keepsake |
| Future & Grown-Up Life | 12 | What surprising path might [Child] take? | Keepsake |
| Family & Wildcards | 4 | What family trait will [Child] carry on? | Keepsake |
| Family & Wildcards | 7 | What will [Child] and the family always laugh about? | Keepsake |
| Family & Wildcards | 8 | Will [Child] have a signature catchphrase or saying? | Keepsake |
| Family & Wildcards | 11 | What is one thing about [Child] nobody can predict? | Keepsake |

---

## 7. College

### Number questions, 10

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Major & Academics | 8 | How many all-nighters will [Student] pull in a semester? | all-nighters | 0 | 30 | 3 |
| Campus & Living | 3 | How many times will [Student] move during college? | moves | 0 | 10 | 1 |
| Campus & Living | 11 | How many roommates will [Student] have over the years? | roommates | 0 | 15 | 2 |
| Social Life & Friends | 8 | How many close friends will [Student] make? | friends | 0 | 20 | 2 |
| Fun, Chaos & College Life | 9 | How many concerts or big events will [Student] go to? | events | 0 | 50 | 5 |
| Money & Work | 6 | How many jobs or internships will [Student] have before graduating? | jobs | 0 | 10 | 1 |
| Money & Work | 11 | Roughly what will [Student] make at their first job (in thousands)? | thousands of dollars | 0 | 200 | 5 |
| After Graduation | 4 | How long until [Student] lands their first "real" job (in months)? | months | 0 | 36 | 3 |
| After Graduation | 12 | How many years until [Student] feels settled? | years | 0 | 15 | 1 |
| Wildcards & Milestones | 11 | How many years until [Student] returns for a reunion? | years | 0 | 25 | 2 |

### Free text questions, 31

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Major & Academics | 1 | What will [Student] major in? | Scoreable |
| Major & Academics | 4 | What will be [Student]'s hardest class? | Scoreable |
| Major & Academics | 11 | What class or professor will change [Student]'s path? | Scoreable |
| Campus & Living | 6 | What will [Student]'s room or place look like? | Keepsake |
| Campus & Living | 9 | What campus spot will become [Student]'s favorite? | Scoreable |
| Social Life & Friends | 3 | What club or org will [Student] join? | Scoreable |
| Social Life & Friends | 6 | Who will [Student] be in their friend group? | Keepsake |
| Social Life & Friends | 10 | What tradition will [Student] and their friends start? | Keepsake |
| Fun, Chaos & College Life | 1 | What will [Student] be famous for among friends? | Keepsake |
| Fun, Chaos & College Life | 2 | What is the wildest thing [Student] will do in college? | Keepsake |
| Fun, Chaos & College Life | 4 | What food will [Student] live on? | Scoreable |
| Fun, Chaos & College Life | 7 | What questionable fashion phase will [Student] go through? | Keepsake |
| Fun, Chaos & College Life | 10 | Will [Student] adopt a signature look or style? | Keepsake |
| Fun, Chaos & College Life | 11 | What will [Student] procrastinate on the most? | Keepsake |
| Money & Work | 2 | What kind of job or side hustle will [Student] have? | Scoreable |
| Money & Work | 7 | What will [Student] splurge on that they cannot afford? | Scoreable |
| Money & Work | 12 | What money habit from college will stick with [Student]? | Keepsake |
| Personal Growth | 2 | What belief or view will [Student] change in college? | Keepsake |
| Personal Growth | 4 | What new skill will [Student] pick up? | Scoreable |
| Personal Growth | 6 | What habit will [Student] build in college? | Keepsake |
| Personal Growth | 8 | What will [Student] be most proud of by graduation? | Keepsake |
| Personal Growth | 10 | What fear will [Student] conquer in college? | Keepsake |
| Personal Growth | 12 | What lesson will [Student] learn the hard way? | Keepsake |
| After Graduation | 2 | What city will [Student] end up in? | Scoreable |
| After Graduation | 7 | What will [Student]'s first apartment be like? | Keepsake |
| After Graduation | 10 | What surprising direction will [Student]'s career take? | Keepsake |
| Wildcards & Milestones | 1 | What is the biggest thing [Student] will accomplish in college? | Scoreable |
| Wildcards & Milestones | 4 | What is one thing nobody would predict about [Student]'s college years? | Keepsake |
| Wildcards & Milestones | 7 | What will [Student] miss most about college? | Keepsake |
| Wildcards & Milestones | 9 | Who will [Student] credit most for getting them through? | Scoreable |
| Wildcards & Milestones | 12 | What is one prediction about [Student] that will absolutely come true? | Keepsake |

---

## 8. Job

### Number questions, 11

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| The Role & Path | 3 | How many different careers will [Person] have in their life? | careers | 1 | 10 | 1 |
| Company & Industry | 1 | How many companies will [Person] work for over their career? | companies | 1 | 20 | 2 |
| Company & Industry | 7 | How long will [Person] stay at their current or next job (in years)? | years | 0 | 30 | 1 |
| Money & Compensation | 2 | In how many years will [Person] reach their income goal? | years | 0 | 20 | 1 |
| Money & Compensation | 9 | Roughly what will [Person] earn at their peak (in thousands)? | thousands of dollars | 0 | 500 | 15 |
| Growth & Promotion | 1 | How soon until [Person]'s next promotion (in years)? | years | 0 | 10 | 1 |
| Growth & Promotion | 10 | How many promotions will [Person] earn over their career? | promotions | 0 | 15 | 2 |
| Big Moves & Risks | 9 | How many big career risks will [Person] take? | risks | 0 | 10 | 1 |
| Long-Term & Legacy | 2 | At what age will [Person] retire? | years old | 40 | 85 | 2 |
| Long-Term & Legacy | 11 | How many people will [Person] have mentored by the end? | people | 0 | 100 | 10 |
| Wildcards & Milestones | 9 | How many years until [Person] feels they have "made it"? | years | 0 | 25 | 2 |

### Free text questions, 26

| Sub-category | # | Question | Flag |
|---|---|---|---|
| The Role & Path | 1 | What job title will [Person] hold in 5 years? | Scoreable |
| The Role & Path | 5 | What is [Person]'s secret dream job? | Keepsake |
| The Role & Path | 8 | What field will [Person] surprise everyone by moving into? | Keepsake |
| Company & Industry | 3 | What industry will [Person] end up in? | Scoreable |
| Company & Industry | 9 | What company would [Person] love to work for? | Keepsake |
| Company & Industry | 12 | What city will [Person]'s career take them to? | Scoreable |
| Money & Compensation | 6 | What will [Person] splurge on with their first big paycheck? | Scoreable |
| Money & Compensation | 11 | What perk or benefit will matter most to [Person]? | Keepsake |
| Growth & Promotion | 5 | What skill will fuel [Person]'s biggest career jump? | Keepsake |
| Growth & Promotion | 8 | What certification or credential will [Person] chase? | Scoreable |
| Growth & Promotion | 12 | What will [Person] be the go-to person for? | Keepsake |
| Work Style & Reputation | 3 | What will coworkers say [Person] is best at? | Keepsake |
| Work Style & Reputation | 6 | What is [Person]'s professional superpower? | Keepsake |
| Work Style & Reputation | 9 | What reputation will [Person] build in their field? | Keepsake |
| Work Style & Reputation | 12 | What habit will define how [Person] works? | Keepsake |
| Big Moves & Risks | 2 | What kind of business might [Person] launch? | Keepsake |
| Big Moves & Risks | 7 | What bold move would surprise everyone who knows [Person]? | Keepsake |
| Big Moves & Risks | 11 | What will [Person] leave a stable job for? | Keepsake |
| Long-Term & Legacy | 1 | What will [Person] be remembered for professionally? | Keepsake |
| Long-Term & Legacy | 5 | What impact will [Person] want to have made? | Keepsake |
| Long-Term & Legacy | 8 | What advice will [Person] give the next generation? | Keepsake |
| Long-Term & Legacy | 12 | What legacy will [Person] leave in their field? | Keepsake |
| Wildcards & Milestones | 1 | What is the biggest career milestone [Person] will hit in 5 years? | Scoreable |
| Wildcards & Milestones | 4 | What is one career prediction nobody else would make about [Person]? | Keepsake |
| Wildcards & Milestones | 7 | What unexpected opportunity will change [Person]'s path? | Keepsake |
| Wildcards & Milestones | 11 | What is one thing about [Person]'s career guaranteed to come true? | Keepsake |

---

## 9. Travel

### Number questions, 5

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| The Route & Destinations | 1 | How many countries will [Traveler] visit on this trip? | countries | 0 | 30 | 2 |
| The Route & Destinations | 6 | How many cities will [Traveler] visit in total? | cities | 0 | 60 | 4 |
| People & Connections | 1 | How many new friends will [Traveler] make? | friends | 0 | 50 | 5 |
| Money & Logistics | 8 | How many bags will [Traveler] end up traveling with? | bags | 0 | 8 | 1 |
| The Return & Wildcards | 10 | How many months until [Traveler] is itching to leave again? | months | 0 | 24 | 2 |

### Free text questions, 42

| Sub-category | # | Question | Flag |
|---|---|---|---|
| The Route & Destinations | 2 | What will be [Traveler]'s favorite destination? | Scoreable |
| The Route & Destinations | 4 | What place will [Traveler] fall unexpectedly in love with? | Scoreable |
| The Route & Destinations | 8 | What place will [Traveler] skip that everyone expects? | Scoreable |
| The Route & Destinations | 10 | What will be the longest [Traveler] stays in one place? | Keepsake |
| The Route & Destinations | 12 | What destination will [Traveler] vow to return to? | Scoreable |
| Highs & Adventures | 1 | What will be the highlight of the whole trip? | Keepsake |
| Highs & Adventures | 2 | What bold or daring thing will [Traveler] try? | Scoreable |
| Highs & Adventures | 5 | What will be [Traveler]'s proudest moment out there? | Keepsake |
| Highs & Adventures | 7 | What unexpected experience will steal the show? | Keepsake |
| Highs & Adventures | 9 | What photo will [Traveler] be most proud of? | Keepsake |
| Highs & Adventures | 11 | What story will [Traveler] tell for years? | Keepsake |
| Mishaps & Chaos | 2 | What will go hilariously wrong? | Keepsake |
| Mishaps & Chaos | 4 | What travel mishap will become the best story? | Keepsake |
| Mishaps & Chaos | 7 | What will [Traveler] forget to pack? | Scoreable |
| Mishaps & Chaos | 9 | What will be the biggest "we survived that" moment? | Keepsake |
| Mishaps & Chaos | 11 | What plan will fall apart and turn out better? | Keepsake |
| People & Connections | 4 | Who will [Traveler] miss most from home? | Scoreable |
| People & Connections | 6 | What kind of people will [Traveler] gravitate toward? | Keepsake |
| People & Connections | 8 | What local will leave a lasting impression? | Keepsake |
| People & Connections | 10 | Who from the send-off will [Traveler] video-call the most? | Scoreable |
| People & Connections | 12 | What connection will surprise everyone? | Keepsake |
| Money & Logistics | 3 | What will [Traveler] splurge on that is worth every penny? | Scoreable |
| Money & Logistics | 6 | What will [Traveler] spend way more on than expected? | Scoreable |
| Money & Logistics | 10 | What item will turn out to be the best thing [Traveler] packed? | Scoreable |
| Money & Logistics | 12 | What souvenir will [Traveler] absolutely bring back? | Scoreable |
| Food & Culture | 1 | What food will [Traveler] fall in love with? | Scoreable |
| Food & Culture | 3 | What dish will [Traveler] refuse to try? | Scoreable |
| Food & Culture | 5 | What custom or tradition will [Traveler] embrace? | Scoreable |
| Food & Culture | 7 | What will be [Traveler]'s go-to meal on the road? | Scoreable |
| Food & Culture | 9 | What flavor or smell will forever remind [Traveler] of this trip? | Keepsake |
| Food & Culture | 11 | What cultural moment will move [Traveler] most? | Keepsake |
| Change & Growth | 1 | How will [Traveler] come back different? | Keepsake |
| Change & Growth | 3 | What fear will [Traveler] conquer out there? | Keepsake |
| Change & Growth | 5 | What belief or view will [Traveler] rethink? | Keepsake |
| Change & Growth | 7 | What habit will [Traveler] build on the road? | Keepsake |
| Change & Growth | 9 | What will [Traveler] appreciate more about home? | Keepsake |
| Change & Growth | 11 | What lesson will [Traveler] carry home? | Keepsake |
| The Return & Wildcards | 3 | What is the wildest thing [Traveler] will do on this trip? | Keepsake |
| The Return & Wildcards | 5 | What will [Traveler] miss most about being away? | Keepsake |
| The Return & Wildcards | 7 | What is one thing nobody predicts about this trip? | Keepsake |
| The Return & Wildcards | 9 | What will be the first thing [Traveler] does back home? | Scoreable |
| The Return & Wildcards | 11 | What is one prediction about this trip guaranteed to come true? | Keepsake |

---

## 10. Retirement

### Number questions, 7

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| The First Year | 5 | How long until [Retiree] picks up a new project (in months)? | months | 0 | 24 | 2 |
| Hobbies & Passions | 7 | How many hobbies will [Retiree] juggle at once? | hobbies | 0 | 10 | 1 |
| Travel & Adventure | 1 | How many countries will [Retiree] visit in retirement? | countries | 0 | 50 | 3 |
| Travel & Adventure | 11 | How many trips will [Retiree] take in a typical year? | trips | 0 | 24 | 2 |
| Money & Lifestyle | 10 | How many years will [Retiree] say they should have retired earlier? | years | 0 | 15 | 1 |
| Reinvention & Purpose | 11 | How many years until [Retiree] calls this the best chapter yet? | years | 0 | 15 | 1 |
| Wildcards & Milestones | 10 | How many years until [Retiree] jokes they need a vacation from retirement? | years | 0 | 10 | 1 |

### Free text questions, 35

| Sub-category | # | Question | Flag |
|---|---|---|---|
| The First Year | 1 | What is the first thing [Retiree] does in retirement? | Scoreable |
| The First Year | 7 | What will [Retiree] finally have time for? | Scoreable |
| The First Year | 9 | What will [Retiree] do on their first Monday off? | Scoreable |
| The First Year | 11 | Who will [Retiree] spend the most new free time with? | Scoreable |
| The First Year | 12 | What work habit will [Retiree] keep out of pure routine? | Keepsake |
| Hobbies & Passions | 1 | What new hobby will [Retiree] pick up? | Scoreable |
| Hobbies & Passions | 4 | What hobby will [Retiree] pick up and then abandon? | Scoreable |
| Hobbies & Passions | 9 | What will [Retiree] become surprisingly good at? | Keepsake |
| Hobbies & Passions | 11 | What old hobby will [Retiree] finally return to? | Scoreable |
| Travel & Adventure | 2 | What is the first big trip [Retiree] takes? | Scoreable |
| Travel & Adventure | 4 | What dream destination will [Retiree] finally reach? | Scoreable |
| Travel & Adventure | 7 | Who will [Retiree] travel with most? | Scoreable |
| Travel & Adventure | 12 | What place will [Retiree] love so much they keep going back? | Scoreable |
| Everyday Life & Staying Active | 3 | What will [Retiree]'s daily routine look like? | Keepsake |
| Everyday Life & Staying Active | 6 | What show or hobby will [Retiree] binge with the free time? | Scoreable |
| Everyday Life & Staying Active | 9 | What everyday pleasure will [Retiree] savor most? | Keepsake |
| Everyday Life & Staying Active | 11 | What will [Retiree] finally slow down and enjoy? | Keepsake |
| Money & Lifestyle | 2 | What will [Retiree] splurge on in retirement? | Scoreable |
| Money & Lifestyle | 5 | What big purchase will [Retiree] finally make? | Scoreable |
| Money & Lifestyle | 8 | What will [Retiree]'s dream retirement home look like? | Keepsake |
| Money & Lifestyle | 11 | What money worry will turn out to be nothing? | Keepsake |
| Family & Social | 2 | Who will [Retiree] see the most in retirement? | Scoreable |
| Family & Social | 5 | What role will [Retiree] play in the family now? | Keepsake |
| Family & Social | 8 | What tradition will [Retiree] start with the grandkids? | Scoreable |
| Family & Social | 10 | Who will [Retiree] call first when something exciting happens? | Scoreable |
| Family & Social | 12 | What family role will surprise everyone? | Keepsake |
| Reinvention & Purpose | 4 | What cause will [Retiree] throw themselves into? | Scoreable |
| Reinvention & Purpose | 7 | What new identity will [Retiree] grow into? | Keepsake |
| Reinvention & Purpose | 9 | What skill will [Retiree] finally have time to master? | Scoreable |
| Reinvention & Purpose | 12 | What will [Retiree] want to be remembered for from this chapter? | Keepsake |
| Wildcards & Milestones | 1 | What is the biggest thing [Retiree] will do in the first 5 years? | Scoreable |
| Wildcards & Milestones | 4 | What is the wildest thing [Retiree] will do in retirement? | Keepsake |
| Wildcards & Milestones | 6 | What will [Retiree] be doing on a random Tuesday in 3 years? | Keepsake |
| Wildcards & Milestones | 9 | What surprising skill or interest will emerge? | Keepsake |
| Wildcards & Milestones | 11 | What is one prediction nobody else would make about [Retiree]? | Keepsake |

---

## 11. New Business

### Number questions, 9

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Survival & Growth | 2 | In how many years will [Business] turn a profit? | years | 0 | 10 | 1 |
| Survival & Growth | 4 | How many employees will [Business] have in 5 years? | employees | 0 | 100 | 5 |
| Survival & Growth | 11 | How many customers will [Business] have in year one? | customers | 0 | 1000 | 50 |
| The Team & People | 2 | How big will the team get in the first two years? | people | 0 | 50 | 3 |
| Money & Funding | 3 | How many months until [Business]'s first paying customer? | months | 0 | 24 | 2 |
| Money & Funding | 5 | Roughly what will [Business] make in year one (in thousands)? | thousands of dollars | 0 | 1000 | 25 |
| Money & Funding | 11 | How many years until [Business] feels financially stable? | years | 0 | 10 | 1 |
| Milestones & Wins | 6 | How many years until [Business] feels like a "real" company? | years | 0 | 10 | 1 |
| Wildcards & The Long Game | 10 | How many years until [Business] hits its biggest goal? | years | 0 | 15 | 1 |

### Free text questions, 36

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Survival & Growth | 7 | What will [Business] look like in 5 years? | Keepsake |
| Survival & Growth | 10 | What number will [Business] be proudest of hitting? | Keepsake |
| The Team & People | 1 | Who will be [Business]'s first hire? | Scoreable |
| The Team & People | 5 | Who from the launch will end up working there? | Scoreable |
| The Team & People | 7 | What role will [Founder] be worst at delegating? | Keepsake |
| The Team & People | 9 | Who will be [Founder]'s right-hand person? | Scoreable |
| The Team & People | 11 | What will the company culture be famous for? | Keepsake |
| Money & Funding | 2 | What will [Business]'s first big sale be? | Scoreable |
| Money & Funding | 7 | What will [Founder] splurge on with the first real profit? | Scoreable |
| Money & Funding | 10 | What unexpected cost will [Founder] not see coming? | Keepsake |
| The Product & The Pivot | 2 | What new product or service will [Business] add? | Scoreable |
| The Product & The Pivot | 4 | What will customers love most about [Business]? | Keepsake |
| The Product & The Pivot | 6 | What feature or idea will [Founder] be talked out of? | Keepsake |
| The Product & The Pivot | 9 | What will [Business] be surprisingly good at? | Keepsake |
| The Product & The Pivot | 11 | What will [Business] stop doing that it started with? | Scoreable |
| Milestones & Wins | 1 | What will be [Business]'s first big win? | Scoreable |
| Milestones & Wins | 4 | What milestone will the team celebrate hardest? | Keepsake |
| Milestones & Wins | 7 | What headline would [Founder] love to see about [Business]? | Keepsake |
| Milestones & Wins | 9 | What will be the "we made it" moment? | Keepsake |
| Milestones & Wins | 11 | What first will the team frame and hang on the wall? | Scoreable |
| The Founder's Journey | 2 | What will [Founder] find hardest about running [Business]? | Keepsake |
| The Founder's Journey | 4 | What will [Founder] learn the hard way? | Keepsake |
| The Founder's Journey | 6 | What skill will [Founder] be forced to learn? | Scoreable |
| The Founder's Journey | 8 | What advice will [Founder] wish they had taken? | Keepsake |
| The Founder's Journey | 10 | How will [Founder] change as a leader? | Keepsake |
| The Founder's Journey | 12 | What will [Founder] be proudest of? | Keepsake |
| Reputation & Market | 2 | Who will [Business]'s biggest rival be? | Scoreable |
| Reputation & Market | 4 | What will customers say about [Business] in reviews? | Keepsake |
| Reputation & Market | 7 | What will [Business]'s reputation be in its industry? | Keepsake |
| Reputation & Market | 9 | What will make [Business] stand out from the pack? | Keepsake |
| Reputation & Market | 11 | Will [Business] have a signature thing people know it for? | Keepsake |
| Wildcards & The Long Game | 2 | What is the wildest direction [Business] could go? | Keepsake |
| Wildcards & The Long Game | 4 | What is one thing nobody predicts about [Business]? | Keepsake |
| Wildcards & The Long Game | 6 | Where will [Business] be in 10 years? | Keepsake |
| Wildcards & The Long Game | 8 | What surprising opportunity will change everything for [Business]? | Keepsake |
| Wildcards & The Long Game | 11 | What is one thing about [Business] guaranteed to come true? | Keepsake |

---

## 12. New Year

### Number questions, 5

| Sub-category | # | Question | Unit | Min | Max | Close band |
|---|---|---|---|---|---|---|
| Big Moves & Changes | 10 | How many big life changes will [Person] go through this year? | changes | 0 | 10 | 1 |
| Resolutions & Habits | 7 | How many resolutions will [Person] set? | resolutions | 0 | 15 | 1 |
| Money & Work | 11 | How many months until [Person]'s next big work moment? | months | 0 | 12 | 1 |
| Fun & Social | 2 | How many trips or getaways will [Person] go on? | trips | 0 | 20 | 2 |
| Predictions & Payoffs | 10 | How many months until [Person]'s biggest moment of the year? | months | 0 | 12 | 1 |

### Free text questions, 40

| Sub-category | # | Question | Flag |
|---|---|---|---|
| Big Moves & Changes | 3 | What is the biggest change coming for [Person] this year? | Scoreable |
| Big Moves & Changes | 6 | What will [Person] finally commit to this year? | Scoreable |
| Big Moves & Changes | 8 | What surprise change will catch everyone off guard? | Keepsake |
| Big Moves & Changes | 11 | What will [Person] leave behind this year? | Keepsake |
| Resolutions & Habits | 1 | What resolution will [Person] actually keep? | Scoreable |
| Resolutions & Habits | 2 | What resolution will [Person] drop by February? | Scoreable |
| Resolutions & Habits | 5 | What habit will [Person] finally break? | Scoreable |
| Resolutions & Habits | 9 | What good habit will [Person] surprise themselves with? | Keepsake |
| Resolutions & Habits | 11 | What will [Person] do more of this year? | Keepsake |
| Money & Work | 3 | What will [Person] splurge on this year? | Scoreable |
| Money & Work | 6 | What career move will [Person] make? | Scoreable |
| Money & Work | 9 | What work win will [Person] celebrate? | Scoreable |
| Money & Work | 12 | What money habit will [Person] build this year? | Keepsake |
| Fun & Social | 1 | What trip will [Person] take this year? | Scoreable |
| Fun & Social | 5 | What new experience will [Person] say yes to? | Scoreable |
| Fun & Social | 7 | What hobby or scene will [Person] get into this year? | Scoreable |
| Fun & Social | 9 | What fun thing will [Person] finally do? | Scoreable |
| Fun & Social | 11 | What event will be the highlight of [Person]'s year? | Scoreable |
| Love & Relationships | 3 | What relationship milestone will [Person] hit? | Scoreable |
| Love & Relationships | 6 | Who will play a bigger role in [Person]'s life this year? | Scoreable |
| Love & Relationships | 8 | What relationship will surprise everyone? | Keepsake |
| Love & Relationships | 10 | Who will [Person] grow closer to? | Scoreable |
| Love & Relationships | 12 | What will [Person]'s love life look like by December? | Keepsake |
| Personal Growth | 1 | What new skill will [Person] pick up this year? | Scoreable |
| Personal Growth | 3 | How will [Person] grow the most this year? | Keepsake |
| Personal Growth | 5 | What will [Person] be proudest of this year? | Keepsake |
| Personal Growth | 7 | What belief or mindset will [Person] shift? | Keepsake |
| Personal Growth | 9 | What lesson will [Person] learn this year? | Keepsake |
| Personal Growth | 11 | What version of themselves will [Person] grow into? | Keepsake |
| Wildcards & Surprises | 1 | What is the wildest thing [Person] will do this year? | Keepsake |
| Wildcards & Surprises | 3 | What unexpected opportunity will land in [Person]'s lap? | Keepsake |
| Wildcards & Surprises | 5 | What is one thing nobody predicts for [Person] this year? | Keepsake |
| Wildcards & Surprises | 7 | What lucky break will come [Person]'s way? | Keepsake |
| Wildcards & Surprises | 9 | What plot twist is coming for [Person] this year? | Keepsake |
| Wildcards & Surprises | 11 | What surprise will [Person] be telling stories about? | Keepsake |
| Predictions & Payoffs | 2 | What is the one goal [Person] will absolutely hit? | Scoreable |
| Predictions & Payoffs | 4 | What word will describe [Person]'s year? | Keepsake |
| Predictions & Payoffs | 6 | What will [Person] be celebrating next New Year's? | Keepsake |
| Predictions & Payoffs | 8 | What is one prediction guaranteed to come true for [Person]? | Keepsake |
| Predictions & Payoffs | 11 | What will surprise [Person] most about their own year? | Keepsake |

---

## 13. Totals

| Bank | Number | Free text | Total |
|---|---|---|---|
| Marriage | 12 | 20 | 32 |
| Couple | 9 | 20 | 29 |
| New Baby | 11 | 33 | 44 |
| Child Growth | 10 | 29 | 39 |
| College | 10 | 31 | 41 |
| Job | 11 | 26 | 37 |
| Travel | 5 | 42 | 47 |
| Retirement | 7 | 35 | 42 |
| New Business | 9 | 36 | 45 |
| New Year | 5 | 40 | 45 |
| **Total** | **89** | **312** | **401** |

---

## 14. Notes for the builder

- Attach this metadata to the permanent generated question IDs at import. The printed numbers in the bank tables are display order, not identity.
- A close band of 0 is a real value meaning exact only. Do not treat it as missing.
- Free text scoring is unchanged: scoreable answers go through cluster grouping and pre-sorting against the operator's typed true answer, confirmed per cluster. Keepsakes never enter that flow and never touch the scoreboard.
- The three questions listed in section 2 keep their original Free text type. Two are scoreable on exact match with no band. Do not add a band to a free text question.
- Every bank mixes scoreable and keepsake free text deliberately. Keepsake-heavy banks such as New Year, Travel, and Job still produce full scoreboards because their name-pick and multiple choice questions, which are the majority of every bank, are all scoreable.
