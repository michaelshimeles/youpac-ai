import React, { useRef } from "react";
import { FileText, Image, Twitter } from "lucide-react";
import { Card } from "~/components/ui/card";

interface MentionOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const mentionOptions: MentionOption[] = [
  {
    value: "TITLE_AGENT",
    label: "Title Agent",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    value: "DESCRIPTION_AGENT",
    label: "Description Agent",
    icon: FileText,
    color: "text-green-500",
  },
  {
    value: "THUMBNAIL_AGENT",
    label: "Thumbnail Agent",
    icon: Image,
    color: "text-purple-500",
  },
  {
    value: "TWEETS_AGENT",
    label: "Tweets Agent",
    icon: Twitter,
    color: "text-sky-500",
  },
];

interface MentionAutocompleteProps {
  isOpen: boolean;
  searchTerm: string;
  onSelect: (value: string) => void;
  selectedIndex?: number;
}

export function MentionAutocomplete({ 
  isOpen, 
  searchTerm, 
  onSelect,
  selectedIndex = 0
}: MentionAutocompleteProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  if (!isOpen) return null;
  
  const filteredOptions = mentionOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div 
      ref={dropdownRef}
      className="absolute bottom-full mb-2 left-0 right-0 z-[60]"
    >
      <Card className="p-1 shadow-lg bg-background border">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No agents found
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Available Agents
            </div>
            {filteredOptions.map((option, index) => {
              const Icon = option.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm transition-colors ${
                    isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${option.color}`} />
                  <span className="text-sm">{option.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    @{option.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}