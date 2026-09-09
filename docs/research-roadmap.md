# Research roadmap

Homeostat is a cybernetic cellular system for studying feedback, adaptation,
viability, and emergence under controlled disturbance. It is not intended to
claim that Conway's Game of Life is literally alive. The research question is:

> Under disturbance, which forms of feedback, adaptation, and organization help
> a spatial dynamical system remain viable, and at what cost?

## Scope and vocabulary

The project uses these concepts as distinct, testable layers:

- **Homeostasis:** keep declared essential variables inside acceptable bounds.
- **Ultrastability:** use a slower adaptation loop to change parameters or rules
  when ordinary regulation repeatedly fails.
- **Viability:** remain inside a safe region, even when the system does not
  return to one setpoint.
- **Self-organization:** obtain structure from local interactions without a
  central design.
- **Autopoiesis:** reserve this term for a future model with internally
  produced components, resource flows, operational closure, and boundary
  maintenance.
- **Complex adaptive system:** analyze multi-scale interaction, diversity,
  path-dependence, and emergent regimes.
- **Viable System Model:** use Beer-inspired hierarchy as an architectural
  hypothesis, not as a claim that the automaton is an organization.

The current implementation can support research on feedback-mediated viability
and ultrastability. It should not yet claim cognition, consciousness,
biological equivalence, or strict autopoiesis.

## Operating model: broad platform, narrow evidence

Homeostat has two simultaneous scopes:

- The **application scope** stays broad. It can expose homeostasis,
  ultrastability, viability, distributed control, autopoiesis, and complex
  adaptive behavior as an evolving research platform.
- The **study scope** stays narrow. Each experiment activates a defined subset
  of mechanisms, locks the rest, and changes one causal factor at a time.

Every capability should be labeled as one of:

1. **Implemented mechanism** — behavior currently present in the simulation.
2. **Current experimental target** — the mechanism being tested now.
3. **Future research hypothesis** — a capability requiring new state or
   observables before it can be evaluated.
4. **Conceptual inspiration** — theory that guides design but is not evidence.

The governing rule is **broad in architecture, narrow in evidence**. Exploratory
play can remain open-ended, but a controlled study must record its condition,
seed, disturbance, viable region, generation limit, and metrics.

### First paper-sized study

The initial controlled comparison should use one canonical cellular model and
one disturbance family:

| Condition | Fixed rules | Feedback | Slow adaptation |
|---|---:|---:|---:|
| Baseline | yes | no | no |
| Homeostatic | yes | yes | no |
| Ultrastable | adaptive | yes | yes |

Hold grid dimensions, initial patterns, random seeds, boundaries, update order,
disturbance schedule, generation limit, and measurement interval constant.
Predeclare the viable region `K` and report distributions across runs rather
than selecting the most compelling trajectory.

### UX guidance

The interface should support exploration without presenting exploration as a
controlled experiment:

- The normal controls remain available for discovery and play.
- The Run surface should identify the current study question and explain the
  three-condition comparison.
- World controls should make clear that they define the disturbance or
  environment; changing them does not redefine the loop configuration.
- Loop controls should make clear which controller mechanism is being changed
  and that changes affect the current world immediately.
- Metrics should be described as observations, not proof of life, cognition, or
  autopoiesis.
- A future Research mode can lock seeds, name conditions, repeat runs, export
  metadata, and replay a disturbance schedule without removing the exploratory
  mode.

## Formal model

Represent a run as:

```text
x(t+1) = F(x(t), u(t), theta(t), w(t))
z(t)   = g(x(t))
```

Where `x` is the cellular, heat, and energy state; `u` is controller action;
`theta` is the rule or parameter state; `w` is environmental disturbance; and
`z` contains measured essential variables.

Define a viable region:

```text
K = { x : z_i_min <= z_i(x) <= z_i_max for every essential variable i }
```

The primary outcome is not maximum population. It is the ability to remain in,
or recover to, `K` under a declared disturbance schedule.

## Research sequence

### 1. Validation and baseline

- Verify deterministic replay, seeded runs, and known B3/S23 behavior.
- Establish fixed-rule, no-environment Conway Life as the baseline.
- Keep grid size, update mode, boundary conditions, and random-seed budgets
  explicit in every comparison.

### 2. Homeostatic regulation

Compare fixed rules, environmental dynamics without control, and the current
feedback loops. Test whether feedback improves time in the viable region and
recovery after disturbance.

### 3. Ultrastability

Measure whether a slower adaptation mechanism expands the viable region under
nonstationary environments. Record rule changes, failed trials, transient
mortality, and stable-episode duration.

### 4. Setpoint control versus viability

Compare controllers that minimize error from a target density with controllers
that only maintain safe intervals. This tests the difference between
homeostasis and viability: a system can drift while remaining functional.

### 5. Hierarchy and autonomy

Compare centralized, local, and coordinated controllers. Measure autonomy,
communication or coordination delay, intervention rate, bandwidth, and the
performance cost of removing each organizational layer.

### 6. Autopoietic extension

Only after the control experiments are characterized, add explicit components,
resource production, boundary formation, and boundary repair. Persistence of a
pattern alone is not evidence of autopoiesis.

### 7. Complex adaptive behavior

Analyze cluster lifetimes, spatial correlation, policy diversity, damage
spreading, path dependence, basin structure, and transitions between emergent
regimes. Do not infer criticality from a single power law or spectrum.

## Experimental conditions

At minimum, compare:

1. Fixed B3/S23 with no controller.
2. Environmental dynamics without adaptive control.
3. Feedback homeostasis.
4. Fast feedback plus slower ultrastable adaptation.
5. Distributed or hierarchical control.
6. A future production-and-boundary model for autopoiesis.

Use pulse, sustained, random, spatially correlated, resource-depletion, and
rule/environment-shift disturbances. Use identical schedules across controller
conditions, multiple seeds, at least two grid sizes, and ablations for each
major loop. Report distributions and uncertainty, not only the best run.

## Measurements

### Regulation and resilience

- Fraction of generations inside `K`.
- Cumulative distance outside `K`.
- Variance, mean absolute deviation, overshoot, and settling time.
- Recovery time and recovery probability after disturbance.
- Extinction probability and mean time to extinction.
- Controller intervention count and magnitude.
- Number and cost of parameter or rule adaptations.

### Organization and emergence

- Local autonomy versus global intervention rate.
- Coordination delay and communication bandwidth.
- Cluster size and lifetime distributions.
- Spatial correlation length.
- Diversity of local states or policies.
- Damage-spreading rate from paired trajectories.
- Basin size, path dependence, and update-order sensitivity.

A composite resilience score may be useful, but its weights must be declared
before analysis:

```text
resilience = viability time
           - control-cost weight * control effort
           - adaptation-cost weight * adaptation cost
```

## Hypotheses

- Feedback increases viability and recovery, but strong regulation can reduce
  diversity and exploration.
- Ultrastability is most valuable under changing rather than stationary
  disturbances.
- Viability-based control tolerates more useful drift than strict setpoint
  control.
- Distributed regulation may be more robust to localized damage than a single
  global controller, at the cost of coordination delay.
- New macro-level regimes should be explained by measured mechanisms rather
  than labeled as “life” or “intelligence.”

## Reference foundation

- W. Ross Ashby, *An Introduction to Cybernetics* (1956):  
  https://archive.org/details/introductiontocy00ashb
- W. Ross Ashby, *Design for a Brain* (1960):  
  https://archive.org/details/designforbrain00ashb
- W. Ross Ashby, “Principles of the Self-Organizing Dynamic System” (1947):  
  https://doi.org/10.1080/00221309.1947.9918144
- Stafford Beer, “The Viable System Model” (1984):  
  https://doi.org/10.1057/jors.1984.2
- Francisco Varela, “Autopoiesis” (1974):  
  https://doi.org/10.1016/0303-2647(74)90031-8
- Maturana and Varela, *Autopoiesis and Cognition* (1980):  
  https://doi.org/10.1007/978-94-009-8947-4
- Aubin, Bayen, and Saint-Pierre, *Viability Theory* (2011):  
  https://doi.org/10.1007/978-3-642-16684-6
- Åström and Murray, *Feedback Systems*:  
  https://fbsbook.org/
- John Holland, “Complex Adaptive Systems” (1992):  
  https://www.jstor.org/stable/20025416
