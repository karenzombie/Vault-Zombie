# VaultZombie Question Bank: Job / Occupation Vault

For a career vault (guests predict how someone's professional path will unfold). Good for a new job, a graduation into the working world, a career pivot, or a "where will they be in 10 years" bet. Single subject, so there is no two-person name-pick. This type leans on number, multiple choice, and free text.

## How to read this

- **Three levels:** Vault type (Job / Occupation) > Sub-category (8 below) > Questions.
- **Placeholder:** "[Person]" resolves to the subject's name at setup.
- **Answer type** is fixed per question. Three used here:
  - **Number:** guest enters a figure (a count, an age, a salary in thousands, a number of years).
  - **Multiple choice:** guest picks from the defined options listed.
  - **Free text:** guest types an answer, hard-capped at 140 characters.
  - (Name-pick is not used in this single-subject type. It can be added from the admin panel if you ever want one.)
- **No reveal date is attached to a question.** The operator picks one reveal schedule at vault setup (Weekly Sprint, Monthly x3, Monthly Year, Half-then-Annual, or Annual Keepsake), and that schedule produces the vault's reveal dates. When a guest answers, they pick one of those dates for each answer. See the master build brief, section 4.
- All content is editable, reorderable, and expandable from the admin panel without code changes.

**Count:** 96 questions across 8 sub-categories (12 each).

---

## 1. The Role & Path

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | What job title will [Person] hold in 5 years? | Free text | 140 char |
| 2 | Will [Person] stay in their current field? | Multiple choice | Yes / No / A related one |
| 3 | How many different careers will [Person] have in their life? | Number | |
| 4 | Will [Person] end up in the career they studied for? | Multiple choice | Yes / No / Somewhere adjacent |
| 5 | What is [Person]'s secret dream job? | Free text | 140 char |
| 6 | Big company or small one? | Multiple choice | Big corporation / Small company / Their own thing |
| 7 | Will [Person] switch careers entirely at some point? | Multiple choice | Yes / No / They will think about it |
| 8 | What field will [Person] surprise everyone by moving into? | Free text | 140 char |
| 9 | Straight path or a winding one? | Multiple choice | Straight climb / Winding road / Total left turn |
| 10 | Will [Person] go back to school for their career? | Multiple choice | Yes / No / A certificate or two |
| 11 | What role suits [Person] best? | Multiple choice | The leader / The specialist / The creative / The connector |
| 12 | Will [Person] end up managing people? | Multiple choice | Yes, a big team / A small team / Prefers to fly solo |

---

## 2. Company & Industry

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | How many companies will [Person] work for over their career? | Number | |
| 2 | Job-hopper or loyal to one employer? | Multiple choice | Job-hopper / Loyal / A couple of long stints |
| 3 | What industry will [Person] end up in? | Free text | 140 char |
| 4 | Will [Person] work at a company everyone has heard of? | Multiple choice | Yes / No / One that gets famous later |
| 5 | Remote, in-office, or hybrid long term? | Multiple choice | Remote / In-office / Hybrid |
| 6 | Will [Person] ever work abroad? | Multiple choice | Yes / No / They will get close |
| 7 | How long will [Person] stay at their current or next job (in years)? | Number | |
| 8 | Will [Person] work in a field that barely exists yet? | Multiple choice | Yes / No / Maybe |
| 9 | What company would [Person] love to work for? | Free text | 140 char |
| 10 | Startup or established name? | Multiple choice | Startup / Established company / Both at different times |
| 11 | Will [Person] relocate for a job? | Multiple choice | Yes / No / Only for the right one |
| 12 | What city will [Person]'s career take them to? | Free text | 140 char |

---

## 3. Money & Compensation

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Will [Person] hit six figures? | Multiple choice | Yes / Already have / Not the goal for them |
| 2 | In how many years will [Person] reach their income goal? | Number | |
| 3 | Will [Person] negotiate a big raise? | Multiple choice | Yes / No / They will leave for one instead |
| 4 | More from a salary or from something they build? | Multiple choice | Salary / Something they build / A mix |
| 5 | Will [Person] have multiple income streams? | Multiple choice | Yes / No / One main plus a side hustle |
| 6 | What will [Person] splurge on with their first big paycheck? | Free text | 140 char |
| 7 | Saver or spender as they earn more? | Multiple choice | Saver / Spender / Balanced |
| 8 | Will [Person] take a pay cut for a job they love? | Multiple choice | Yes / No / They will be tempted |
| 9 | Roughly what will [Person] earn at their peak (in thousands)? | Number | |
| 10 | Will [Person] invest boldly or play it safe? | Multiple choice | Invests boldly / Plays it safe / A bit of both |
| 11 | What perk or benefit will matter most to [Person]? | Free text | 140 char |
| 12 | Will money or meaning drive [Person]'s choices more? | Multiple choice | Money / Meaning / They will find both |

---

## 4. Growth & Promotion

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | How soon until [Person]'s next promotion (in years)? | Number | |
| 2 | Will [Person] climb to a senior leadership role? | Multiple choice | Yes / No / They will choose not to |
| 3 | Will [Person] be the youngest to reach their level? | Multiple choice | Yes / No / Right on schedule |
| 4 | Will [Person] mentor others? | Multiple choice | Yes / No / They already do |
| 5 | What skill will fuel [Person]'s biggest career jump? | Free text | 140 char |
| 6 | Will [Person] get headhunted for a role? | Multiple choice | Yes / No / More than once |
| 7 | Will [Person] ever have "director" or higher in their title? | Multiple choice | Yes / No / They will run their own instead |
| 8 | What certification or credential will [Person] chase? | Free text | 140 char |
| 9 | Where will [Person]'s biggest growth come from? | Multiple choice | A job / A risk / A mentor |
| 10 | How many promotions will [Person] earn over their career? | Number | |
| 11 | Will [Person] be recognized publicly (award, feature, talk)? | Multiple choice | Yes / No / In their industry circles |
| 12 | What will [Person] be the go-to person for? | Free text | 140 char |

---

## 5. Work Style & Reputation

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Early bird or night-owl worker? | Multiple choice | Early bird / Night owl / Whenever inspiration hits |
| 2 | Hard worker or smart worker? | Multiple choice | Hard worker / Works smart / Both |
| 3 | What will coworkers say [Person] is best at? | Free text | 140 char |
| 4 | Workaholic or work-life-balance champion? | Multiple choice | Workaholic / Balanced / Learns balance the hard way |
| 5 | Office favorite or quiet powerhouse? | Multiple choice | Office favorite / Quiet powerhouse / A bit of a lone wolf |
| 6 | What is [Person]'s professional superpower? | Free text | 140 char |
| 7 | Will [Person] speak at a conference or event? | Multiple choice | Yes / No / They will get asked |
| 8 | Big-picture thinker or details person? | Multiple choice | Big picture / Details / Somehow both |
| 9 | What reputation will [Person] build in their field? | Free text | 140 char |
| 10 | The mentor, the disruptor, or the steady hand? | Multiple choice | The mentor / The disruptor / The steady hand |
| 11 | Comfortable with public speaking by their peak? | Multiple choice | Yes / No / They will fake it well |
| 12 | What habit will define how [Person] works? | Free text | 140 char |

---

## 6. Big Moves & Risks

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | Will [Person] start their own business? | Multiple choice | Yes / No / Someday |
| 2 | What kind of business might [Person] launch? | Free text | 140 char |
| 3 | Will [Person] take a big career risk in the next 5 years? | Multiple choice | Yes / No / A calculated one |
| 4 | Will [Person] ever quit a job with nothing lined up? | Multiple choice | Yes / No / They will be tempted |
| 5 | Will [Person] pivot to a completely different industry? | Multiple choice | Yes / No / Maybe once |
| 6 | Will a risk [Person] takes pay off? | Multiple choice | Yes, big / It will be rocky / They will play it safe instead |
| 7 | What bold move would surprise everyone who knows [Person]? | Free text | 140 char |
| 8 | Will [Person] freelance or go independent at some point? | Multiple choice | Yes / No / As a side thing |
| 9 | How many big career risks will [Person] take? | Number | |
| 10 | Will [Person] chase a passion project on the side? | Multiple choice | Yes / No / It becomes the main thing |
| 11 | What will [Person] leave a stable job for? | Free text | 140 char |
| 12 | Bet on themselves or stay the safe course? | Multiple choice | Bet on themselves / Play it safe / A bit of both |

---

## 7. Long-Term & Legacy

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | What will [Person] be remembered for professionally? | Free text | 140 char |
| 2 | At what age will [Person] retire? | Number | |
| 3 | Retire early, on time, or never fully? | Multiple choice | Early / On time / Never fully stops |
| 4 | End their career in the same field they started? | Multiple choice | Yes / No / A surprising place |
| 5 | What impact will [Person] want to have made? | Free text | 140 char |
| 6 | Will [Person] write a book, teach, or share their expertise? | Multiple choice | Yes / No / They will mean to |
| 7 | Will [Person] build something that outlasts them? | Multiple choice | Yes / No / They will try |
| 8 | What advice will [Person] give the next generation? | Free text | 140 char |
| 9 | Look back proud or wish they had taken more risks? | Multiple choice | Proud / Wish they risked more / A healthy mix |
| 10 | Will [Person] have a second act after their main career? | Multiple choice | Yes / No / A quiet one |
| 11 | How many people will [Person] have mentored by the end? | Number | |
| 12 | What legacy will [Person] leave in their field? | Free text | 140 char |

---

## 8. Wildcards & Milestones

| # | Prompt | Type | Options / Notes |
|---|--------|------|-----------------|
| 1 | What is the biggest career milestone [Person] will hit in 5 years? | Free text | 140 char |
| 2 | Will [Person] go viral or get famous for their work? | Multiple choice | Yes / No / In their niche |
| 3 | Will [Person]'s dream job actually make them happy? | Multiple choice | Yes / No / They will redefine the dream |
| 4 | What is one career prediction nobody else would make about [Person]? | Free text | 140 char |
| 5 | Will [Person]'s career look as planned or totally different in 10 years? | Multiple choice | As planned / A little different / Completely different |
| 6 | Will [Person] end up as the boss of someone they once worked with? | Multiple choice | Yes / No / The other way around |
| 7 | What unexpected opportunity will change [Person]'s path? | Free text | 140 char |
| 8 | Will [Person] find their calling early or late? | Multiple choice | Early / Late / They already have it |
| 9 | How many years until [Person] feels they have "made it"? | Number | |
| 10 | Will [Person] be doing this same line of work in 10 years? | Multiple choice | Yes / No / An evolved version of it |
| 11 | What is one thing about [Person]'s career guaranteed to come true? | Free text | 140 char |
| 12 | Mentor, legend, or quiet expert in their field? | Multiple choice | Mentor / Legend / Quiet expert |
