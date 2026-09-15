### Project Toolbar

Create `components/editor/project-toolbar.tsx`

Requirements:

- toolbar should float above the editor canvass
- opening should not push page content
- side bar have tools like
  - hand for panning or moving canvas
  - mouse for selection
  - rectangle to draw rectangle shape
  - Diamond to draw diamond shape
  - circle to draw circle shape
  - arrow to draw arrow
  - line to draw line
  - pencil to for free hand drawing
  - Text for text input
  - eraser for remove drawn shapes
- each tool should have corresponding tool tip
- each tool should perform it's action on canvas
- state must be auto saved to database when drawing is done
- install prisma and use postgres database to save state

### Check when done

- new components compile without typescript errors
- no lint errors
- toolbar must be ready to use
- all tools on toolbar should work correctly
