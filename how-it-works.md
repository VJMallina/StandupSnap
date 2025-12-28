How It Works

  1. User sets task to AUTO mode in the task form
  2. Dates become read-only and show "Calculated automatically from dependencies"
  3. When creating/updating tasks or dependencies, auto-scheduling runs automatically
  4. Backend calculates dates based on:
    - Predecessor task dates
    - Dependency types (FS, SS, FF, SF)
    - Lag/lead times
    - Task durations
  5. Changes propagate through the dependency chain to all AUTO successors
  6. MANUAL tasks are untouched, maintaining user control when needed
