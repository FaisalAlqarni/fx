# Animated SVG recipe

For a small flow where motion shows order: a token that travels along the arrows
step by step. Build it on the static recipe's boxes and arrows, then add a few lines
of script. For anything with more than about eight nodes or several levels, use the
map or archify instead.

## Rules

- Draw the diagram as in the static recipe. Give each arrow a `<path>` with an `id`.
- Steps live in an array: each step names the arrow ids to light, a caption, and a
  wait in milliseconds. The caption is real text under the figure, so the flow reads
  without motion.
- A moving token is a `<circle r="7" fill="var(--alert)">`. Move it along an arrow with
  `path.getPointAtLength(length * progress)` inside `requestAnimationFrame`, 1100 ms
  per step.
- Controls are real buttons: Play or Pause, Back, Next, Reset. Pause when the figure
  scrolls out of view.
- Respect `prefers-reduced-motion`: with it set, jump the token to the end of each
  arrow and do not auto-play. Step with Next and Back only.
- Light the active arrow with a class (`.on`) that changes stroke colour and width,
  never colour alone, so the active step is visible without colour.
- Colours come from the page tokens, as in the static recipe. Labels are English.

## Skeleton of the script

```html
<script>
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var steps = [{ arrows: ["a1"], caption: "The API receives the order." }];
  var i = -1, caption = document.getElementById("cap");
  function show(k) {
    i = (k + steps.length) % steps.length;
    document.querySelectorAll(".on").forEach(function (e) { e.classList.remove("on"); });
    steps[i].arrows.forEach(function (id) { document.getElementById(id).classList.add("on"); });
    caption.textContent = steps[i].caption;
  }
  document.getElementById("next").onclick = function () { show(i + 1); };
  document.getElementById("back").onclick = function () { show(i - 1); };
})();
</script>
```
