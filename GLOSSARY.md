# artifactory

A single-owner platform where coding agents build study artifacts from a shared design system, and the owner studies with them from any device. It's private, except for the public artifacts the owner chooses to share.

## Language

**Owner**:
The single person who commissions, studies with, and owns every artifact on the platform.
_Avoid_: User, learner, admin

**Agent**:
The coding agent that builds an artifact on the owner's request, working against the design system.
_Avoid_: AI, generator, bot

**Artifact**:
A browser-rendered output an agent builds on request and the platform hosts.
_Avoid_: Page, app, document

**Artifact ID**:
The permanent identifier an artifact keeps for life. It is separate from the URL and never reused, and the artifact's state belongs to it.
_Avoid_: Key, UUID

**Slug**:
The readable name in an artifact's URL, in its main language. It changes only when the owner asks, without affecting the artifact's state, and the old one becomes a former slug.
_Avoid_: ID, path, permalink

**Former slug**:
A slug an artifact used before a rename. It redirects to the current slug for as long as the artifact exists, and it can't be taken by another artifact until then.
_Avoid_: Alias, old URL, redirect

**Main language**:
The language an artifact is written in, either pt-BR or English. Passages in the other language are marked as such.
_Avoid_: Locale

**Published date**:
The day an artifact first appeared in the Library. Publishing a draft moves it to that day.
_Avoid_: Created date, updated date

**Study artifact**:
An artifact built to help the owner learn a topic, usually containing interactive components.
_Avoid_: Study material, lesson

**Design system**:
The shared tokens, components, and rules every artifact is built from, so all artifacts read as one family.
_Avoid_: Component library, UI kit, theme (a theme is light or dark: see theme choice)

**Custom build**:
An interactive part of one artifact that its agent writes for that artifact alone, inside a stage. It never takes answers, so it holds no artifact state. When a second artifact needs the same thing, it becomes a component instead.
_Avoid_: Widget, island, local component

**Stage**:
The design system's container for a custom build. It supplies the look, the controls, the caption and the quality floor, so the custom build only adds behaviour.
_Avoid_: Frame, sandbox, canvas

**Catalog**:
The design system's own site, which shows every component in every state. The design system is developed there, and the catalog is never part of the Library.
_Avoid_: Storybook, showcase, style guide, gallery

**Source material**:
The files (PDFs, slides) the owner hands an agent to build an artifact from; disposable once the artifact exists.
_Avoid_: Inputs, attachments, references

**Subject**:
The one free-form label on each artifact naming what it covers, used to filter the Library. Artifacts on the same topic share its exact spelling.
_Avoid_: Course, category, tag

**Draft**:
An artifact that is built and committed but hidden from the Library. Drafts are listed on the drafts page instead.
_Avoid_: Unpublished, WIP

**Library**:
The home page listing every non-draft artifact, newest published date first, filterable by subject. Each artifact with questions shows the status of its latest attempt, and the page ends with what each latest attempt has to revisit.
_Avoid_: Home, index, dashboard, gallery

**Drafts page**:
The page listing every draft in the same format as the Library, so the owner can reach a draft without the URL an agent sent.
_Avoid_: Draft list, staging

**Public artifact**:
A published artifact the owner has chosen to share. Anyone with its link can read it and answer its questions as a visitor, and it is never listed by search engines. The rest of the platform stays behind the owner's sign-in.
_Avoid_: Shared artifact, open artifact

**Visitor**:
Anyone reading a public artifact on a device without the owner mark. The page can't tell who is reading, only whether this device carries the mark, so the owner, signed in on a device they haven't studied on, also gets the visitor's form until a load or save there leaves the mark, as opening the Library does. A visitor's answers are throwaway state, so they never reach the owner's artifact state.
_Avoid_: Guest, reader, user

**Viewer**:
Who a public artifact's page is shown to on this device, the owner or a visitor, decided from the owner mark before the page first appears. The page holds a form for each, and a private artifact's page has no viewer.
_Avoid_: Role, user type, mode

**Owner mark**:
This device's sign that the owner has studied on it, left by the first successful load or save of an artifact's state or of the Library's statuses. Signing out keeps it, so an expired session gets the sign-in notice rather than the visitor's form. It's never artifact state.
_Avoid_: Login flag, owner cookie, session

**Artifact state**:
The owner's attempts and answers on one artifact, shared across every device. Only artifacts with questions have state.
_Avoid_: Progress data, save data, user data

**Device copy**:
This device's copy of an artifact's state as it last loaded or saved it, answers only. The artifact page starts from it and checks it against the server, which stays the authority. Signing out clears it, and throwaway state never has one. The code calls it kept state (`kept…`).
_Avoid_: Cache, local state, offline copy

**Theme choice**:
This device's choice of the light or dark theme over the one the device shows. It's kept on this device only and forgotten whenever it matches the device, so it always differs from it. It's never artifact state.
_Avoid_: Theme setting, theme preference, dark mode

**Eye**:
The running head's toggle that shows and changes the theme choice: open for light, shut for dark.
_Avoid_: Theme toggle, theme switch, icon

**Statement**:
A definition, theorem, lemma, corollary or example in an artifact, numbered by the page as a clause of its section so it can be cited.
_Avoid_: Block, environment, theorem box

**Claim**:
A statement that is a theorem, lemma or corollary: one a proof can prove. A definition or an example is a statement but not a claim.
_Avoid_: Proposition, assertion

**Citation**:
A mention of one of an artifact's statements in its text, which the page prints as the statement's label and number ("Teorema 2.1") and links to it. An artifact writes one with the `Ref` component, the only place the word "ref" names it.
_Avoid_: Cross-reference, ref

**Example**:
A statement that works a problem in full: the problem, then its solution, shown openly. An example teaches; a question tests.
_Avoid_: Worked problem, exercise, illustration

**Solution**:
The worked answer to an example's problem, shown with it. What an open question reveals after the owner answers is its model answer, not a solution.
_Avoid_: Answer, model answer

**Proof**:
The argument for one of an artifact's claims, written right after it or naming it. It takes no number and ends with a square.
_Avoid_: Demonstration, QED block

**Question**:
A part of an artifact that asks the owner something and takes an answer. Every question is either auto-checked or self-checked.
_Avoid_: Item, exercise, prompt

**Auto-checked question**:
A question whose correct answer the artifact knows, such as multiple choice or a numeric question.
_Avoid_: Objective question, graded question

**Self-checked question**:
An open question where the owner answers, reveals a model answer, and marks their own answer right or wrong.
_Avoid_: Free-response question, essay question

**Answer**:
The owner's response to one question within one attempt, marked right or wrong. It locks once checked.
_Avoid_: Response, submission

**Attempt**:
One pass through an artifact's questions, with at most one answer per question. It exists from its first answer, so starting over and leaving without answering creates nothing. Starting over keeps the earlier attempts.
_Avoid_: Session, run, try

**Latest attempt**:
The attempt whose first answer is most recent. An artifact reopens on it, and the Library reports it.
_Avoid_: Current attempt, active attempt

**Progress**:
How many of an attempt's questions have an answer.
_Avoid_: Completion, status

**Score**:
How many of an attempt's questions were answered right, always calculated from its answers and never stored.
_Avoid_: Grade, result

**Stopping point**:
The question the owner picks up from in an attempt: the first unanswered question after the last one answered, or the first unanswered question if none come after it. It follows the answers, never where the owner has scrolled, and an attempt with every question answered has none.
_Avoid_: Resume point, bookmark, current question

**To revisit**:
The questions an attempt answered and marked wrong, so the owner knows what to study again.
_Avoid_: Mistakes, wrong list, errors

**Throwaway state**:
Artifact state that starts empty on every page load and never reaches the real store. Every place except the deployed platform uses it: local previews, the catalog and impeccable live mode. On the deployed platform, a visitor's page uses it too.
_Avoid_: Mock state, test state, fake data
