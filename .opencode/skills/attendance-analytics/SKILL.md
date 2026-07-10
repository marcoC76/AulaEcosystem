---
name: attendance-analytics
description: Transforms JSON-based student attendance data (student, group, date, present) into interactive Chart.js visualizations and statistical summaries for plain HTML/CSS/JS web apps. Use to graph absence trends, compare attendance across groups, and detect at-risk students due to recurring absences. Trigger keywords: attendance chart, absence trends, attendance dashboard, at-risk students, Chart.js attendance.
license: MIT
compatibility: opencode
metadata:
  domain: education-analytics
  level: intermediate
---

# Attendance Analytics

Generates statistical summaries and Chart.js visualizations from JSON attendance datasets, and flags students at risk of failing due to recurring absences.

## When to Use

- The user has a JSON file with attendance records (student, group, date, present/absent) and wants charts or stats.
- Trigger phrases: "Use the attendance-analytics skill to graficar las faltas de [grupo]", "Use the attendance-analytics skill to detectar alumnos en riesgo de reprobar por inasistencias", "Use the attendance-analytics skill to generar un dashboard de asistencias en JS".
- The user wants to compare attendance trends between multiple groups (e.g., Digital Culture 1 vs 2).
- The user wants to identify students with recurring absence patterns for early intervention.
- The target output is a plain HTML/CSS/JS project using Chart.js.

## When NOT to Use

- The user wants charts in Python, Plotly, matplotlib, or any non-JS charting library.
- The request involves grades, exams, rubrics, or curriculum content generation (different skill).
- The request involves sending automated notifications or alerts (email, WhatsApp, etc.).
- The dataset is not attendance-related (e.g., inventory, sales, game analytics).
- The task involves Godot, GDScript, or game development logic.

## Workflow

### Step 1 — Understand the Task
Identify whether the request is: (a) visualization only, (b) statistical summary only, (c) at-risk detection, or (d) a combination. Confirm the scope (single group, multiple groups, date range) if ambiguous.

### Step 2 — Gather Inputs
Request or locate the JSON attendance file. Confirm it follows the schema:
```json
[{ "alumno": "string", "grupo": "string", "fecha": "YYYY-MM-DD", "presente": true }]
```
If the schema differs, ask the user to confirm field names before proceeding. Confirm the target HTML/CSS/JS project structure (existing project vs. new file).

### Step 3 — Core Actions
- **Parse & aggregate**: Group records by `grupo`, `alumno`, and time period (week/month) to compute attendance rate = present days / total days.
- **Generate Chart.js visualizations**:
  - Line chart: attendance rate over time per group.
  - Bar chart: absence count per student within a group.
  - Stacked bar or heatmap-style grid: group comparison across weeks.
- **Risk detection logic**: Flag a student as "at risk" if absences exceed a configurable threshold (default: 3 consecutive absences OR attendance rate below 80% in the period). Output a sorted list of at-risk students with their absence count and rate.
- **Descriptive statistics**: Compute mean/median attendance rate, top 5 most absent students, and group-level totals.
- Use vanilla JavaScript + Chart.js CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`) unless the project already has a bundler; do not introduce Python or backend dependencies.

### Step 4 — Review & Refinement
Validate that chart data arrays match label arrays in length. Check edge cases: students with zero records, groups with incomplete date ranges, duplicate entries. Confirm risk thresholds match the user's expectations before finalizing.

### Step 5 — Output Format
Deliver:
- A JS file (e.g., `attendanceCharts.js`) with functions to render each chart type, ready to drop into the project.
- An HTML snippet showing `<canvas>` elements and script inclusion.
- A short markdown table listing at-risk students (name, group, absences, attendance rate).
- Brief inline comments explaining data transformation steps (no verbose explanations).

## Guidelines

- Never hardcode student names or thresholds inside chart-rendering functions; keep them as configurable parameters.
- Validate JSON structure before processing; fail gracefully with a clear error message if fields are missing.
- Keep chart color palettes accessible (avoid red/green-only distinctions for risk status; use labels too).
- Do not write attendance data back to disk unless explicitly requested — this skill visualizes, it does not persist edits.
- If the JSON file is large (>10k records), suggest pre-aggregating server-side (Apps Script) before rendering client-side.

## Example Trigger Phrases

- "Use the attendance-analytics skill to graficar las faltas del grupo 3B de este mes."
- "Use the attendance-analytics skill to detectar alumnos en riesgo de reprobar por inasistencias."
- "Use the attendance-analytics skill to generar un dashboard de asistencias en JS para mi proyecto."
- "Use the attendance-analytics skill to comparar la asistencia entre Digital Culture 1 y 2."
- "Use the attendance-analytics skill to mostrar los 5 alumnos con más faltas del semestre."
