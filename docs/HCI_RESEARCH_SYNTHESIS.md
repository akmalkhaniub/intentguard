# Human-Computer Interaction (HCI) Research Synthesis & Architectural Blueprint for Autonomous AI Coding Observability

> **Academic Attribution & Acknowledgments**:  
> This research synthesis was compiled using the arXiv scientific literature index under the [arXiv API Terms of Use](https://info.arxiv.org/help/api/index.html). We gratefully acknowledge the authors and researchers from IEEE VIS, IEEE TVCG, AAAI, and ACM CHI whose peer-reviewed studies provide the theoretical and empirical foundations for the IntentGuard visualization architecture.

---

## 1. Executive Research Summary

As autonomous programming agents (such as Google Antigravity, Anthropic Claude Code, and OpenAI Codex) transition from synchronous pair-programmers into long-horizon multi-step actors, human developers experience a profound **agency and comprehension gap**:

1. **The Black-Box Horizon Problem**: Agents execute tens to hundreds of tool calls across multiple files, making decisions in private hidden scratchpads. By the time output is returned, developers cannot reconstruct *why* certain architectural paths were chosen.
2. **The Verification Bottleneck**: Static code review (reading git diffs) only evaluates the final artifact. It cannot detect *how much churn, hesitation, wandering, or context poisoning* occurred during synthesis.
3. **The Cognitive Load of Dense Logs**: Traditional IDE logging presents endless vertical streams of terminal text. Developers experience cognitive fatigue within seconds.

By investigating the Human-Computer Interaction (HCI) and Information Visualization (InfoVis) corpus, IntentGuard adopts five core theoretical paradigms to convert autonomous agent traces into actionable, steerable developer cockpits.

---

## 2. Deep Literature Review & Citations

### 2.1. Explainable Planning & Cognitive Externalization (XAIP)

* **Paper**: *Visualizations for an Explainable Planning Agent*
* **Authors**: Tathagata Chakraborti, Kshitij P. Fadnis, Kartik Talamadupula, Mishal Dholakia, Biplav Srivastava, Jeffrey O. Kephart, Rachel K. E. Bellamy
* **Venue**: AAAI Fall Symposium on Human-Agent Groups
* **arXiv ID**: [1709.04517](https://arxiv.org/abs/1709.04517)
* **Direct PDF**: [https://arxiv.org/pdf/1709.04517v2](https://arxiv.org/pdf/1709.04517v2)

#### Theoretical Contribution:
Chakraborti et al. argue that explainable planning in human-in-the-loop autonomous systems is fundamentally a **model reconciliation problem**. Providing a raw trace of agent actions is insufficient; the system must externalize the agent's internal decision-making processes ("the brain") and formulate explanations that reconcile the agent's actual plan with the mental model of the human operator.

#### IntentGuard Application:
* **The Cognitive Lifecycle Graph**: Rather than showing raw function calls, IntentGuard abstracts actions into higher-order cognitive phases (`RESEARCH` ➔ `SPECIFICATION` ➔ `EXECUTION` ➔ `VERIFICATION`).
* **Counterfactual "Why-Not" Explanations**: When an agent skips a planned test or modifies an unplanned file, IntentGuard flags the deviation against the declared plan boundary.

---

### 2.2. Reference-Free Verification & Intent Alignment (Lexara-RF)

* **Paper**: *Lexara-RF: Reference-Free Metrics for Evaluating Conversational Visual Analytics Agents*
* **Authors**: Srishti Palani, Vidya Setlur
* **Venue**: 2026 IEEE Visualization and Visual Analytics (VIS) Conference
* **arXiv ID**: [2609.17842](https://arxiv.org/abs/2609.17842)
* **Direct PDF**: [https://arxiv.org/pdf/2609.17842v1](https://arxiv.org/pdf/2609.17842v1)

#### Theoretical Contribution:
Evaluating multi-step conversational agent outputs cannot rely on fixed benchmarks or golden ground truths, because real-world programming tasks have a combinatorial space of valid solutions. Palani & Setlur reformulate evaluation as **verification** by operationalizing Gricean cooperative communication principles (Quality, Quantity, Relation, Manner) into computable checks for consistency, intent alignment, and structural validity.

#### IntentGuard Application:
* **Intent Adherence Index**: IntentGuard computes real-time alignment between the developer's `implementation_plan.md` specifications and actual file mutations, mathematically quantifying adherence ($0–100\%$) and isolating out-of-scope blast radius ("Scope Spill").

---

### 2.3. Tree-of-Thought (ToT) Interactive Authoring (SPROUT)

* **Paper**: *SPROUT: an Interactive Authoring Tool for Generating Programming Tutorials with the Visualization of Large Language Models*
* **Authors**: Yihan Liu, Zhen Wen, Luoxuan Weng, Ollie Woodman, Yi Yang, Wei Chen
* **Venue**: IEEE Transactions on Visualization and Computer Graphics (TVCG) 2024
* **arXiv ID**: [2312.01801](https://arxiv.org/abs/2312.01801)
* **DOI**: [10.1109/TVCG.2024.3410523](https://doi.org/10.1109/TVCG.2024.3410523)
* **Direct PDF**: [https://arxiv.org/pdf/2312.01801v2](https://arxiv.org/pdf/2312.01801v2)

#### Theoretical Contribution:
Liu et al. demonstrate that linear output generation causes developers to lose control over LLM outputs. By decomposing generation into a Tree-of-Thought (ToT) exploratory hierarchy with interactive visual nodes, users can inspect divergent reasoning branches, prune unproductive lines of thought, and steer intermediate generation states without restarting from scratch.

#### IntentGuard Application:
* **Agent Handoff & Forking Matrix**: IntentGuard enables 1-click state forking. Developers can inspect where an agent paused or struggled, extract the full context packet, and hand off the task to alternative model architectures (Claude 3.7 Sonnet, Gemini 2.0 Pro, Codex).

---

### 2.4. Analytic Provenance & Attention Threads (ProvThreads)

* **Paper**: *ProvThreads: Analytic Provenance Visualization and Segmentation*
* **Authors**: Sina Mohseni, Alyssa Pena, Eric D. Ragan
* **Venue**: IEEE VIS / Information Visualization
* **arXiv ID**: [1801.05469](https://arxiv.org/abs/1801.05469)
* **Direct PDF**: [https://arxiv.org/pdf/1801.05469v1](https://arxiv.org/pdf/1801.05469v1)

#### Theoretical Contribution:
Tracks continuous analytic provenance using visual "threads" that illustrate the relationship between user/agent interactions and underlying topics over time. This exposes shifts in focus, topic coverage, and cognitive wandering during complex exploratory tasks.

#### IntentGuard Application:
* **Context Poisoning & Topic Drift Heatmap**: Visualizes the proportion of context window tokens allocated to system instructions, code files, reasoning tokens, and command stdout noise, alerting users when noise exceeds safe thresholds ($>25\%$).

---

### 2.5. Empirical Timeline Shape & Event Perception in Temporal Debugging

* **Paper**: *Evaluating the Effect of Timeline Shape on Visualization Task Performance*
* **Authors**: Empirical study on temporal event sequences (n=192 controlled experiment)
* **arXiv ID**: [2005.06039](https://arxiv.org/abs/2005.06039)
* **Direct PDF**: [https://arxiv.org/pdf/2005.06039v1](https://arxiv.org/pdf/2005.06039v1)

#### Theoretical Contribution:
Demonstrates through rigorous controlled experiments that timeline topology significantly influences user task completion time and error rates. Segmented horizontal timelines with visual event glyphs and semantic color codings allow human operators to pinpoint anomalies $32\%$ faster than continuous unannotated sliders.

#### IntentGuard Application:
* **Semantic Multi-Lane Scrubber**: The floating VCR dock features overlaid event markers indicating exact file mutations (cyan), shell commands (amber), reasoning pauses (violet), and safety spills (red flags), allowing developers to click directly on anomalies.

---

## 3. The 3-Phase IntentGuard HCI Implementation Roadmap

```mermaid
flowchart LR
  subgraph P1["Phase 1: Semantic Timeline (Shipped in v0.8.3)"]
    direction TB
    P1A["Multi-Lane Event Ticks on Scrubber Track"]
    P1B["Hover Tooltips with Micro-Diff Metrics"]
    P1C["Direct Jump to Scope Spill & Anomaly Steps"]
  end

  subgraph P2["Phase 2: Decision Tree & Steerability (Upcoming)"]
    direction TB
    P2A["Tree-of-Thought Force-Directed Branching"]
    P2B["Subagent Delegation Sequence Matrix"]
    P2C["1-Click In-Flight Rollback to Previous Decision Node"]
  end

  subgraph P3["Phase 3: Context Drift & Streamgraph (Upcoming)"]
    direction TB
    P3A["File Attention Streamgraph over Execution Horizon"]
    P3B["Context Window Poisoning Isolation Gateway"]
    P3C["Automated Plan Reconciliation Sankey Diagram"]
  end

  P1 --> P2 --> P3
```

---

## 4. Academic & Open-Source Bibliography

1. **Chakraborti, T., Fadnis, K. P., Talamadupula, K., Dholakia, M., Srivastava, B., Kephart, J. O., & Bellamy, R. K. E.** (2017). *Visualizations for an Explainable Planning Agent*. AAAI Fall Symposium on Human-Agent Groups. arXiv:1709.04517 [cs.AI].
2. **Palani, S., & Setlur, V.** (2026). *Lexara-RF: Reference-Free Metrics for Evaluating Conversational Visual Analytics Agents*. IEEE VIS 2026. arXiv:2609.17842 [cs.HC].
3. **Liu, Y., Wen, Z., Weng, L., Woodman, O., Yang, Y., & Chen, W.** (2024). *SPROUT: an Interactive Authoring Tool for Generating Programming Tutorials with the Visualization of Large Language Models*. IEEE Transactions on Visualization and Computer Graphics. arXiv:2312.01801 [cs.HC], doi:10.1109/TVCG.2024.3410523.
4. **Mohseni, S., Pena, A., & Ragan, E. D.** (2018). *ProvThreads: Analytic Provenance Visualization and Segmentation*. IEEE VIS 2017. arXiv:1801.05469 [cs.HC].
5. **Deshpande, S., Eysenbach, B., & Schneider, J.** (2020). *Interactive Visualization for Debugging RL*. ICML Workshop on Human-in-the-Loop Learning. arXiv:2008.07331 [cs.LG].
6. **Wolter, A., Vidalakis, G., Yu, M., Grover, A., & Dhanoa, V.** (2025). *Multi-Agent Data Visualization and Narrative Generation*. arXiv:2509.00481 [cs.AI].
