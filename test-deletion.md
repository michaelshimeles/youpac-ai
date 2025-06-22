# Node Deletion Test Checklist

## Implementation Summary
✅ Added `onNodesDelete` handler to Canvas component
✅ Added delete mutations (deleteVideo, deleteAgent) 
✅ Connected deletion handler to ReactFlow component
✅ Added delete key codes (Backspace, Delete)
✅ Added confirmation dialog for important nodes
✅ Handle cleanup of related nodes (video info nodes)

## Test Cases

### 1. Video Node Deletion
- [ ] Select a video node
- [ ] Press Delete or Backspace key
- [ ] Confirm deletion dialog appears
- [ ] On confirm: Video is deleted from canvas and database
- [ ] Associated video info node is also removed
- [ ] Associated agents are deleted (backend handles this)

### 2. Agent Node Deletion  
- [ ] Select an agent node with content
- [ ] Press Delete or Backspace key
- [ ] Confirm deletion dialog appears
- [ ] On confirm: Agent is deleted from canvas and database

### 3. Video Info Node Deletion
- [ ] Select a video info node
- [ ] Press Delete or Backspace key
- [ ] Node is removed without confirmation (no database operation)

### 4. Multiple Node Deletion
- [ ] Select multiple nodes (Cmd/Ctrl + click)
- [ ] Press Delete or Backspace key
- [ ] Appropriate confirmation message appears
- [ ] All selected nodes are deleted

### 5. Error Handling
- [ ] If deletion fails, error toast appears
- [ ] Node is restored to canvas if database deletion fails

## Debugging Steps
1. Open browser console
2. Try deleting a node
3. Check for "Deleting nodes:" log message
4. Check for any error messages
5. Verify database mutations are called

## Known Issues to Fix
- If React Flow's built-in deletion is being overridden, may need to adjust implementation
- Ensure keyboard events are properly captured