# Design constraints

## Product context
Internal cockpit for an insurance agent during a live outbound cold
call. The agent is talking on the phone and reads the screen in
glances of under one second. Information density and fast scanning
beat whitespace and polish every time. LeadDetail is 90% of the value.

## Aesthetic direction
Operational cockpit. Reference points: Bloomberg terminal, flight
tracker, trading desk. Not a SaaS dashboard, not a landing page.
Tabular layout. Monospace for numbers, IDs, timestamps. Rules and
dividers instead of cards. Color is status only, never decoration.

## Tokens
All visual values come from the CSS custom properties in styles.css.
You may add tokens. You may not redefine existing ones.
Never hardcode hex values, px sizes, or font sizes.
No inline styles.
One border radius in the entire app.
Spacing only from the scale.

## Forbidden
Gradients. Glassmorphism. Emoji as icons. Box-shadow as decoration.
Centered content. Pill-shaped buttons. Violet or indigo. Cards with
background fills. Animation that does not signal data state.
Placeholder text where real content exists.

## States to design against
Design against the densest state first: three minutes into a call,
twelve extracted facts, four unverified, two conflicting, plus a
priced recommendation list. Empty and loading states come after,
and must not drive the layout.
