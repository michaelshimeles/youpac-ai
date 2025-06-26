import { useState } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { 
  Copy, 
  FileText, 
  ExternalLink, 
  Eye,
  Hash,
  Calendar,
  User,
  Check,
  Download
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from 'dompurify';

interface BlogLink {
  title: string;
  url: string;
}

interface ParsedBlogData {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
  links: BlogLink[];
}

interface BlogPostPreviewProps {
  content: string;
  authorName?: string;
  authorImage?: string;
  publishDate?: string;
}

const COPY_FEEDBACK_TIMEOUT = 2000;

export function BlogPostPreview({
  content,
  authorName = "Your Name",
  authorImage,
  publishDate = new Date().toLocaleDateString()
}: BlogPostPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState<string>("");
  
  // Parse the blog post JSON
  let blogData: ParsedBlogData;
  try {
    blogData = JSON.parse(content);
  } catch (error) {
    blogData = {
      title: "Blog Post Title",
      content: content || "No content generated yet",
      metaDescription: "Meta description will appear here",
      keywords: [],
      links: []
    };
  }

  const { title, content: blogContent, metaDescription, keywords = [], links = [] }: ParsedBlogData = blogData;

  const handleCopy = async (type: 'full' | 'html' | 'markdown') => {
    let textToCopy = '';
    
    switch (type) {
      case 'full':
        textToCopy = `${title}\n\n${metaDescription}\n\n${blogContent}\n\nKeywords: ${keywords.join(', ')}\n\nLinks:\n${links.map((l: BlogLink) => `- ${l.title}: ${l.url}`).join('\n')}`;
        break;
      case 'html':
        textToCopy = `<article>
<h1>${title}</h1>
<meta name="description" content="${metaDescription}">
${blogContent}
</article>`;
        break;
      case 'markdown':
        textToCopy = `# ${title}

> ${metaDescription}

${blogContent.replace(/<h2>/g, '\n## ').replace(/<\/h2>/g, '').replace(/<h3>/g, '\n### ').replace(/<\/h3>/g, '').replace(/<p>/g, '\n').replace(/<\/p>/g, '\n').replace(/<[^>]*>/g, '')}

## Keywords
${keywords.map((k: string) => `- ${k}`).join('\n')}

## Links
${links.map((l: BlogLink) => `- [${l.title}](${l.url})`).join('\n')}`;
        break;
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyType(type);
      setCopied(true);
      toast.success(`${type === 'full' ? 'Blog post' : type.toUpperCase()} copied to clipboard!`);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT);
    } catch (error) {
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleExport = () => {
    try {
      const markdown = `# ${title}

> ${metaDescription}

${blogContent.replace(/<h2>/g, '\n## ').replace(/<\/h2>/g, '').replace(/<h3>/g, '\n### ').replace(/<\/h3>/g, '').replace(/<p>/g, '\n').replace(/<\/p>/g, '\n').replace(/<[^>]*>/g, '')}

## SEO Keywords
${keywords.map((k: string) => `- ${k}`).join('\n')}

## Suggested Links
${links.map((l: BlogLink) => `- [${l.title}](${l.url})`).join('\n')}

---
*Generated with VidCraft AI Blog Generator*`;

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Blog post exported as Markdown!");
    } catch (error) {
      toast.error('Failed to export file. Please try again.');
    }
  };

  const highlightKeywords = (text: string) => {
    if (!keywords.length) return text;
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      // Escape special regex characters to prevent regex injection
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="bg-yellow-100 px-1 rounded">${keyword}</mark>`);
    });
    return highlightedText;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                {authorImage ? (
                  <img src={authorImage} alt={authorName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{authorName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {publishDate}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <FileText className="h-3 w-3 mr-1" />
                Blog Post
              </Badge>
              <Badge variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy('full')}
              className={`gap-2 transition-all ${
                copied && copyType === 'full' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''
              }`}
            >
              {copied && copyType === 'full' ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Full Post
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy('html')}
              className={`gap-2 transition-all ${
                copied && copyType === 'html' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''
              }`}
            >
              {copied && copyType === 'html' ? (
                <>
                  <Check className="h-4 w-4" />
                  HTML Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy HTML
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy('markdown')}
              className={`gap-2 transition-all ${
                copied && copyType === 'markdown' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''
              }`}
            >
              {copied && copyType === 'markdown' ? (
                <>
                  <Check className="h-4 w-4" />
                  Markdown Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Markdown
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/20"
            >
              <Download className="h-4 w-4" />
              Export .md
            </Button>
          </div>
        </div>

        {/* Blog Content */}
        <div className="p-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {title}
          </h1>
          
          {/* Meta Description */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-start">
              <Hash className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-700">Meta Description</p>
                <p className="text-sm text-blue-600 mt-1">{metaDescription}</p>
              </div>
            </div>
          </div>
          
          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">SEO Keywords:</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Blog Content with Keyword Highlighting */}
          <div 
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: highlightKeywords(blogContent)
            }}
          />
          
          {/* Suggested Links */}
          {links.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Suggested Links</h3>
              <div className="space-y-2">
                {links.map((link: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {link.title}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Word count: ~{blogContent.replace(/<[^>]*>/g, '').split(' ').length}</span>
              <span>Reading time: ~{Math.ceil(blogContent.replace(/<[^>]*>/g, '').split(' ').length / 200)} min</span>
            </div>
            <div className="text-xs text-gray-500">
              Generated with VidCraft AI Blog Generator
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// V2: Add keyword suggestion UI for selecting keywords from an API
// V2: Add readability score and SEO optimization suggestions  
// V2: Enable custom styling and theme options
// V2: Add optional video thumbnail support for blog posts from video transcripts
// V2: Add content scoring and custom tone/style preferences