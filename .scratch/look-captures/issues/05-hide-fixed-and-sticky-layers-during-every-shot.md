# 05: Hide fixed and sticky layers during every shot

Status: ready-for-agent
Blocked by: 01 (Shoot every look item through one path)

Spec: [What `pnpm look` captures](../spec.md) › The item alone

**What to build:** every element shot shows the item alone, so an agent never sees the bottom bar over an item. The bar showing up is look's own timing artifact, not a page bug, and agents shouldn't reorder content to avoid it. For the length of each element shot, look hides every layer outside the item whose computed `position` is `fixed` or `sticky`, then restores each one as it was. Today those layers are the bottom bar, the state notice band and the rail. Look finds them by computed style, not by class name, so a fixed layer added later can't get back into the shots. Look doesn't check for overlaps.

Hiding must not change the page's layout. A sticky layer takes room in the flow, so removing it would move the item between measuring and shooting, and break look's scroll restore. Whichever hiding look uses must leave the item where it was.

- [ ] Every element shot, the Stage's as-written and refused shots included, hides every fixed or sticky layer outside the item, found by computed style, and nothing inside the item.
- [ ] Each hidden layer is restored afterwards, and `results.json` holds, for each shot, the layers look hid and an assertion that each was restored as it was.
- [ ] The page's layout and scroll position are the same during the shot as before it.
- [ ] Seam 1 test, a new opt-in Look fixture: at 393 px the fixture slides the bar in before the shots (owner input, then a scroll up), and has a Stepper whose bottom sits under the bar. The test checks that every shot of that Stepper hid the bar and that the bar was shown again afterwards. It asserts the exit code (0) and `results.json`.
- [ ] In the same commit, the `artifact` skill's **Look** section says each shot is the item alone, with the bar and the notices hidden, and that a bar in a shot is a look bug to report, not something to fix in the artifact.
