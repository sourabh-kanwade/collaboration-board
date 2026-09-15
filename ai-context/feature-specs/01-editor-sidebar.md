We need the base chrome component that frame every editor screen- top tool bar and left sidebar shell . These will be reused and extended in every chapter that follows.

### Project Sidebar

Create `components/editor/project-sidebar.tsx`

Requirements:

- sidebar should float above the editor canvas
- opening should not push page content
- sidebar will options like
  - open
  - save to
  - export image
  - live collaboration
  - reset canvas
  - theme toggler
  - canvas background selector

### Check when done

- new components compile without typescript errors
- no lint errors
- sidebar is ready to use
- theme toggle correctly
- canvas background changes correctly
