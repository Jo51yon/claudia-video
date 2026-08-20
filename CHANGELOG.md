# Changelog

Semantic versioning: MAJOR = a prop, exported type, or default behaviour changed in a way that
could break an existing consumer without any code change on their side. MINOR = additive only.
Consuming projects should pin to a tag (`#v1.0.0`), never `#main`.

## v1.0.0 — 2026-08-20

First release. `ClaudiaVideoNavigator` -- checked two real, independent implementations
(Claudia's own dashboard, PETGI's) before building anything, and found they solve genuinely
different problems, not the same one via different code: PETGI's has search, a "recommended
for this screen" boost-key section, a card-grid layout and modal presentation; Claudia's is a
simple sidebar-plus-player split view with none of that.

Per the unification principle, the shared model grew config axes (`presentation`,
`searchable`, `boostKeys`) to fit both real outcomes, rather than picking one shape and asking
either project to lose real functionality. `fetchVideos`/`resolveVideoUrl` are dependency
injected because the two real backends are genuinely different tables and different
URL-resolution mechanisms -- this component never assumes a schema.

**Known consumers at this tag:** none yet at release.
