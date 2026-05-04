Revise `docs/slideshow/deck_spec.md` using `docs/slideshow/deck_brief.md` as the source of truth for structure, constraints, and narrative.

Requirements:

* Follow the slide order defined in deck_brief.md
* Improve each slide’s:

    * title
    * key_message
    * on_slide_text
    * visuals
    * issues
* Keep the existing slide schema exactly the same
* Rewrite all slides, not just a subset
* Remove redundancy across feature slides
* Strengthen narrative flow between slides
* Do not invent features or capabilities not supported by the project

Output:

* Edit `deck_spec.md` directly
* Keep formatting consistent across all slides


Visuals:

* Do NOT generate images or attempt to create assets
* Only describe suggested visuals in text
* Be specific about what the visual should show and why it helps the slide
* If an image is missing, suggest a concrete visual (e.g., “dashboard showing case counts by attorney” instead of “add chart”)
* If an existing visual is described, improve or refine the description rather than replacing it arbitrarily

Sources of Truth:

* Use `docs/` as the primary source for:

  * system design
  * architecture
  * feature behavior
  * terminology

* Use `config/` only when needed to:

  * verify role definitions (e.g., CDD, LOP, Trial Supervisor)
  * confirm naming of lists, content types, or permissions

* Do NOT surface low-level implementation details (e.g., environment variables, internal config structure) unless they directly support a slide’s explanation

* Prefer high-level explanations suitable for a presentation over code-level detail
