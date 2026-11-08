# Multitasking Experiment

Everything is in one file, `experiment.html`. It runs in the browser and sends nothing over the internet.

## Running it

Open `experiment.html` in Chrome or Firefox. If you use YouTube or ERR videos, serve the file over http instead:

```bash
python3 -m http.server 8000      # then open http://localhost:8000/experiment.html
```

### URL parameters

| Parameter | Values | Effect |
|---|---|---|
| `pid` | any text, e.g. `P07` | Participant ID. If left out, a random ID like `PK7M2QX` is generated. |
| `condition` | `1` / `2` | Video order. `1`: video A alone, video B during math. `2`: the reverse. If left out, it is random. |
| `math` | `A` / `B` | Math list for Phase 3 (math alone). The other list is used in Phase 4. If left out, it is random. |
| `lang` | `et` / `en` | Language. The default is `et`. |
| `fast` | `1` | Test mode: videos last 20 s and a Skip button appears. |
| `test` | `1` | Skip button only, with normal timings. |

To get an exact 50/50 split, rotate through these four groups:

```
P01  ?pid=P01&condition=1&math=A
P02  ?pid=P02&condition=2&math=B
P03  ?pid=P03&condition=1&math=B
P04  ?pid=P04&condition=2&math=A
```

### Steps in the experiment

| Phase | Content |
|---|---|
| 0 | Start screen, consent, fullscreen opens |
| 1 | Background questions (age, gender, education) |
| 2 | Video alone (single), then 6 multiple-choice questions (6 minutes in total, with a countdown) |
| 3 | Math alone (single), 5 minutes |
| 4 | Video and math at the same time (multi). Math ends when the video ends. Then 6 questions on the video (6 minutes, with a countdown). |
| 5 | End screen: results, debrief, CSV download |

Math problems come from two fixed lists, A and B. Each list has 50 problems with three numbers and only + and −, shown in the same order to everyone. If a participant reaches the end of a list, it starts again from problem 1. The lists are in `CONFIG.math.fixedProblems`.

## Saving the data

- **Main copy:** the **Download CSV** button on the end screen saves `multitask_<pid>_<date-time>.csv`. Click it for every participant and back the file up the same day.
- **Backup copy:** after every event, the full data is also saved in the browser's localStorage under the key `multitask_<pid>`, in JSON form. It survives an accidental tab close, but only in the same browser, opened the same way (`file://` and `http://localhost` count as separate places). A private/incognito window deletes it when closed. To recover a participant's data, reopen the experiment the same way and run this in the browser console:
  ```js
  Object.keys(localStorage).filter(k => k.startsWith('multitask_'))
  copy(localStorage.getItem('multitask_P07'))   // paste the result into a .json file
  ```

The CSV is UTF-8 with a BOM, so Excel shows õ, ä, ö and ü correctly. It is comma-separated with one row per event.

---

## Data dictionary

### What is *not* collected

No name, email, IP address, location, camera, microphone or keystrokes outside the math answer box. A participant is identified only by `pid`.

### CSV columns (every row has all columns; blank = not relevant to that event)

| Column | Content |
|---|---|
| `participant_id` | The `pid` from the URL, or the random ID |
| `condition` | `1` or `2`: video order (see URL parameters) |
| `math_single_list` | `A` or `B`: math list used in Phase 3. The other list was used in Phase 4. |
| `language` | `et` or `en`: language at the time of the event |
| `event_index` | Event number: 0, 1, 2, … |
| `timestamp_ms` | Clock time in Unix milliseconds |
| `iso_time` | The same time as an ISO date-time (UTC) |
| `t_ms` | Milliseconds since the page was opened |
| `phase` | Phase 0–5 (see the table above) |
| `event_type` | What happened (see the event list below) |
| `task_condition` | `single` (task alone) or `multi` (video and math together) |
| `video` | `A` or `B`: which video the event belongs to |
| `item_index` | Position: question number 1–6, or math problem number in the order solved |
| `item_id` | Item ID: video question (e.g. `A3`), math problem (e.g. `B12` = list B, problem 12), demographic field, or summary field name |
| `difficulty` | Difficulty of a video question: `easy` / `intermediate` / `difficult` |
| `stimulus` | Text shown: the question or the math problem (e.g. `41 − 27 + 8`) |
| `correct_answer` | The correct answer |
| `response` | The participant's answer, or a value (see the event list) |
| `response_index` | Index (0–3) of the option chosen for a video question |
| `correct` | `1` = correct, `0` = wrong |
| `rt_ms` | Response time in milliseconds |
| `details` | Extra information as a JSON string |

### Events (`event_type`)

**Session and progress**

| Event | When | Fields used |
|---|---|---|
| `session_init` | Page opened | `details`: how the video order and math list were assigned (`url`/`random`), video A/B per phase, math list per phase, test mode, browser (user agent), window size, `file:` or `http:` |
| `language_change` | Language switched on the start screen | `response` = new language |
| `consent_given` | Consent checkbox ticked and Start clicked | `response` = 1 |
| `phase_start` / `phase_end` | Start and end of each phase | `details.name`: `demographics`, `video_single`, `math_single`, `multitask`, `end`; also `video`, `task_condition` |
| `screen` | Questions intro screen shown | `video`, `task_condition` |
| `experiment_end` | End screen reached | `details`: how the video order was assigned, test mode |
| `data_download` | Download CSV clicked | `response` = file name |

**Background questions**

| Event | Fields used |
|---|---|
| `demographic` | 3 rows. `item_id` = `age` / `gender` / `education`. `response` = age (18–99), gender (`female`/`male`/`other`), or education (`basic`, `secondary`, `vocational`, `bachelor`, `master`, `doctoral`). `rt_ms` = time to fill in the form. |

**Video questions** (6 per video)

| Event | Fields used |
|---|---|
| `question_shown` | `video`, `task_condition`, `item_index`, `item_id`, `difficulty` |
| `question_answer` | Same fields, plus `stimulus` (question), `correct_answer`, `response` (chosen option text), `response_index`, `correct`, `rt_ms` (time to press Continue). `details.first_choice_rt_ms` = time to the first click on an option. |
| `questions_start` | "Start questions" clicked; the 6-minute limit starts. `details.time_limit_sec` |
| `question_timeout` | Time ran out before this question was answered (one row per remaining question). `correct` = 0 |
| `questions_end` | `details`: `correct`, `answered`, `timed_out`, `n` (number of questions), `reason` (`all_answered` / `time_limit`) |
| `question_skipped` | Test mode only: question skipped with the Skip button |

**Math**

| Event | Fields used |
|---|---|
| `task_start` | `task_condition`, `details.list` = which list (A/B) |
| `math_answer` | One row per answer: `task_condition`, `item_index`, `item_id` (e.g. `A12`), `stimulus`, `correct_answer`, `response`, `correct`, `rt_ms` (from the problem appearing to pressing Enter) |
| `math_unanswered` | The problem on screen when time ran out: what had been typed so far (`response`) and how long it had been shown (`rt_ms`) |
| `math_list_restart` | The list ran out and started again from problem 1. `details.round` = round number. |
| `task_end` | `details`: end reason (`time_limit`, `video_end:…`, `test_skip`), `attempted`, `correct`, `wrong`, `rt_sum` |

**Video playback**

| Event | Fields used |
|---|---|
| `video_start` | Video started loading. `details`: type, URL, expected length. |
| `video_ready` | YouTube player ready |
| `video_state` | Player state: `response` = `playing` / `paused` / `buffering` / `ended` …. `details.current_time` = position in seconds. |
| `video_state` = `play_assumed` | ERR video: the participant clicked ▶ (or no click was seen within 30 s). The 4:36 timer starts here. `details`: `trigger` (`player_click` / `no_click_timeout`), `wait_ms` (time from player shown to click), `cut_after_sec` |
| `video_player_focus` | ERR video: participant clicked or focused the player again after it started; focus was taken back |
| `video_key_blocked` | ERR video: Tab key blocked (it would move focus into the player). `response` = key |
| `video_manual_start_click` | The video didn't start by itself and the participant clicked "Click to start" |
| `video_end` | Video ended. `details.reason`: `ended_event` (normal end), `fallback_timer` (end signal didn't arrive, ended by timer), `test_mode_cap`, `test_skip` |
| `video_error`, `youtube_api_load_error`, `warning` | Errors loading or playing the video |

**Attention and compliance**

| Event | Meaning |
|---|---|
| `fullscreen_enter` / `fullscreen_exit` | Entered or left fullscreen |
| `fullscreen_unsupported`, `fullscreen_error` | The browser doesn't support fullscreen, or fullscreen failed |
| `tab_hidden` / `tab_visible` | Participant switched to another tab or app, and came back |
| `prompt_shown` / `prompt_button_click` / `prompt_closed` | "Return to fullscreen" or "Stay on this page" warning shown or closed. `details.kind` = `fs` / `tab` |
| `back_navigation_blocked` | Pressed the browser's back button (blocked) |
| `unload_attempt` | Tried to close or reload the page |
| `test_skip` | Test mode: a screen was skipped with the Skip button |

### Summary rows (`event_type = summary`)

Written once at the end. `item_id` = field name, `response` = value. These give one value per participant for analysis, e.g. a paired t-test.

| `item_id` | Content |
|---|---|
| `video_single_id` / `video_multi_id` | Video shown alone / during multitasking (A/B) |
| `video_single_correct` / `video_multi_correct` | Correct video answers out of 6 |
| `video_single_answered` / `video_multi_answered` | Questions answered before the 6-minute limit |
| `video_single_timed_out` / `video_multi_timed_out` | Questions left unanswered when time ran out (counted as wrong) |
| `math_single_list` / `math_multi_list` | Math list used alone / during multitasking (A/B) |
| `math_single_attempted` / `math_multi_attempted` | Math problems answered |
| `math_single_correct` / `math_multi_correct` | Correct answers |
| `math_single_wrong` / `math_multi_wrong` | Wrong answers |
| `math_single_mean_rt_ms` / `math_multi_mean_rt_ms` | Mean time per math problem (ms), correct and wrong together |
| `math_multi_duration_sec` | How long multitasking math actually lasted. Math alone always lasts 300 s. |

Compare math performance as a rate, e.g. correct answers per minute: `math_single_correct / 5` against `math_multi_correct / (math_multi_duration_sec / 60)`.

### Turning the CSV into one row per participant (Python)

```python
import glob, pandas as pd
df = pd.concat(pd.read_csv(f) for f in glob.glob("data/multitask_*.csv"))
wide = (df[df.event_type == "summary"]
        .pivot_table(index=["participant_id", "condition", "math_single_list"],
                     columns="item_id", values="response", aggfunc="first")
        .reset_index())
wide.to_csv("participants_wide.csv", index=False)
```
