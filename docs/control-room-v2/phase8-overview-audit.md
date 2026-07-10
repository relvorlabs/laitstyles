# Phase 8C — Overview Responsibility Audit

**Status:** Implemented; executable and visual acceptance pending  
**Purpose:** prevent the Overview from becoming a stack of repeated dashboard cards

## Operating questions

The Overview now answers a fixed sequence of owner questions:

1. What happened today?
2. What needs judgment now?
3. Which customer orders are still in motion?
4. What work was interrupted and should be resumed?
5. Where is fulfilment accumulating?
6. How is revenue moving across days and channels?
7. Which inventory exceptions need action?
8. What changed recently that is not already represented above?

## Module responsibility matrix

| Module | Unique responsibility | Placement decision | Duplicate responsibility removed |
| --- | --- | --- | --- |
| Today strip | Current-day revenue, order volume, units and active holds | Compact strip below the editorial header | Does not explain exceptions or trends |
| Attention queue | Owner judgment ordered by operational risk | Primary left-column work surface | Does not repeat every recent event |
| Open orders preview | Sales still awaiting payment, preparation, packing, dispatch or hand-off | Primary left column below attention | Replaces the need to infer order work from fulfilment counts alone |
| Continue working | One interrupted draft or setup task | Supporting rail on desktop; follows attention on smaller screens | No longer competes as a full-width primary module |
| Fulfilment lane | Stage accumulation across open orders | Supporting rail | Does not duplicate individual order rows |
| Sales pulse | Historical online/offline revenue movement | Main analytical column | Does not repeat the current-day revenue headline |
| Inventory watch | Actionable stock and publication exceptions | Main operational column | Does not become a generic inventory summary |
| Activity stream | Concise changes not already represented as an attention item | Supporting rail after active work modules | Limited to recent context rather than a second priority queue |

## Structure reused from `main`

The legacy Overview on `main` had a clearer operating hierarchy built around:

- a primary queue,
- an open-orders lens,
- and a supporting right rail.

Phase 8 reuses that information architecture only. It does not restore:

- the catch-all route monolith,
- raw colour values,
- obsolete navigation,
- duplicated seed records,
- or the assumption that every product is one-of-one.

## Responsive composition

### Desktop

- left column: attention, open orders, sales trend and inventory exceptions,
- right rail: continue working, fulfilment and recent activity.

### Tablet and mobile

Modules follow decision priority rather than preserving desktop columns:

1. attention,
2. continue working,
3. open orders,
4. fulfilment,
5. sales trend,
6. inventory watch,
7. recent activity.

No desktop table or fixed rail is forced onto mobile.

## Truth boundaries

- All values continue to derive from the shared Control Room state.
- Open-order rows link to the existing connected order detail workspace.
- Product imagery is read from the existing product records.
- No new backend, polling, fake refresh or duplicate Overview dataset was introduced.
