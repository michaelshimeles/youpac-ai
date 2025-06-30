// app/lib/sample-project.ts
export const sampleNodes = [
  { id: 'source-sample', type: 'source', position: { x: 100, y: 200 }, data: { content: 'Sample AI Topic: How AI can 10x your productivity...', sourceType: 'topic' } },
  { id: 'agent-title-sample', type: 'agent', position: { x: 450, y: 100 }, data: { type: 'title', draft: 'AI Productivity Hacks (2025)', status: 'ready' } },
  { id: 'agent-blog-sample', type: 'blog', position: { x: 450, y: 300 }, data: { type: 'blog', draft: '{"title":"10x Your Productivity with AI", "content":"..."}', status: 'ready' } },
];
export const sampleEdges = [
  { id: 'e-source-title', source: 'source-sample', target: 'agent-title-sample', animated: true },
  { id: 'e-source-blog', source: 'source-sample', target: 'agent-blog-sample', animated: true },
];
